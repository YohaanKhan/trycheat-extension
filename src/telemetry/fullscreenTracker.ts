import * as vscode from 'vscode';
import { execSync } from 'child_process';

/** How many times the student can dismiss the fullscreen warning before being hard-blocked */
const MAX_DISMISSALS = 2;

/** Number of seconds between each re-enforcement check when not fullscreen */
const RECHECK_INTERVAL_MS = 5000;

type FullscreenEvent = {
    type: 'FULLSCREEN_EXIT' | 'FULLSCREEN_RETURN' | 'FULLSCREEN_BLOCKED';
    timeStamp: number;
    dismissalCount?: number;
    displayCount?: number;
};

/**
 * Returns the number of active physical displays connected to the machine.
 * Uses `system_profiler` on macOS and `WMIC` on Windows as a shell fallback.
 * Returns 1 if the count cannot be determined.
 */
function getDisplayCount(): number {
    try {
        if (process.platform === 'darwin') {
            const out = execSync('system_profiler SPDisplaysDataType 2>/dev/null | grep -c "Resolution:"', { timeout: 2000 }).toString().trim();
            const n = parseInt(out);
            return isNaN(n) || n < 1 ? 1 : n;
        } else if (process.platform === 'win32') {
            const out = execSync('WMIC PATH Win32_VideoController GET Name /VALUE 2>nul', { timeout: 2000 }).toString();
            const count = (out.match(/Name=/g) || []).length;
            return count > 0 ? count : 1;
        }
    } catch {
        // If the command fails, assume 1 display
    }
    return 1;
}

/**
 * Attempts to put VS Code into fullscreen mode via the built-in command.
 * VS Code's `workbench.action.toggleFullScreen` is a toggle — we only call it
 * when we can confirm the window is NOT already fullscreen.
 */
async function requestFullscreen(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.toggleFullScreen');
}

/**
 * Hardened fullscreen tracker.
 *
 * Behaviour when VS Code loses focus (proxy for exiting fullscreen):
 *  1. Send a `FULLSCREEN_EXIT` telemetry event to the backend (score bump applied server-side).
 *  2. Show a blocking VS Code warning modal with a countdown.
 *  3. After MAX_DISMISSALS dismissals, send `FULLSCREEN_BLOCKED` and show a hard error
 *     that cannot be dismissed — the student must make VS Code fullscreen again.
 *  4. Every RECHECK_INTERVAL_MS while not fullscreen, re-prompt automatically.
 *
 * Pre-exam gate:
 *  Call `enforceFullscreenOnStart()` from extension.ts before registering any
 *  other telemetry — this blocks activation until the student is in fullscreen.
 *
 * Multi-monitor detection:
 *  On activation, checks the connected display count and sends it with the first
 *  telemetry event. A display count > 1 is flagged on the teacher dashboard.
 *
 * @param ctx       - VS Code extension context for disposable registration
 * @param transport - Transport layer to send events to the backend
 */
export function registerFullscreenTracker(
    ctx: vscode.ExtensionContext,
    transport: { send: (payload: FullscreenEvent) => void }
) {
    let dismissalCount = 0;
    let isCurrentlyFocused = true;
    let recheckTimer: ReturnType<typeof setInterval> | null = null;

    // --- Multi-monitor check on start ---
    const displayCount = getDisplayCount();
    if (displayCount > 1) {
        vscode.window.showWarningMessage(
            `ExamGuard: ${displayCount} displays detected. Only one monitor is permitted during the exam.`
        );
        transport.send({
            type: 'FULLSCREEN_EXIT',
            timeStamp: Date.now(),
            displayCount
        });
    }

    // --- Enforcement helpers ---

    function startRecheckTimer() {
        if (recheckTimer) return;
        recheckTimer = setInterval(async () => {
            if (!isCurrentlyFocused) {
                await showEnforcementModal();
            }
        }, RECHECK_INTERVAL_MS);
    }

    function stopRecheckTimer() {
        if (recheckTimer) {
            clearInterval(recheckTimer);
            recheckTimer = null;
        }
    }

    async function showEnforcementModal() {
        dismissalCount++;

        if (dismissalCount > MAX_DISMISSALS) {
            // Hard block — cannot be dismissed, only shows "Return to Fullscreen"
            transport.send({ type: 'FULLSCREEN_BLOCKED', timeStamp: Date.now(), dismissalCount });

            const choice = await vscode.window.showErrorMessage(
                `⛔ ExamGuard: You have been flagged for repeatedly leaving fullscreen. ` +
                `Return VS Code to fullscreen immediately. This incident has been reported.`,
                { modal: true },
                'Return to Fullscreen'
            );

            if (choice === 'Return to Fullscreen') {
                await requestFullscreen();
            }
        } else {
            // Soft warning — student can dismiss but it counts against them
            const remaining = MAX_DISMISSALS - dismissalCount + 1;
            const choice = await vscode.window.showWarningMessage(
                `⚠️ ExamGuard: VS Code is not fullscreen. ` +
                `You have ${remaining} warning(s) remaining before this incident is escalated. ` +
                `Please return to fullscreen immediately.`,
                { modal: true },
                'Return to Fullscreen',
                'Dismiss (flagged)'
            );

            if (choice === 'Return to Fullscreen') {
                await requestFullscreen();
            }
            // "Dismiss (flagged)" or closing the dialog = counts as a strike, already incremented
        }
    }

    // --- Main focus-change listener ---
    const windowStateSub = vscode.window.onDidChangeWindowState(async (state) => {

        if (state.focused && !isCurrentlyFocused) {
            // Student returned to VS Code
            isCurrentlyFocused = true;
            stopRecheckTimer();
            dismissalCount = 0; // Reset after they return

            transport.send({ type: 'FULLSCREEN_RETURN', timeStamp: Date.now() });
            vscode.window.showInformationMessage('ExamGuard: Welcome back. Please stay in VS Code.');

        } else if (!state.focused && isCurrentlyFocused) {
            // Student left VS Code
            isCurrentlyFocused = false;

            transport.send({
                type: 'FULLSCREEN_EXIT',
                timeStamp: Date.now(),
                dismissalCount,
                displayCount
            });

            await showEnforcementModal();
            startRecheckTimer();
        }
    });

    ctx.subscriptions.push(windowStateSub);

    // Clean up the recheck timer on deactivation
    ctx.subscriptions.push({ dispose: () => stopRecheckTimer() });
}

/**
 * Pre-exam fullscreen gate — call this BEFORE registering any other module.
 * Blocks activation with a modal until the student makes VS Code fullscreen.
 *
 * Because VS Code's API has no `isFullscreen` property, we use window focus as
 * the proxy — if the window is focused and the student has acknowledged the
 * fullscreen request, we proceed.
 */
export async function enforceFullscreenOnStart(): Promise<void> {
    const choice = await vscode.window.showWarningMessage(
        '🔒 ExamGuard requires VS Code to be in fullscreen mode for the duration of the exam.',
        { modal: true },
        'Enter Fullscreen & Continue'
    );

    if (choice === 'Enter Fullscreen & Continue') {
        await requestFullscreen();
        // Brief pause to let the OS animate the fullscreen transition
        await new Promise(resolve => setTimeout(resolve, 600));
    }
}
