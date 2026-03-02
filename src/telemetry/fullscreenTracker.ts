import * as vscode from 'vscode';

/**
 * Telemetry event shape for window focus boundaries.
 */
type FullscreenEvent = {
    type: 'FULLSCREEN_TOGGLE';
    timeStamp: number;
    isFullscreen: boolean;
};

/**
 * Monitors the VS Code window state to heuristically determine if the student
 * has left the primary examination window (e.g., alt-tabbed to a browser).
 * Note: VS Code provides `window.state.focused`, which we use as a proxy for boundary checks.
 *
 * @param ctx - The VS Code extension context used to push disposable subscriptions.
 * @param transport - The active transport layer used to broadcast events to the backend.
 */
export function registerFullscreenTracker(
    ctx: vscode.ExtensionContext,
    transport: { send: (payload: FullscreenEvent) => void }
) {
    let isFullscreen = false;

    // VS Code currently lacks a direct `onDidToggleFullscreen` event.
    // However, we can hook into window state changes as a proxy.
    const windowStateSub = vscode.window.onDidChangeWindowState((state) => {

        // This is a heuristic: If the window loses focus, they might have exited fullscreen to use another app.
        // Or if they gain focus, they might have re-entered it. 
        // NOTE: A true API for `window.state.isFullscreen` does not exist in the public VS Code Extension API.
        // We will send a telemetry event indicating we suspect a window size/focus boundary change.

        const payload: FullscreenEvent = {
            type: 'FULLSCREEN_TOGGLE',
            timeStamp: Date.now(),
            // Since we can't objectively read fullscreen status, we just document the window state shift
            isFullscreen: state.focused
        };

        transport.send(payload);
    });

    ctx.subscriptions.push(windowStateSub);
}
