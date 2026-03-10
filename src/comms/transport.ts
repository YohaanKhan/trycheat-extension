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

    /** Stores the last-used server URL and student ID for reconnection */
    private serverUrl: string | null = null;
    private studentId: string | null = null;

    /** Prevents multiple reconnect timers stacking if close fires repeatedly */
    private reconnecting: boolean = false;

    /** Handle for any pending reconnect setTimeout, so disconnect() can cancel it */
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    /** Delay in ms before attempting to reconnect after a dropped connection */
    private readonly RECONNECT_DELAY_MS = 3000;

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
    connect(serverUrl: string, studentId: string, examCode?: string): void {
        // Store credentials so reconnect() can reuse them without arguments
        this.serverUrl = serverUrl;
        this.studentId = studentId;
        this.reconnecting = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Clean up any existing connection before opening a new one
        this.disconnect();
        const url = examCode
            ? `${serverUrl}?studentId=${studentId}&examCode=${examCode}`
            : `${serverUrl}?studentId=${studentId}`;
        this.ws = new WebSocket(url);

        /** Connection opened — flush any events that were queued before connect() was called */
        this.ws.on('open', () => {
            console.log(`[Transport] Connected to ${serverUrl} as ${studentId}`);
            this.reconnecting = false;
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

        /**
         * Connection closed — schedule a reconnect after RECONNECT_DELAY_MS.
         * The `reconnecting` flag prevents stacking multiple timers if close
         * fires repeatedly before the retry fires.
         */
        this.ws.on('close', () => {
            if (!this.reconnecting && this.serverUrl && this.studentId) {
                this.reconnecting = true;
                console.warn(`[Transport] Connection closed. Reconnecting in ${this.RECONNECT_DELAY_MS}ms...`);
                this.reconnectTimer = setTimeout(() => this.connect(this.serverUrl!, this.studentId!), this.RECONNECT_DELAY_MS);
            }
        });

        /** Connection error — warn with details (close will fire next and handle retry) */
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
        // Cancel any pending reconnect before closing — prevents ghost reconnects
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnecting = false;
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