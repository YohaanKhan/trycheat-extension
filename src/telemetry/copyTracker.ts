import * as vscode from 'vscode';

/**
 * Extracts the currently selected text from the active editor
 * and constructs a `COPY` telemetry payload if the text is substantial.
 *
 * @param editor - The active text editor where the copy action originated.
 * @returns A structured telemetry event payload, or `null` if the copied text is too short.
 */
export function getCopyEventPayload(editor: vscode.TextEditor): any | null {
    const selection = editor.selection;
    const copiedText = editor.document.getText(selection);

    // Send telemetry if the copied text is substantial (> 10 chars)
    if (copiedText.length > 10) {
        return {
            type: 'COPY',
            timeStamp: Date.now(),
            file: editor.document.fileName,
            charDelta: copiedText.length,
            content: copiedText,
        };
    }

    return null;
}