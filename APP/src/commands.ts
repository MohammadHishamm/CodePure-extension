import * as vscode from "vscode";
import { getSelectedMetrics } from "./utils";


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



  context.subscriptions.push(activateCommand, deactivateCommand, analyzeSelectedCodeCommand, openSettingsCommand);
}
