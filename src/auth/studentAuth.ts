import * as vscode from 'vscode';

/**
 * Prompts the student to enter their Server URL, exam code, and student ID via VS Code input boxes,
 * then validates both against the backend before allowing the session to start.
 *
 * Flow:
 *  1. Show InputBox for Server URL
 *  2. Show InputBox for exam code
 *  3. Show InputBox for student ID
 *  4. POST both to `POST /auth/verify` on the backend
 *  5. Return credentials on success, or null if cancelled / rejected
 *
 * @returns An object containing `studentId`, `examCode`, and `wsUrl` if authenticated, or `null` if not.
 *
 * @example
 * const auth = await authenticateStudent();
 * if (!auth) return; // student cancelled or server rejected
 * transport.connect(auth.wsUrl, auth.studentId);
 */
export async function authenticateStudent(): Promise<{ studentId: string; examCode: string; wsUrl: string } | null> {

    while (true) {
        /**
         * Step 1 — Ask for the server URL.
         */
        const serverUrlInput = await vscode.window.showInputBox({
            prompt: 'Enter the ExamGuard Server URL (e.g. 192.168.1.50:3000)',
            placeHolder: '192.168.1.50:3000',
            ignoreFocusOut: true
        });

        if (serverUrlInput === undefined) {
            return null;
        }

        if (!serverUrlInput) {
            vscode.window.showErrorMessage('Server URL is required to connect to the session.');
            continue;
        }

        // Format URLs
        const baseHost = serverUrlInput.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
        const httpUrl = `http://${baseHost}`;
        const wsUrl = `ws://${baseHost}`;

        /**
         * Step 2 — Ask for the exam code.
         * ignoreFocusOut prevents the box closing if the student clicks elsewhere by accident.
         */
        const examCode = await vscode.window.showInputBox({
            prompt: 'Enter your exam code',
            placeHolder: 'e.g. EXAM2024',
            ignoreFocusOut: true
        });

        // Undefined means the user hit Esc or the close button
        if (examCode === undefined) {
            return null;
        }

        if (!examCode) {
            vscode.window.showErrorMessage('Exam code is required to start the session.');
            continue;
        }

        /**
         * Step 3 — Ask for the student ID.
         */
        const studentId = await vscode.window.showInputBox({
            prompt: 'Enter your student ID or Roll Number',
            placeHolder: 'e.g. s12345678',
            ignoreFocusOut: true
        });

        if (studentId === undefined) {
            return null;
        }

        if (!studentId) {
            vscode.window.showErrorMessage('Student ID is required to start the session.');
            continue;
        }

        /**
         * Step 4 — Validate credentials against the backend.
         */
        try {
            const response = await fetch(`${httpUrl}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, examCode })
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({})) as Record<string, unknown>;
                const reason = (body.message as string) ?? 'Invalid exam code or student ID.';
                vscode.window.showErrorMessage(`TryCheat: Authentication failed — ${reason}. Please try again.`);
                continue;
            }

            console.log(`[Auth] Student verified — ID: ${studentId}, Exam: ${examCode}, URL: ${wsUrl}`);
            return { studentId, examCode, wsUrl };

        } catch (err) {
            // Network error — server is likely not running
            const retry = await vscode.window.showErrorMessage(
                'TryCheat: Could not reach the exam server. Please check your connection.',
                'Retry'
            );
            console.error('[Auth] Server unreachable:', err);

            if (retry === 'Retry') {
                continue;
            }
            return null;
        }
    }
}