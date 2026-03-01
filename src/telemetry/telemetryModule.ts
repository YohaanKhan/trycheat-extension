import * as vscode from 'vscode';
import { detectPaste } from './pasteDetector';
import { getFocusEventType } from './focusTracker';
import { transport } from '../comms/transport';

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
     * Subscription 1 — Keystrokes & Pastes
     * Fires on every document change. We loop over all changes in the event
     * because VS Code can batch multiple changes (e.g. find-and-replace) into one event.
     */

    const docChangeSub = vscode.workspace.onDidChangeTextDocument(event => {
        for (const change of event.contentChanges) {
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

    ctx.subscriptions.push(docChangeSub, focusSub, fileSwitchSub);
}