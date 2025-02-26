import * as vscode from "vscode";
import { initializeExtension, customTreeProvider  , FECFcode} from "./initialize";
import { registerCommands } from "./commands";
import { handleEvents } from "./events";

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
  await FECFcode.deleteAllResultsFiles();
  console.log("CodePure extension is now deactivated.");
}
