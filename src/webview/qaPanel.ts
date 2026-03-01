import * as vscode from 'vscode';

/**
 * Returns the HTML string for the Q&A webview panel.
 * Hardcoded for now — will be loaded from webview.html later.
 */
function getWebviewHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TryCheat — Question</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        #question {
            font-size: 1.1em;
            margin-bottom: 16px;
            padding: 12px;
            border-left: 3px solid var(--vscode-focusBorder);
            background: var(--vscode-textBlockQuote-background);
        }
        #timer {
            font-size: 2em;
            font-weight: bold;
            color: var(--vscode-errorForeground);
            margin-bottom: 12px;
        }
        #answer {
            width: 100%;
            height: 120px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            font-size: 1em;
            resize: vertical;
            box-sizing: border-box;
        }
        #submit {
            margin-top: 10px;
            padding: 8px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            font-size: 1em;
        }
        #submit:hover { background: var(--vscode-button-hoverBackground); }
        #submit:disabled, #answer:disabled { opacity: 0.5; cursor: not-allowed; }
    </style>
</head>
<body>
    <div id="question">Waiting for question...</div>
    <div id="timer">--</div>
    <textarea id="answer" placeholder="Type your answer here..."></textarea>
    <br>
    <button id="submit">Submit</button>

    <script>
        const vscode = acquireVsCodeApi();

        const questionEl = document.getElementById('question');
        const timerEl = document.getElementById('timer');
        const answerEl = document.getElementById('answer');
        const submitEl = document.getElementById('submit');

        let countdownInterval = null;

        // Listen for messages from qaPanel.ts
        window.addEventListener('message', event => {
            const message = event.data;

            if (message.type === 'NEW_QUESTION') {
                // Populate question text
                questionEl.textContent = message.question;

                // Re-enable inputs for new question
                answerEl.disabled = false;
                answerEl.value = '';
                submitEl.disabled = false;

                // Reset and start countdown
                startCountdown(message.timeLimit);
            }
        });

        /**
         * Starts a countdown timer from timeLimit seconds.
         * When it hits 0, posts QUESTION_EXPIRED and locks the inputs.
         */
        function startCountdown(timeLimit) {
            // Clear any existing countdown first
            if (countdownInterval) clearInterval(countdownInterval);

            let remaining = timeLimit;
            timerEl.textContent = remaining;

            countdownInterval = setInterval(() => {
                remaining -= 1;
                timerEl.textContent = remaining;

                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    lockInputs();
                    vscode.postMessage({ type: 'QUESTION_EXPIRED' });
                }
            }, 1000);
        }

        /** Disables the textarea and submit button */
        function lockInputs() {
            answerEl.disabled = true;
            submitEl.disabled = true;
        }

        // Submit button click handler
        submitEl.addEventListener('click', () => {
            const answer = answerEl.value.trim();
            if (!answer) return; // don't submit empty answers
            
            clearInterval(countdownInterval);
            lockInputs();
            vscode.postMessage({ type: 'SUBMIT_ANSWER', answer });
        });
    </script>
</body>
</html>`;
}

/**
 * Creates and returns a VS Code WebView panel for the Q&A interface.
 * The panel opens beside the active editor and displays questions from Ollama.
 * Listens for SUBMIT_ANSWER and QUESTION_EXPIRED messages from the webview.
 *
 * @returns The created WebviewPanel instance.
 */
export function createQAPanel(): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
        'trycheat.qa',
        'TryCheat — Question',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true  // keeps the timer running even if panel is not visible
        }
    );

    panel.webview.html = getWebviewHtml();

    /**
     * Handle messages posted from the webview HTML back to the extension.
     * SUBMIT_ANSWER — student submitted a response before time ran out.
     * QUESTION_EXPIRED — countdown hit zero, student did not answer in time.
     */
    panel.webview.onDidReceiveMessage(message => {
        if (message.type === 'SUBMIT_ANSWER') {
            console.log('Answer received:', message.answer);
            // TODO: forward answer to backend for Ollama scoring
        }

        if (message.type === 'QUESTION_EXPIRED') {
            console.log('Timer expired — student did not answer in time');
            // TODO: notify backend that question was not answered
        }
    });

    return panel;
}

/**
 * Sends a new question to the webview panel.
 * The webview will display the question and start the countdown timer.
 *
 * @param panel     - The active WebviewPanel created by createQAPanel()
 * @param question  - The question text generated by Ollama
 * @param timeLimit - Seconds the student has to answer e.g. 90
 */
export function sendQuestion(
    panel: vscode.WebviewPanel,
    question: string,
    timeLimit: number
): void {
    panel.webview.postMessage({ type: 'NEW_QUESTION', question, timeLimit });
}