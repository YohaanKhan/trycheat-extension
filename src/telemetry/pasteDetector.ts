import * as vscode from 'vscode';

/**
 * Detects whether a text document change event was likely caused by a paste action. (cheating)
 *
 * The core insight is that a normal keystroke inserts exactly 1 character. (yes, and an autocomplete would barely be around 5-10 characters)
 * Anything significantly larger, or spanning multiple lines, is almost certainly a paste. (unless the user is typing a very long word or sentence, so we keep the threshold at 20 characters, cause i doubt any word exists beyond that length.)
 *
 * @param change - A single content change event from `vscode.workspace.onDidChangeTextDocument`.
 *                 Contains the inserted text and metadata about where it was inserted. (yes, this is the only way to detect a paste)
 *
 * @returns `true` if the change is likely a paste, `false` if it looks like normal typing. 
 *
 * @example
 * vscode.workspace.onDidChangeTextDocument(event => {
 *     for (const change of event.contentChanges) {
 *         if (detectPaste(change)) {
 *             console.log('Paste detected!');
 *         }
 *     }
 * });
 */

export function detectPaste(change: vscode.TextDocumentContentChangeEvent) : boolean {
    
    /** retrieves the character length of the inserted text */
    const length = change.text.length; 

    /** checks if the inserted text contains a newline character */
    const hasNewline = change.text.includes('\n');

    /** if the inserted text is longer than 20 characters, it is likely a paste */
    if (length > 20){
        return true;
    }

    /** if the inserted text is longer than 5 characters and contains a newline character, it is likely a paste */
    if (length > 5 && hasNewline){
        return true;
    }

    /** or else it is safe to assume that it is just normal typing */
    return false;
}

