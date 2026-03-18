# TryCheat (ExamGuard Client) - VS Code Extension

An advanced, seamless exam platform and analytics engine built directly into Visual Studio Code. **TryCheat** ensures academic integrity and provides instructors with deep insights into the student's problem-solving process during an assignment or exam.

## 🚀 Key Features

### 1. Robust Academic Environment
- Instantly connects to your institution's ExamGuard Server to verify exam eligibility.
- Ensures a standardized, distraction-free environment for all participants.

### 2. Comprehensive Code & Action Analytics
- Monitors continuous coding progress to generate rich analytical reports for instructors.
- Automatically captures the organic development of solutions over time, validating work without requiring heavy or invasive screen-recording software.
- Validates a healthy IDE state and ensures students are adhering to approved tooling practices.

### 3. Active Session Management
- Streams live status securely to the centralized ExamGuard Server over WebSockets.
- Includes a real-time connectivity heartbeat to ensure students remain online and synchronized during the entire assessment.

---

## 🛠️ How it Works

1. **Activation**: The extension activates automatically when the student connects to an assessment session or runs the `ExamGuard: Submit Exam` command. 
2. **Authentication**: It securely authenticates the student identity with the centralized backend server.
3. **Analytics Engine**: Operates silently alongside standard coding activities, utilizing VS Code's native APIs to compile a secure, tamper-proof profile of the session.
4. **Data Synchronization**: Important milestones and session data are packaged asynchronously and transmitted to the instructor in real time.

---

## 📥 Setup and Installation

1. Ensure your institution's ExamGuard Server is running and accessible.
2. Install the extension directly from the Marketplace or via a provided `.vsix` file.
3. Open your assessment workspace in VS Code.
4. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and select `TryCheat: Hello World` to verify activation.
