import * as vscode from 'vscode';

/**
 * Telemetry event shape for suspicious typing cadence.
 */
type SuspiciousCadenceEvent = {
    type: 'SUSPICIOUS_CADENCE';
    timeStamp: number;
    message: string;
};

let lastKeystrokeTime = 0;
let cadenceHistory: number[] = [];

const WINDOW_SIZE = 30;
const MAX_VARIATION_MS = 5;
const MAX_AVG_SPEED_MS = 50;

/**
 * Evaluates the time delta between consecutive keystrokes to detect scripts or macros.
 * A sliding window of the last `WINDOW_SIZE` keystrokes is maintained. If the variation
 * between the fastest and slowest keystrokes falls below `MAX_VARIATION_MS` and the 
 * overall average speed is inhumanly fast, it flags an injection attempt.
 *
 * @param change - The document content change event being evaluated.
 * @returns A telemetry payload if script injection is strongly suspected, or `null`.
 */
export function checkCadence(
    change: vscode.TextDocumentContentChangeEvent
): SuspiciousCadenceEvent | null {

    // Only evaluate single-character insertions
    if (change.text.length !== 1) {
        resetCadence();
        return null;
    }

    const now = Date.now();

    // First keystroke setup
    if (lastKeystrokeTime === 0) {
        lastKeystrokeTime = now;
        return null;
    }

    const delta = now - lastKeystrokeTime;
    lastKeystrokeTime = now;

    // Ignore unrealistic values (tab switches, lag spikes, etc.)
    if (delta <= 0 || delta > 2000) {
        resetCadence();
        return null;
    }

    // Add to sliding window
    cadenceHistory.push(delta);

    if (cadenceHistory.length > WINDOW_SIZE) {
        cadenceHistory.shift(); // remove oldest
    }

    // Only evaluate when window full
    if (cadenceHistory.length < WINDOW_SIZE) {
        return null;
    }

    // Fast min/max + average check
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (const d of cadenceHistory) {
        if (d < min) min = d;
        if (d > max) max = d;
        sum += d;
    }

    const avg = sum / WINDOW_SIZE;
    const variation = max - min;

    // Suspicious pattern detected
    if (variation < MAX_VARIATION_MS && avg < MAX_AVG_SPEED_MS) {

        const event: SuspiciousCadenceEvent = {
            type: 'SUSPICIOUS_CADENCE',
            timeStamp: Date.now(),
            message: 'Detected highly uniform typing execution (possible macro/script injection)'
        };

        resetCadence(); // Important: prevent event spam
        return event;
    }

    return null;
}

function resetCadence() {
    cadenceHistory = [];
    lastKeystrokeTime = 0;
}