import * as vscode from 'vscode';
import { detectPaste } from './pasteDetector';
import { getFocusEventType } from './focusTracker';
import { getCopyEventPayload } from './copyTracker';
import { transport } from '../comms/transport';
import { checkCadence } from './typingCadence';
import { detectMassDeletion } from './deletionTracker';
/**
 * Registers all telemetry event subscriptions for the ExamProctor extension.
 * Wires together paste detection, focus tracking, and file switch monitoring
 * into a single unified telemetry pipeline.
 *
 * All subscriptions are pushed into `ctx.subscriptions` so VS Code
 * automatically disposes them when the extension is deactivated — no memory leaks.
 *
 * @param ctx - The extension context provided by VS Code on activation.
 */

export function registerTelemetry(ctx: vscode.ExtensionContext): void {

    /**
     * Subscription 1 — Keystrokes & Pastes & Cadence
     * Fires on every document change. We loop over all changes in the event
     * because VS Code can batch multiple changes (e.g. find-and-replace) into one event.
     */

    const docChangeSub = vscode.workspace.onDidChangeTextDocument(event => {
        for (const change of event.contentChanges) {

            // 1. Check for macro injection cadence
            const cadenceEvent = checkCadence(change);
            if (cadenceEvent) {
                transport.send({ ...cadenceEvent, file: event.document.fileName });
            }

            // 2. Check for mass deletions
            const deletionEvent = detectMassDeletion(change);
            if (deletionEvent) {
                transport.send({ ...deletionEvent, file: event.document.fileName });
                continue; // Stop processing this change if it's a mass deletion
            }

            // 2. Check for traditional pastes
            const isPaste = detectPaste(change);

            if (isPaste) {
                transport.send({
                    type: 'PASTE',
                    timeStamp: Date.now(),
                    file: event.document.fileName,
                    charDelta: change.text.length,
                    content: change.text
                });
            } else {
                transport.send({
                    type: 'KEYSTROKE',
                    timeStamp: Date.now(),
                    file: event.document.fileName,
                    charDelta: change.text.length,
                });
            }
        }
    });

    /**
     * Subscription 2 — Window Focus
     * Fires when VS Code gains or loses focus.
     * We delegate the event type label to getFocusEventType() from focusTracker.ts.
     */

    const focusSub = vscode.window.onDidChangeWindowState(state => {
        transport.send({
            type: getFocusEventType(state),
            timeStamp: Date.now()
        })
    })

    /**
     * Subscription 3 — File Switch
     * Fires when the student switches to a different file tab.
     * editor can be undefined if all tabs are closed, so we fall back to null.
     */

    const fileSwitchSub = vscode.window.onDidChangeActiveTextEditor(editor => {
        transport.send({
            type: 'FILE_SWITCH',
            timeStamp: Date.now(),
            file: editor?.document.fileName ?? null
        })
    })

    /**
     * Subscription 4 — Copy Tracking
     * Intercepts the default copy action to inspect the payload.
     * Telemetry is sent only if the copied text represents a significant chunk.
     */

    const copySub = vscode.commands.registerCommand('editor.action.clipboardCopyAction', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.selection) {
            const payload = getCopyEventPayload(editor);
            if (payload) {
                transport.send(payload);
            }

            // Execute real copy by manually writing to the clipboard
            const textToCopy = editor.document.getText(editor.selection);
            if (textToCopy) {
                await vscode.env.clipboard.writeText(textToCopy);
            }
        } else {
            // Fallback for non-editor contexts (like explorer), though this command is specific to editors
            await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
        }
    });

    ctx.subscriptions.push(docChangeSub, focusSub, fileSwitchSub, copySub);
}