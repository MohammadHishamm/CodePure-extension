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
import { getFixSuggestion } from "./GoogleGemini_AI";
import * as fs from 'fs';
import * as path from 'path';

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
          // highlightBrainClassContributors(document,diagnosticCollection);
          highlightDataClass(document,diagnosticCollection);
          highlightGodClassContributors(document,diagnosticCollection);
         
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
    // Show notification with Quick AI Fix button
    vscode.window.showInformationMessage(
      "CodePure detected a Brain Class! Want to apply a Quick AI Fix?",
      "✨ Quick AI Fix"
    ).then((selection) => {
      if (selection === "✨ Quick AI Fix") {
        vscode.commands.executeCommand("codepure.getAIFix", document);
      }
    });
  
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

// Define highlight styles
const wmcHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 255, 0, 0.4)" // Yellow for WMC
});

const locHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 105, 180, 0.3)" // Pink for LOC
});

const noamHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 105, 180, 0.3)" // Pink for NOAM (Accessors)
});

const wocHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(0, 255, 255, 0.4)" // Cyan for WOC
});

const tccHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(0, 255, 255, 0.3)" // Cyan for TCC
});

// Path to the JSON file
let METRICS_FILE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "src",
  "Results",
  "MetricsCalculated.json"
);

async function highlightBrainClassContributors(
  document: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection
): Promise<void> {
  if (!fs.existsSync(METRICS_FILE_PATH)) {
    console.error("Metrics JSON file not found:", METRICS_FILE_PATH);
    return;
  }

  const fileContent = fs.readFileSync(METRICS_FILE_PATH, 'utf-8');
  const metricsData = JSON.parse(fileContent) as Array<{ fullPath: string; metrics: { name: string; value: number }[] }>;

  // Find metrics for the current file
  const fileMetrics = metricsData.find(entry => entry.fullPath === document.fileName);
  if (!fileMetrics) {
    console.warn("No metrics found for file:", document.fileName);
    return;
  }

  // Extract LOC & WMC
  const LOC = fileMetrics.metrics.find(m => m.name === "LOC")?.value || 0;
  const WMC = fileMetrics.metrics.find(m => m.name === "WMC")?.value || 0;

  console.log("File Path:", METRICS_FILE_PATH);
console.log("File Content:", fileContent);
console.log("Found Metrics:", fileMetrics);
console.log(`Extracted LOC: ${LOC}, WMC: ${WMC}`);

  const diagnostics: vscode.Diagnostic[] = [];
  const wmcRanges: vscode.Range[] = [];
  const locRanges: vscode.Range[] = [];

  // Apply highlighting rules
  if (LOC >50) {
    const classHeadRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, document.lineAt(0).text.length)
    );

    locRanges.push(classHeadRange);

    const diagnostic = new vscode.Diagnostic(
      classHeadRange,
      "Try to make lines more less (LOC > 351)",
      vscode.DiagnosticSeverity.Warning
    );
    diagnostic.code = "brainClass.LOC";
    diagnostic.source = "CodePure";
    diagnostics.push(diagnostic);
  }

  if (WMC > 15) {
    // Iterate over lines and find method headers to highlight
    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text.trim();
      if (/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(lineText)) {
        const functionRange = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, lineText.length)
        );

        wmcRanges.push(functionRange);

        const diagnostic = new vscode.Diagnostic(
          functionRange,
          "Complex method contributing to high WMC (> 87)",
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = "brainClass.WMC";
        diagnostic.source = "CodePure";
        diagnostics.push(diagnostic);
      }
    }
  }

  // Apply decorations and diagnostics
  diagnosticCollection.set(document.uri, diagnostics);

  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.toString() === document.uri.toString()) {
    editor.setDecorations(wmcHighlightType, wmcRanges);
    editor.setDecorations(locHighlightType, locRanges);
  }
}

  async function highlightDataClass(
    document: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection
  ): Promise<void> {
    if (!fs.existsSync(METRICS_FILE_PATH)) {
      console.error("Metrics JSON file not found:", METRICS_FILE_PATH);
      return;
    }
  
    const fileContent = fs.readFileSync(METRICS_FILE_PATH, "utf-8");
    const metricsData = JSON.parse(fileContent) as Array<{ fullPath: string; metrics: { name: string; value: number }[] }>;
  
    // Find metrics for the current file
    const fileMetrics = metricsData.find(entry => entry.fullPath === document.fileName);
    if (!fileMetrics) {
      console.warn("No metrics found for file:", document.fileName);
      return;
    }
  
    // Extract required metrics
    const WOC = fileMetrics.metrics.find(m => m.name === "WOC")?.value || 1; // Default to 1 to avoid false positives
    const NOPA = fileMetrics.metrics.find(m => m.name === "NOPA")?.value || 0;
    const NOAM = fileMetrics.metrics.find(m => m.name === "NOAM")?.value || 0;
    const WMC = fileMetrics.metrics.find(m => m.name === "WMC")?.value || 100; // Default high to avoid false positives
  
    console.log(`Extracted WOC: ${WOC}, NOPA: ${NOPA}, NOAM: ${NOAM}, WMC: ${WMC}`);
  
    const diagnostics: vscode.Diagnostic[] = [];
    const wmcRanges: vscode.Range[] = [];
    const noamRanges: vscode.Range[] = [];
    const wocRanges: vscode.Range[] = [];
  
    // Check Data Class conditions
    if (WOC < 0.333 || (NOPA + NOAM) > 2 || WMC < 29) {
      // Highlight class head for WOC
      const classHeadRange = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(0, document.lineAt(0).text.length)
      );
      wocRanges.push(classHeadRange);
      diagnostics.push(new vscode.Diagnostic(
        classHeadRange,
        "Try to make the weight less (WOC < 0.333).",
        vscode.DiagnosticSeverity.Warning
      ));
  
      // Highlight method heads for WMC
      for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text.trim();
  
        // Detect method heads (functions)
        if (/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(lineText)) {
          const functionRange = new vscode.Range(
            new vscode.Position(i, 0),
            new vscode.Position(i, lineText.length)
          );
  
          if (WMC > 0) {
            wmcRanges.push(functionRange);
            diagnostics.push(new vscode.Diagnostic(
              functionRange,
              "Try to make complexity less in this function (WMC).",
              vscode.DiagnosticSeverity.Warning
            ));
          }
  
          // Detect accessor methods (getters/setters)
          if (/^\s*(public|protected)\s+\w+\s+(get|set)[A-Z]\w*\s*\(.*\)\s*\{?/.test(lineText)) {
            noamRanges.push(functionRange);
            diagnostics.push(new vscode.Diagnostic(
              functionRange,
              "Too much accessor methods (NOAM).",
              vscode.DiagnosticSeverity.Warning
            ));
          }
        }
      }
    }
  
    // Apply decorations and diagnostics
    diagnosticCollection.set(document.uri, diagnostics);
  
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
      editor.setDecorations(wmcHighlightType, wmcRanges);
      editor.setDecorations(noamHighlightType, noamRanges);
      editor.setDecorations(wocHighlightType, wocRanges);
    }

}

async function highlightGodClassContributors(
  document: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection
): Promise<void> {
  if (!fs.existsSync(METRICS_FILE_PATH)) {
    console.error("Metrics JSON file not found:", METRICS_FILE_PATH);
    return;
  }

  const fileContent = fs.readFileSync(METRICS_FILE_PATH, 'utf-8');
  const metricsData = JSON.parse(fileContent) as Array<{ fullPath: string; metrics: { name: string; value: number }[] }>;

  const fileMetrics = metricsData.find(entry => entry.fullPath === document.fileName);
  if (!fileMetrics) {
    console.warn("No metrics found for file:", document.fileName);
    return;
  }

  const WMC = fileMetrics.metrics.find(m => m.name === "WMC")?.value || 0;
  const TCC = fileMetrics.metrics.find(m => m.name === "TCC")?.value || 1;

  console.log("Extracted WMC:", WMC, "TCC:", TCC);

  const diagnostics: vscode.Diagnostic[] = [];
  const wmcRanges: vscode.Range[] = [];
  const tccRanges: vscode.Range[] = [];

  if (TCC < 0.333) {
    const classHeadRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, document.lineAt(0).text.length)
    );
    tccRanges.push(classHeadRange);
    diagnostics.push(new vscode.Diagnostic(
      classHeadRange,
      "Low cohesion contributes to a God Class (TCC < 0.333)",
      vscode.DiagnosticSeverity.Warning
    ));
  }

  if (WMC >= 19) {
    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text.trim();
      if (/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(lineText)) {
        const functionRange = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, lineText.length)
        );
        wmcRanges.push(functionRange);
        diagnostics.push(new vscode.Diagnostic(
          functionRange,
          "High complexity contributes to a God Class (WMC ≥ 43.87)",
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }
  }

  diagnosticCollection.set(document.uri, diagnostics);
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.toString() === document.uri.toString()) {
    editor.setDecorations(wmcHighlightType, wmcRanges);
    editor.setDecorations(tccHighlightType, tccRanges);
  }
}
