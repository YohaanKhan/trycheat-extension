import * as vscode from 'vscode';

/** The backend URL used for exam code and student ID validation */
const SERVER_URL = 'http://localhost:3000';

/**
 * Prompts the student to enter their exam code and student ID via VS Code input boxes,
 * then validates both against the backend before allowing the session to start.
 *
 * Flow:
 *  1. Show InputBox for exam code
 *  2. Show InputBox for student ID
 *  3. POST both to `POST /auth/verify` on the backend
 *  4. Return credentials on success, or null if cancelled / rejected
 *
 * @returns An object containing `studentId` and `examCode` if authenticated, or `null` if not.
 *
 * @example
 * const auth = await authenticateStudent();
 * if (!auth) return; // student cancelled or server rejected
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

    /**
     * Step 3 — Validate credentials against the backend.
     * The server checks the exam code against its registry and rejects unknown codes.
     * If the server is unreachable, we bail out rather than silently skipping auth.
     */
    try {
        const response = await fetch(`${SERVER_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, examCode })
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({})) as Record<string, unknown>;
            const reason = (body.message as string) ?? 'Invalid exam code or student ID.';
            vscode.window.showErrorMessage(`TryCheat: Authentication failed — ${reason}`);
            return null;
        }

        console.log(`[Auth] Student verified — ID: ${studentId}, Exam: ${examCode}`);
        return { studentId, examCode };

    } catch (err) {
        // Network error — server is likely not running
        vscode.window.showErrorMessage('TryCheat: Could not reach the exam server. Please check your connection.');
        console.error('[Auth] Server unreachable:', err);
        return null;
    }
}