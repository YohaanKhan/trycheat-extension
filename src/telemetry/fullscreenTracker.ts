import * as vscode from 'vscode';
import { execSync } from 'child_process';

/** How many times the student can dismiss the fullscreen warning before being hard-blocked */
const MAX_DISMISSALS = 2;

/** Number of seconds between each re-enforcement check when not fullscreen */
const RECHECK_INTERVAL_MS = 30_000;

/** Cooldown period after a modal is dismissed before another can be shown */
const MODAL_COOLDOWN_MS = 30_000;

/** Debounce period — ignore focus-lost events within this window of a focus-gained event */
const FOCUS_DEBOUNCE_MS = 1500;

type FullscreenEvent = {
    type: 'FULLSCREEN_EXIT' | 'FULLSCREEN_RETURN' | 'FULLSCREEN_BLOCKED' | 'WARNING_ISSUED';
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
 *  3. After MAX_DISMISSALS dismissals, silently send `FULLSCREEN_BLOCKED` events — no more modals.
 *  4. Every RECHECK_INTERVAL_MS while not fullscreen, re-prompt (up to MAX_DISMISSALS times).
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
    let isModalShowing = false;
    let recheckTimer: ReturnType<typeof setInterval> | null = null;
    let lastModalDismissedAt = 0;
    let lastFocusGainedAt = 0;

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
            if (!isCurrentlyFocused && !isWithinCooldown()) {
                await showEnforcementModal();
            }
        }, RECHECK_INTERVAL_MS);
    }

    /** Returns true if a modal was dismissed recently (within MODAL_COOLDOWN_MS) */
    function isWithinCooldown(): boolean {
        return Date.now() - lastModalDismissedAt < MODAL_COOLDOWN_MS;
    }

    function stopRecheckTimer() {
        if (recheckTimer) {
            clearInterval(recheckTimer);
            recheckTimer = null;
        }
    }

    async function showEnforcementModal() {
        if (isModalShowing) return;
        isModalShowing = true;

        try {
            if (dismissalCount >= MAX_DISMISSALS) {
                // Already hit the limit — silently report, no more modals
                transport.send({ type: 'FULLSCREEN_BLOCKED', timeStamp: Date.now(), dismissalCount });
                stopRecheckTimer();
                return;
            }

            dismissalCount++;

            // Soft warning
            transport.send({ type: 'WARNING_ISSUED', timeStamp: Date.now(), dismissalCount });
            const remaining = MAX_DISMISSALS - dismissalCount;
            const choice = await vscode.window.showWarningMessage(
                `⚠️ ExamGuard: Focus lost (navigated away from exam). ` +
                `${remaining > 0 ? `You have ${remaining} warning(s) remaining.` : `This is your final warning.`} ` +
                `Please stay focused on VS Code.`,
                { modal: true },
                'Acknowledge',
                'Toggle Fullscreen (if missing)'
            );

            if (choice === 'Toggle Fullscreen (if missing)') {
                await requestFullscreen();
            }

            // After the last warning, kill the recheck timer — just silently report from here
            if (dismissalCount >= MAX_DISMISSALS) {
                stopRecheckTimer();
            }
        } finally {
            isModalShowing = false;
            lastModalDismissedAt = Date.now();
        }
    }

    // --- Main focus-change listener ---
    const windowStateSub = vscode.window.onDidChangeWindowState(async (state) => {
        if (state.focused && !isCurrentlyFocused) {
            // Student returned to VS Code
            isCurrentlyFocused = true;
            lastFocusGainedAt = Date.now();
            stopRecheckTimer();

            transport.send({ type: 'FULLSCREEN_RETURN', timeStamp: Date.now() });
            vscode.window.showInformationMessage('ExamGuard: Welcome back. Please stay in VS Code.');

        } else if (!state.focused && isCurrentlyFocused) {
            // Debounce: ignore rapid focus-lost events that occur right after a
            // focus-gained (e.g. when the student clicks "Acknowledge" on the modal
            // and the window briefly gains then loses focus again).
            if (Date.now() - lastFocusGainedAt < FOCUS_DEBOUNCE_MS) {
                return;
            }

            // Student left VS Code
            isCurrentlyFocused = false;

            transport.send({
                type: 'FULLSCREEN_EXIT',
                timeStamp: Date.now(),
                dismissalCount,
                displayCount
            });

            startRecheckTimer();
            if (!isWithinCooldown()) {
                await showEnforcementModal();
            }
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
        'Ready (I am in Fullscreen)',
        'Enter Fullscreen for me'
    );

    if (choice === 'Enter Fullscreen for me') {
        await requestFullscreen();
        // Brief pause to let the OS animate the fullscreen transition
        await new Promise(resolve => setTimeout(resolve, 600));
    }
}