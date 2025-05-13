import * as vscode from "vscode";
import { analyzeCode } from "./services/AnalyzeCode";
import { ProblemsChecker } from "./services/ProblemsChecker";
import { isSupportedFileType } from "./services/SupportedFileTypes";

export function handleEvents(context: vscode.ExtensionContext) {
  vscode.workspace.onDidSaveTextDocument(async (document) => {
    const problemsChecker = new ProblemsChecker(document);
    const isSupportedfiletype = new isSupportedFileType(document);

    const sourceCode = document.getText();



    if (sourceCode.trim() === "") 
    {
      vscode.window.showWarningMessage("File is Empty:" , document.fileName);
      console.warn("File is Empty", document.fileName);
      return;
    }
    else  if (document.lineCount < 10)
    {
      vscode.window.showWarningMessage("File too small to analyze for code smells:", document.fileName);
      console.warn("File too small to analyze for code smells:", document.fileName);
      return;
    
    }


    if (
      !problemsChecker.checkForErrors() &&
      isSupportedfiletype.isSupported()
    ) {
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