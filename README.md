# TryCheat (ExamGuard) VS Code Extension

An AI-powered exam monitoring system built as a VS Code extension. It tracks telemetry such as window focus, full-screen status, terminal usage, and debugger activity to ensure exam integrity.

## Prerequisites

- Visual Studio Code (`^1.95.0`)
- Node.js (v18 or higher recommended)
- The [ExamGuard Server](../examguard-server) must be running to receive telemetry.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Connection (if needed):**
   Ensure the extension is configured to connect to your local ExamGuard server's WebSocket URL (typically `ws://localhost:3005`).

## Development & Running

To run and test the extension locally:

1. Open this repository in VS Code.
2. Press `F5` to open a new VS Code window with the extension loaded (Extension Development Host).
3. Alternatively, you can run the compiler in watch mode:
   ```bash
   npm run watch
   ```

## Available Commands
- `TryCheat: Hello World` - A test command to verify activation.
- `ExamGuard: Submit Exam` - Command for students to manually trigger exam submission.
