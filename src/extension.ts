import * as vscode from 'vscode';
import { registerTelemetry } from './telemetry/telemetryModule';
import { startSnapshotSystem } from './snapshot/snapshotSystem';
import { authenticateStudent } from './auth/studentAuth';
import { transport } from './comms/transport';
import { registerDebuggerTracker } from './telemetry/debuggerTracker';
import { registerTerminalTracker } from './telemetry/terminalTracker';
import { registerFullscreenTracker, enforceFullscreenOnStart } from './telemetry/fullscreenTracker';

let submitStatusBarItem: vscode.StatusBarItem;

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

	// Step 1 — Enforce fullscreen BEFORE anything else loads
	// This shows a modal immediately on activation; the exam cannot start until the student enters fullscreen.
	await enforceFullscreenOnStart();

	// Step 2 — Authenticate the student
	const auth = await authenticateStudent();
	if (!auth) {
		vscode.window.showErrorMessage('TryCheat: Authentication failed. Extension will not start.');
		return;
	}

	vscode.window.showInformationMessage(`TryCheat: Welcome ${auth.studentId}. Exam ${auth.examCode} is now being monitored.`);

	// Step 3 — Connect to backend
	// Pass examCode in the URL so the server can register the session correctly
	transport.connect(auth.wsUrl, auth.studentId, auth.examCode);

	// Step 4 — Register all telemetry listeners (keystrokes, pastes, focus, file switches)
	registerTelemetry(context);
	registerDebuggerTracker(context, transport);
	registerTerminalTracker(context, transport);
	// Fullscreen tracker now enforces fullscreen rather than just observing it
	registerFullscreenTracker(context, transport);

	// Step 5 — Start periodic code snapshots every 60 seconds
	startSnapshotSystem(context);

	// Step 6 — Register Submit Exam command and UI button
	const submitCmd = vscode.commands.registerCommand('examguard.submitExam', async () => {
		const choice = await vscode.window.showWarningMessage(
			'Are you sure you want to submit your exam? This will terminate your monitored session and notify the teacher.',
			{ modal: true },
			'Yes, Submit'
		);
		if (choice === 'Yes, Submit') {
			transport.send({ type: 'EXAM_SUBMITTED', timeStamp: Date.now() });

			// Give the socket a tiny bit to flush before disconnecting
			setTimeout(() => {
				transport.disconnect();
				vscode.window.showInformationMessage('Exam submitted successfully! You may now close VS Code.');
				submitStatusBarItem.text = '$(pass) Exam Submitted';
				submitStatusBarItem.color = '#3fb950';
				submitStatusBarItem.command = undefined; // Disable clicking it again
			}, 500);
		}
	});

	submitStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	submitStatusBarItem.text = '$(cloud-upload) Submit Exam';
	submitStatusBarItem.command = 'examguard.submitExam';
	submitStatusBarItem.color = '#e08e45'; // Orange to stand out
	submitStatusBarItem.show();

	context.subscriptions.push(submitCmd, submitStatusBarItem);
}

/**
 * Called by VS Code when the extension is deactivated.
 * Cleanly closes the WebSocket connection.
 */
export function deactivate() {
	transport.disconnect();
}