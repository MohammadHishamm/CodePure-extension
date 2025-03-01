import * as vscode from "vscode";
import { ProblemsChecker } from "./services/ProblemsChecker";
import { isSupportedFileType } from "./services/SupportedFileTypes";
import { analyzeCode } from "./services/AnalyzeCode";

export function handleEvents(context: vscode.ExtensionContext) {
  vscode.workspace.onDidSaveTextDocument(async (document) => {
    const problemsChecker = new ProblemsChecker(document);
    const isSupportedfiletype = new isSupportedFileType(document);

    if (
      !problemsChecker.checkForErrors() &&
      isSupportedfiletype.isSupported()
    ) {
      const sourceCode = document.getText();
      await analyzeCode(document, sourceCode);
    }
  });

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("extension.selectedMetrics")) {
      const updatedMetrics = vscode.workspace
        .getConfiguration("codepure")
        .get<string[]>("selectedMetrics", []);
      vscode.window.showInformationMessage(
        `Metrics updated: ${updatedMetrics.join(", ")}`
      );
    }
  });
}
