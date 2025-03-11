import * as vscode from "vscode";
import { getSelectedMetrics } from "./utils";
import { DashboardPanel } from "./ViewProjectReport";
import { provideFeedbackCommand } from "./FeedbackViewProvider";

let isActive = true;

export function registerCommands(context: vscode.ExtensionContext) {
  const activateCommand = vscode.commands.registerCommand("extension.activateCommand", () => {
    if (!isActive) {
      isActive = true;
      vscode.window.showInformationMessage("CodePure is now active!");
    } else {
      vscode.window.showWarningMessage("CodePure is already active!");
    }
  });

  const deactivateCommand = vscode.commands.registerCommand("extension.deactivateCommand", () => {
    if (isActive) {
      isActive = false;
      vscode.window.showInformationMessage("CodePure Deactivated!");
    } else {
      vscode.window.showWarningMessage("CodePure is not active!");
    }
  });
  
  // Register the feedback command
  const feedbackCommand = vscode.commands.registerCommand(
    "codepure.provideFeedback", 
    () => provideFeedbackCommand()
  );
  


  const analyzeSelectedCodeCommand = vscode.commands.registerCommand("extension.analyzeSelectedCode", async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showInformationMessage("No active editor found!");
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
      vscode.window.showInformationMessage("No text selected!");
      return;
    }

    vscode.window.showInformationMessage(`Current selected metrics: ${getSelectedMetrics().join(", ")}`);
  });

  const openSettingsCommand = vscode.commands.registerCommand("codepure.openSettings", () => {
    vscode.commands.executeCommand("workbench.action.openSettings", "CodePure");
  });

  const showDashboardCommand = vscode.commands.registerCommand("extension.showDashboard", () => {
    DashboardPanel.show(context.extensionUri);
  });


  context.subscriptions.push(activateCommand, deactivateCommand, analyzeSelectedCodeCommand, openSettingsCommand,showDashboardCommand,feedbackCommand);
}
