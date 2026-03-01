import * as vscode from 'vscode';

/**
 * Prompts the student to enter their exam code and student ID via VS Code input boxes.
 * Both fields are required — if either is cancelled or left empty, authentication fails.
 *
 * Server validation is skipped for now and will be added once the backend is ready.
 * Currently just logs the values and returns them directly.
 *
 * @returns An object containing `studentId` and `examCode` if successful, or `null` if cancelled.
 *
 * @example
 * const auth = await authenticateStudent();
 * if (!auth) return; // student cancelled
 * transport.connect('ws://localhost:3000', auth.studentId);
 */
export async function authenticateStudent(): Promise<{ studentId: string; examCode: string } | null> {

    /**
     * Step 1 — Ask for the exam code.
     * ignoreFocusOut prevents the box closing if the student clicks elsewhere by accident.
     */
    const examCode = await vscode.window.showInputBox({
        prompt: 'Enter your exam code',
        placeHolder: 'e.g. EXAM2024',
        ignoreFocusOut: true
    });

    if (!examCode) {
        vscode.window.showErrorMessage('Exam code is required to start the session.');
        return null;
    }

    /**
     * Step 2 — Ask for the student ID.
     * Same pattern — undefined means cancelled, empty string means they just hit enter.
     */
    const studentId = await vscode.window.showInputBox({
        prompt: 'Enter your student ID',
        placeHolder: 'e.g. s12345678',
        ignoreFocusOut: true
    });

    if (!studentId) {
        vscode.window.showErrorMessage('Student ID is required to start the session.');
        return null;
    }

    // TODO: validate examCode and studentId against the backend before proceeding
    console.log(`[Auth] Student authenticated — ID: ${studentId}, Exam: ${examCode}`);

    return { studentId, examCode };
}