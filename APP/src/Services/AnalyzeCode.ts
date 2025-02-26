import * as vscode from "vscode";
import { MetricsFactory } from "../Factory/MetricsFactory";
import {
  metricsSaver,
  servermetricsmanager,
  FECFcode,
  pythonParser,
  javaParser,
} from "../initialize";
import { pause } from "../utils";
import { getFixSuggestion } from "../Services/GoogleGemini_AI";

let isAnalyzing = false;
const diagnosticCollection = vscode.languages.createDiagnosticCollection("codepure");

export async function analyzeCode(
  document: vscode.TextDocument,
  sourceCode: string
): Promise<string> {
  if (isAnalyzing) {
    vscode.window.showInformationMessage(
      "Analysis is already running. Please wait..."
    );
    return "Analysis in progress";
  }

  isAnalyzing = true;

  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Analyzing ${document.languageId} code`,
      cancellable: false,
    },
    async (progress) => {
      const parser =
        document.languageId === "java" ? new javaParser() : new pythonParser();
      parser.selectLanguage();

      const rootNode = parser.parse(sourceCode);

      const metricsToCalculate = [
        "LOC", "AMW", "CBO", "FDP", "DAC", "WMC", "WOC", "NOA",
        "NOM", "NOAM", "NOPA", "NAbsm", "NProtM", "NAS", "PNAS",
        "TCC", "DIT",
      ];

      try {
        progress.report({ message: "Initializing parser...", increment: 10 });
        await pause(500);

        progress.report({ message: "Parsing source code...", increment: 20 });
        await pause(500);

        progress.report({
          message: "Extracting Components From Code...",
          increment: 30,
        });
        await pause(500);
        await FECFcode.parseAllJavaFiles();

        const results = await calculateMetricsWithProgress(
          document,
          rootNode,
          sourceCode,
          document.languageId,
          metricsToCalculate,
          progress
        );

        if (results) {
          vscode.window.showInformationMessage("Analysis is Finished.");
          servermetricsmanager.sendMetricsFile();

          // Detect code smells and suggest AI fixes
          detectAndSuggestFixes(document, results);
        } else {
          vscode.window.showInformationMessage(
            "Error Occurred While Analyzing."
          );
        }

        return results;
      } finally {
        isAnalyzing = false;
      }
    }
  );
}

async function calculateMetricsWithProgress(
  document: vscode.TextDocument,
  rootNode: any,
  sourceCode: string,
  languageId: string,
  metrics: string[],
  progress: vscode.Progress<{ message: string; increment: number }>
): Promise<string> {
  const results: string[] = [];
  for (const [index, metricName] of metrics.entries()) {
    const metricCalculator = MetricsFactory.CreateMetric(
      metricName,
      languageId
    );
    if (metricCalculator) {
      const value = metricCalculator.calculate(
        rootNode,
        FECFcode,
        document.fileName
      );
      results.push(`${metricName}: ${value}`);
      // Update progress
      progress.report({
        message: `Calculating ${metricName}...`,
        increment: 70 / metrics.length, 
      });
      await pause(300); 
    }
  }

  metricsSaver.saveMetrics(
    results.map((result) => {
      const [name, value] = result.split(": ");
      return { name, value: parseFloat(value) };
    }),
    document.fileName
  );

  return results.join("\n");
}

async function detectAndSuggestFixes(document: vscode.TextDocument, results: string) {
  const diagnostics: vscode.Diagnostic[] = [];

  if (results.includes("WMC") && results.includes("LOC")) {
    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
    );

    const diagnostic = new vscode.Diagnostic(
      fullRange,
      "Potential Brain Class detected. AI can suggest a fix.",
      vscode.DiagnosticSeverity.Warning
    );

    diagnostic.code = "brainClass";
    diagnostic.source = "CodePure";
    diagnostics.push(diagnostic);
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

vscode.languages.registerCodeActionsProvider("*", {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ) {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.code === "brainClass") {
        const fixAction = new vscode.CodeAction(
          "CodePure: ✨ Apply AI Fix for Brain Class",
          vscode.CodeActionKind.QuickFix
        );

        fixAction.command = {
          command: "codepure.getAIFix",
          title: "Apply AI Fix",
          arguments: [document], 
        };

        fixAction.diagnostics = [diagnostic];
        actions.push(fixAction);
      }
    }

    return actions;
  },
});

vscode.commands.registerCommand("codepure.getAIFix", async (document: vscode.TextDocument) => {
  if (!document) return;

  vscode.window.showInformationMessage("Fetching AI fix suggestion...");
  const sourceCode = document.getText();
  const issue = "Brain Class detected, suggest a fix.";
  const fix = await getFixSuggestion(sourceCode, issue);

  if (fix) {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(document.lineCount, 0)
    );

    edit.replace(document.uri, fullRange, fix);
    await vscode.workspace.applyEdit(edit);
    vscode.window.showInformationMessage("AI Fix applied!");
  } else {
    vscode.window.showWarningMessage("No AI fix suggestion available.");
  }
});

