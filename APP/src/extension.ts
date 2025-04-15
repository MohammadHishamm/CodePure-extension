import * as vscode from "vscode";
import {
  initializeExtension,
  customTreeProvider,
  FECFcode,
} from "./initialize";
import { registerCommands } from "./commands";
import { handleEvents } from "./events";
import { FeedbackViewProvider } from "./FeedbackViewProvider";
import { cleanupMetricsFiles } from "./services/AnalyzeCode";
// Import the cleanup function

export async function activate(context: vscode.ExtensionContext) {
  console.time("Extension Execution Time");

  // Initialize extension components
  initializeExtension(context);

  // Register commands
  registerCommands(context);

  // Handle events (e.g., file save)
  handleEvents(context);

  // Register Tree View
  vscode.window.registerTreeDataProvider(
    "codepureTreeView",
    customTreeProvider
  );

  console.timeEnd("Extension Execution Time");
}

export async function deactivate() {
  // Clean up all metrics JSON files
  cleanupMetricsFiles();

  // Keep the existing FECF cleanup
  await FECFcode.deleteAllResultsFiles();

  console.log(
    "CodePure extension is now deactivated and all metrics files cleaned up."
  );
}
