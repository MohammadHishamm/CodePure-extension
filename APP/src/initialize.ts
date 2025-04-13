import * as vscode from "vscode";
import { MongoService } from "./services/MongoDB";

import { MetricsNotifier } from "./Core/MetricsNotifier";
import { MetricsSaver } from "./Saver/MetricsSaver";
import { CustomTreeProvider } from "./dashboard";
import { FolderExtractComponentsFromCode } from "./Extractors/FolderExtractComponentsFromCode";
import { javaParser } from "./Languages/javaParser";
import { pythonParser } from "./Languages/pythonParser";
import { ServerMetricsManager } from "./services/ServerMetricsManager";

export const FECFcode = new FolderExtractComponentsFromCode();
export const servermetricsmanager = new ServerMetricsManager();
export const metricsNotifier = new MetricsNotifier();
export const metricsSaver = new MetricsSaver(metricsNotifier);
export const customTreeProvider = new CustomTreeProvider();
metricsNotifier.addObserver(customTreeProvider);

// Shared UI components
export const outputChannel: vscode.OutputChannel =
  vscode.window.createOutputChannel("CodePure Output");
export const statusBarItem: vscode.StatusBarItem =
  vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);

// Initialization function
export async function initializeExtension(context: vscode.ExtensionContext) {
  console.log("Initializing CodePure...");

  try {
    const mongoService = MongoService.getInstance();
    await mongoService.connect();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    vscode.window.showErrorMessage("Failed to connect to MongoDB.");
  }

  servermetricsmanager.checkServerStatus();

  vscode.window.showInformationMessage(
    "CodePure is now active! Use 'Ctrl+S' to detect CodeSmells."
  );

  statusBarItem.text = "CodePure: Ready";
  statusBarItem.show();

  context.subscriptions.push(outputChannel, statusBarItem);
}

export { pythonParser, javaParser };
