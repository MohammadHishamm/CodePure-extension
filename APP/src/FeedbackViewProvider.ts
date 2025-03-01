import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Command to handle the "Provide Feedback" click
export function provideFeedbackCommand() {
  const panel = vscode.window.createWebviewPanel(
    'feedbackForm',
    'Provide Feedback',
    vscode.ViewColumn.One,
    {
      enableScripts: true
    }
  );

  panel.webview.html = getFeedbackFormHtml();

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.command) {
        case 'submitFeedback':
          vscode.window.showInformationMessage(`Feedback received: ${message.text}`);
          
          // Save feedback to a file (optional)
          try {
            const feedbackPath = path.join(__dirname, "..", "src/Feedback", "feedback.txt");
            
            // Create directory if it doesn't exist
            const dir = path.dirname(feedbackPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.appendFileSync(feedbackPath, new Date().toISOString() + ": " + message.text + "\n");
          } catch (error) {
            console.error("Error saving feedback:", error);
          }
          
          panel.dispose(); // Close the panel
          return;
      }
    }
  );
}

// The Feedback View Provider class isn't needed if you're using a command
// to open a webview panel instead of a view

// HTML for the feedback form
function getFeedbackFormHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Provide Feedback</title>
    <style>
        :root {
            --transition-speed: 0.3s;
        }

        body {
            padding: 20px;
            font-family: system-ui, sans-serif;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            animation: fadeInBody 1s ease-in-out;
        }

        h2 {
            color: var(--vscode-editor-foreground);
            font-size: 1.8em;
            text-align: center;
            animation: fadeIn var(--transition-speed) ease-in-out, bounce 1s ease-in-out infinite alternate;
        }

        textarea {
            width: 100%;
            max-width: 500px;
            height: 150px;
            margin: 15px 0;
            padding: 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 2px solid var(--vscode-input-border);
            border-radius: 8px;
            resize: none;
            transition: border-color var(--transition-speed), transform var(--transition-speed);
            animation: slideIn 0.5s ease-in-out;
        }

        textarea:focus {
            border-color: var(--vscode-button-hoverBackground);
            outline: none;
            transform: scale(1.02);
        }

        button {
            padding: 12px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1em;
            font-weight: bold;
            transition: background-color var(--transition-speed), transform var(--transition-speed);
            animation: pulse 1.5s infinite;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
            transform: scale(1.1) rotate(2deg);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInBody {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes bounce {
            from { transform: translateY(0); }
            to { transform: translateY(5px); }
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <h2>We'd love to hear your feedback!</h2>
    <textarea id="feedbackText" placeholder="Tell us what you think about CodePure..."></textarea>
    <button id="submitBtn">Submit Feedback</button>

    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('submitBtn').addEventListener('click', () => {
            const text = document.getElementById('feedbackText').value;
            if (text) {
                vscode.postMessage({
                    command: 'submitFeedback',
                    text: text
                });
                document.getElementById('feedbackText').value = '';
            }
        });
    </script>
</body>
</html>`;
}

// Export other components if needed for the FeedbackViewProvider
export class FeedbackViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = getFeedbackFormHtml();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(data => {
      if (data.command === 'submitFeedback') {
        // Process the feedback
        vscode.window.showInformationMessage(`Feedback received: ${data.text}`);
        // Here you would typically send the feedback to your server
      }
    });
  }
}