import * as vscode from 'vscode';

/**
 * Telemetry event shape for debug sessions.
 */
type DebugStartEvent = {
    type: 'DEBUG_START';
    timeStamp: number;
    name: string;
    debugType: string;
};

/**
 * Monitors the VS Code workspace for the initialization of debug sessions.
 * A complete lack of debugging activity coupled with perfectly functioning code
 * is a strong indicator of pasted or generated solutions.
 *
 * @param ctx - The VS Code extension context used to push disposable subscriptions.
 * @param transport - The active transport layer used to broadcast events to the backend.
 */
export function registerDebuggerTracker(
    ctx: vscode.ExtensionContext,
    transport: { send: (payload: DebugStartEvent) => void }
) {

    const debugSub = vscode.debug.onDidStartDebugSession((session) => {

        if (!session) return;

        const payload: DebugStartEvent = {
            type: 'DEBUG_START',
            timeStamp: Date.now(),
            name: session.name,
            debugType: session.type
        };

        transport.send(payload);
    });

    ctx.subscriptions.push(debugSub);
}