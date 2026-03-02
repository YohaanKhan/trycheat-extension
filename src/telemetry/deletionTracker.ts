import * as vscode from 'vscode';

/**
 * Telemetry event shape for mass deletion tracking.
 */
type MassDeletionEvent = {
    type: 'MASS_DELETION';
    timeStamp: number;
    charsDeleted: number;
};

// Configurable threshold: any pure deletion above this character count triggers telemetry.
const MASS_DELETE_THRESHOLD = 100;

/**
 * Identifies sudden removals of massive blocks of text.
 * Flags "rip and replace" strategies where a student deletes their failing logic
 * entirely in order to replace it with a pasted external solution.
 *
 * @param change - The document content change event being evaluated.
 * @returns A telemetry payload if a mass deletion is detected, or `null`.
 */
export function detectMassDeletion(
    change: vscode.TextDocumentContentChangeEvent
): MassDeletionEvent | null {

    const isPureDeletion = change.text === '';
    const deletedChars = change.rangeLength;

    // Only flag pure deletions
    if (!isPureDeletion) {
        return null;
    }

    // Ignore tiny deletions (normal editing)
    if (deletedChars < MASS_DELETE_THRESHOLD) {
        return null;
    }

    // Guard against full-file wipes triggered by formatters or programmatic edits
    if (deletedChars > 100000) {
        return null;
    }

    return {
        type: 'MASS_DELETION',
        timeStamp: Date.now(),
        charsDeleted: deletedChars
    };
}