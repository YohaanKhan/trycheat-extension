import WebSocket from 'ws';

/**
 * Handles all outbound communication from the extension to the backend server.
 * Maintains a WebSocket connection and queues events if the socket isn't open yet,
 * flushing them automatically once the connection is established.
 *
 * Usage:
 * ```
 * transport.connect('ws://localhost:3000', 'student-123');
 * transport.send({ type: 'PASTE', timestamp: Date.now(), ... });
 * ```
 */
class Transport {

    /** The active WebSocket connection, or null if not yet connected */
    private ws: WebSocket | null = null;

    /** Events buffered while the connection is not yet open */
    private queue: object[] = [];

    /**
     * Optional callback invoked when a message is received from the server.
     * Set this in extension.ts to forward NEW_QUESTION events to the Q&A panel.
     */
    public onMessage: ((message: unknown) => void) | null = null;

    /**
     * Opens a WebSocket connection to the backend server.
     * Attaches event handlers for open, message, close, and error.
     * Flushes any queued events once the connection opens.
     *
     * @param serverUrl  - The WebSocket server URL e.g. `ws://localhost:3000`
     * @param studentId  - Unique identifier for this student, appended as a query param
     */
    connect(serverUrl: string, studentId: string): void {
        // Clean up any existing connection before opening a new one
        this.disconnect();
        this.ws = new WebSocket(`${serverUrl}?studentId=${studentId}`);

        /** Connection opened — flush any events that were queued before connect() was called */
        this.ws.on('open', () => {
            console.log(`[Transport] Connected to ${serverUrl} as ${studentId}`);
            this.flush();
        });

        /**
         * Message received from the server — for now just log it.
         * Later this will dispatch questions to the Q&A panel.
         */
        this.ws.on('message', (data: WebSocket.RawData) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('[Transport] Message from server:', message);
                if (this.onMessage) {
                    this.onMessage(message);
                }
            } catch {
                console.warn('[Transport] Received non-JSON message:', data);
            }
        });

        /** Connection closed — warn so we know to attempt reconnection later */
        this.ws.on('close', () => {
            console.warn('[Transport] Connection closed. Reconnection not yet implemented.');
        });

        /** Connection error — warn with details */
        this.ws.on('error', (err: Error) => {
            console.warn('[Transport] WebSocket error:', err.message);
        });
    }

    /**
     * Sends a telemetry event to the backend server.
     * If the socket is not open yet, the event is queued and sent once it opens.
     *
     * @param payload - Any telemetry object e.g. `{ type: 'PASTE', timestamp: ... }`
     */
    send(payload: object): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        } else {
            this.queue.push(payload);
        }
    }

    /**
     * Closes the active WebSocket connection and removes all listeners.
     * Safe to call even if no connection is open.
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.removeAllListeners();
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Drains the event queue by sending all buffered events in order.
     * Called automatically once the WebSocket connection opens.
     */
    private flush(): void {
        while (this.queue.length > 0) {
            const event = this.queue.shift();
            if (event) this.send(event);
        }
    }
}

/**
 * Singleton instance of Transport shared across the entire extension.
 * Import this directly wherever you need to send telemetry.
 *
 * @example
 * import { transport } from './comms/transport';
 * transport.send({ type: 'KEYSTROKE', timestamp: Date.now() });
 */
export const transport = new Transport();