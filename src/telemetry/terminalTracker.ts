import * as vscode from 'vscode';

/**
 * Telemetry event shape for terminal instances.
 */
type TerminalOpenedEvent = {
    type: 'TERMINAL_OPENED';
    timeStamp: number;
    name: string;
};

/**
 * Monitors the VS Code workspace for the opening of integrated terminal windows.
 * Terminals can be used by students to execute external HTTP requests, run hidden
 * scripts, or access local files outside the editor context.
 *
 * @param ctx - The VS Code extension context used to push disposable subscriptions.
 * @param transport - The active transport layer used to broadcast events to the backend.
 */
export function registerTerminalTracker(
    ctx: vscode.ExtensionContext,
    transport: { send: (payload: TerminalOpenedEvent) => void }
) {

    const terminalSub = vscode.window.onDidOpenTerminal((terminal) => {

        if (!terminal) return;

        const payload: TerminalOpenedEvent = {
            type: 'TERMINAL_OPENED',
            timeStamp: Date.now(),
            name: terminal.name
        };

        transport.send(payload);
    });

    ctx.subscriptions.push(terminalSub);
}