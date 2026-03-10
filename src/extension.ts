import * as vscode from 'vscode';
import { registerTelemetry } from './telemetry/telemetryModule';
import { startSnapshotSystem } from './snapshot/snapshotSystem';
import { authenticateStudent } from './auth/studentAuth';
import { transport } from './comms/transport';
import { registerDebuggerTracker } from './telemetry/debuggerTracker';
import { registerTerminalTracker } from './telemetry/terminalTracker';
import { registerFullscreenTracker } from './telemetry/fullscreenTracker';

/**
 * Entry point of the TryCheat extension.
 * Runs once when VS Code activates the extension.
 *
 * Flow:
 * 1. Authenticate the student (exam code + student ID)
 * 2. Connect to the backend via WebSocket
 * 3. Register all telemetry listeners
 * 4. Start the snapshot timer
 *
 * @param context - Provided by VS Code, used to register all disposables.
 */
export async function activate(context: vscode.ExtensionContext) {
	console.log('TryCheat activating...');

	// Step 1 — Authenticate the student before starting anything
	const auth = await authenticateStudent();
	if (!auth) {
		vscode.window.showErrorMessage('TryCheat: Authentication failed. Extension will not start.');
		return;
	}

	vscode.window.showInformationMessage(`TryCheat: Welcome ${auth.studentId}. Exam ${auth.examCode} is now being monitored.`);

	// Step 2 — Connect to backend (will queue events if backend isn't up yet)
	// Pass examCode in the URL so the server can register the session correctly
	transport.connect('ws://localhost:3000', auth.studentId, auth.examCode);

	// Step 3 — Register all telemetry listeners (keystrokes, pastes, focus, file switches)
	registerTelemetry(context);
	registerDebuggerTracker(context, transport);
	registerTerminalTracker(context, transport);
	registerFullscreenTracker(context, transport);

	// Step 4 — Start periodic code snapshots every 60 seconds
	startSnapshotSystem(context);
}

/**
 * Called by VS Code when the extension is deactivated.
 * Cleanly closes the WebSocket connection.
 */
export function deactivate() {
	transport.disconnect();
}