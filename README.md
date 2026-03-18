# TryCheat (ExamGuard Client) - VS Code Extension

An AI-powered, real-time exam monitoring system built directly into Visual Studio Code. **TryCheat** ensures academic integrity without requiring invasive proctoring software—all telemetry is captured natively within the editor.

## 🚀 Key Features and Telemetry

### 1. Window & Focus Monitoring
- **Focus Tracker:** Monitors when the student switches away from the VS Code window (e.g., clicking on a web browser to search for answers).
- **Fullscreen Tracker:** Ensures the student maintains VS Code in full-screen mode throughout the exam duration.

### 2. Code Execution & IDE Activity
- **Terminal Tracker:** Monitors terminal commands executed by the student to prevent running unauthorized scripts or fetching external code.
- **Debugger Tracker:** Tracks if the student attempts to attach external debuggers to bypass restrictions or modify memory.

### 3. Code Integrity & Snapshots
- **Bulk Deletion Tracker:** Flags suspicious massive code deletions or enormous instant copy-pastes that suggest cheating.
- **Snapshot System:** Takes periodic, automated diff snapshots of the workspace to maintain a historical log of the student's coding pace and ensure organic problem-solving.

### 4. Real-time Synchronization
- Streams all telemetry securely to the central **ExamGuard Server** over WebSockets.
- Includes a real-time heartbeat mechanism to prevent users from simply disconnecting their internet to bypass tracking.

---

## 🛠️ Architecture and How it Works

1. **Activation**: The extension activates when the student connects to a session or runs `ExamGuard: Submit Exam`. 
2. **Authentication**: It securely authenticates the student identity with the backend server via `src/auth/studentAuth.ts`.
3. **Telemetry Engine**: Once the exam starts, multiple specialized "Trackers" (like `focusTracker`, `terminalTracker`, `deletionTracker`) bind to VS Code's native Node.js Window and Workspace APIs to silently listen for lifecycle events.
4. **WebSocket Streaming**: As infractions occur or as normal snapshot intervals pass, a JSON payload is generated and streamed live over WebSockets to the server for administrative review.

---

## 📥 Setup and Installation

1. Make sure you have the [ExamGuard Server](../examguard-server) running locally or hosted online.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Open the repository in VS Code and press **F5** to start debugging. This will open an Extension Development Host.
4. Run `TryCheat: Hello World` to verify activation.
