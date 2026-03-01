import * as vscode from 'vscode';

/**
 * Starts a periodic snapshot system that captures the full contents of the
 * currently active file every 60 seconds.
 *
 * Snapshots are the backbone of the session replay feature — by storing the full
 * file content at regular intervals, we can reconstruct exactly how the student's
 * code evolved over time, and feed snapshots to Ollama for analysis and question generation.
 *
 * The interval is registered as a disposable in `ctx.subscriptions` so it is
 * automatically cleared when the extension deactivates — no leaked timers.
 *
 * @param ctx - The extension context provided by VS Code on activation.
 */

export function startSnapshotSystem(ctx: vscode.ExtensionContext) {

    const interval = setInterval(() => {

        const editor = vscode.window.activeTextEditor;

        if (!editor){
            return;
        }

        console.log({
            type: 'SNAPSHOT',
            timeStamp: Date.now(),
            file: editor.document.fileName,
            content: editor.document.getText()
        });
    }, 60000);

    /**
     * Register a manual disposable that clears the interval when VS Code
     * deactivates the extension. Without this the interval would keep firing
     * in the background even after the extension is gone.
     */

    ctx.subscriptions.push({ dispose: ()=> clearInterval(interval)});
}