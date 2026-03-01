import * as vscode from 'vscode';
import { registerTelemetry } from './telemetry/telemetryModule';
import { startSnapshotSystem } from './snapshot/snapshotSystem';

/**
 * Called by VS Code once when the extension is first activated.
 * Activation is triggered by the events defined in `activationEvents` in package.json.
 *
 * This is the entry point of the entire extension — everything gets wired up here.
 *
 * @param context - Provided by VS Code. Used to register disposables so all
 *                  subscriptions and intervals are cleaned up on deactivation.
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('TryCheat is now active.');

    // Wire up all keystroke, paste, focus, and file switch telemetry listeners
    registerTelemetry(context);

    // Start the 60-second snapshot timer
    startSnapshotSystem(context);

    // Scaffold hello world command — can be removed later
    const disposable = vscode.commands.registerCommand('trycheat.helloWorld', () => {
        vscode.window.showInformationMessage('TryCheat is running!');
    });

    context.subscriptions.push(disposable);
}

/**
 * Called by VS Code when the extension is deactivated (e.g. VS Code closes).
 * We don't need to manually clean up here — everything was pushed into
 * `context.subscriptions` so VS Code handles disposal automatically.
 */
export function deactivate() {}