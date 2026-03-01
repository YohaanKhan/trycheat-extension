import * as vscode from 'vscode';

/**
 * Determines whether a window state change represents a focus loss event.
 * Useful for detecting when the student has alt-tabbed away from VS Code.
 *
 * @param state - The window state object provided by `vscode.window.onDidChangeWindowState`.
 *                Contains a `focused` boolean indicating whether VS Code is currently active.
 *
 * @returns `true` if the window has lost focus, `false` if it has gained or retained focus.
 *
 * @example
 * vscode.window.onDidChangeWindowState(state => {
 *     if (isFocusLost(state)) {
 *         console.log('Student tabbed away!');
 *     }
 * });
 */

export function isFocusLost(state: vscode.WindowState): boolean {
    return !state.focused;
}

/**
 * Returns a string event type label based on the current window focus state.
 * Used to categorise telemetry events before sending them to the backend.
 *
 * @param state - The window state object provided by `vscode.window.onDidChangeWindowState`.
 *
 * @returns `'FOCUS_LOST'` if the window lost focus, `'FOCUS_GAINED'` if it gained focus.
 *
 * @example
 * vscode.window.onDidChangeWindowState(state => {
 *     const eventType = getFocusEventType(state);
 *     console.log(eventType); // 'FOCUS_LOST' or 'FOCUS_GAINED'
 * });
 */

export function getFocusEventType(state: vscode.WindowState): string {
    if ( !state.focused ) {
        return 'FOCUS_LOST';
    }
    else{
        return 'FOCUS_GAINED';
    }
}