import * as vscode from "vscode";
import { MetricsFactory } from "../Factory/MetricsFactory";
import { ServerMetricsManager } from "./ServerMetricsManager"; // Ensure correct import path

import {
  metricsSaver,
  servermetricsmanager,
  FECFcode,
  pythonParser,
  javaParser,
} from "../initialize";
import { pause } from "../utils";
import { getFixSuggestion } from "./GoogleGemini_AI";
import * as fs from "fs";
import * as path from "path";

let isAnalyzing = false;
const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("codepure");

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
        "LOC",
        "AMW",
        "CBO",
        "FDP",
        "DAC",
        "WMC",
        "WOC",
        "NOA",
        "NOM",
        "NOAM",
        "NOPA",
        "NAbsm",
        "NProtM",
        "NAS",
        "PNAS",
        "TCC",
        "DIT",
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
          // detectAndSuggestFixes(document, results);
          // highlightBrainClassContributors(document,diagnosticCollection);
          // highlightDataClass(document,diagnosticCollection);
          // highlightGodClassContributors(document,diagnosticCollection);
          getModelPredictions(document, diagnosticCollection);
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

async function suggestBrainClassFix(document: vscode.TextDocument) {
  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
  );

  vscode.window
    .showInformationMessage("CodePure detected a Brain Class! Want to apply a Quick AI Fix?", "✨ Quick AI Fix")
    .then(selection => {
      if (selection === "✨ Quick AI Fix") {
        vscode.commands.executeCommand("codepure.getBrainClassFix", document);
      }
    });
}

async function suggestGodClassFix(document: vscode.TextDocument) {
  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
  );

  vscode.window
    .showInformationMessage("CodePure detected a God Class! Want to apply a Quick AI Fix?", "✨ Quick AI Fix")
    .then(selection => {
      if (selection === "✨ Quick AI Fix") {
        vscode.commands.executeCommand("codepure.getGodClassFix", document);
      }
    });
}

async function suggestDataClassFix(document: vscode.TextDocument) {
  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
  );

  vscode.window
    .showInformationMessage("CodePure detected a Data Class! Want to apply a Quick AI Fix?", "✨ Quick AI Fix")
    .then(selection => {
      if (selection === "✨ Quick AI Fix") {
        vscode.commands.executeCommand("codepure.getDataClassFix", document);
      }
    });
}

vscode.commands.registerCommand("codepure.getBrainClassFix", async (document: vscode.TextDocument) => {
  await applyAIFix(document, "Brain Class detected, Suggest a fix using code only. Do not include explanations, comments, or markdown. Respond with valid Java code only.");
});

vscode.commands.registerCommand("codepure.getGodClassFix", async (document: vscode.TextDocument) => {
  await applyAIFix(document, "God Class detected, Suggest a fix using code only. Do not include explanations, comments, or markdown. Respond with valid Java code only.");
});

vscode.commands.registerCommand("codepure.getDataClassFix", async (document: vscode.TextDocument) => {
  await applyAIFix(document, "Data Class detected, Suggest a fix using code only. Do not include explanations, comments, or markdown. Respond with valid Java code only.");
});

async function applyAIFix(document: vscode.TextDocument, issue: string) {
  vscode.window.showInformationMessage("Fetching AI fix suggestion...");
  const sourceCode = document.getText();
  const enhancedIssue = `${issue} Respond with Java code only. No explanations, comments, or formatting.`;

  const fix = await getFixSuggestion(sourceCode, enhancedIssue);

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
}



// Define highlight styles
const wmcHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 255, 0, 0.4)", // Yellow for WMC
});

const locHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 105, 180, 0.3)", // Pink for LOC
});

const noamHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 105, 180, 0.3)", // Pink for NOAM (Accessors)
});

const wocHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(0, 255, 255, 0.4)", // Cyan for WOC
});

const tccHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(0, 255, 255, 0.3)", // Cyan for TCC
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

  const fileContent = fs.readFileSync(METRICS_FILE_PATH, "utf-8");
  const metricsData = JSON.parse(fileContent) as Array<{
    fullPath: string;
    metrics: { name: string; value: number }[];
  }>;

  // Find metrics for the current file
  const fileMetrics = metricsData.find(
    (entry) => entry.fullPath === document.fileName
  );
  if (!fileMetrics) {
    console.warn("No metrics found for file:", document.fileName);
    return;
  }

  // Extract LOC & WMC
  const LOC = fileMetrics.metrics.find((m) => m.name === "LOC")?.value || 0;
  const WMC = fileMetrics.metrics.find((m) => m.name === "WMC")?.value || 0;

  console.log("File Path:", METRICS_FILE_PATH);
  console.log("File Content:", fileContent);
  console.log("Found Metrics:", fileMetrics);
  console.log(`Extracted LOC: ${LOC}, WMC: ${WMC}`);

  const diagnostics: vscode.Diagnostic[] = [];
  const wmcRanges: vscode.Range[] = [];
  const locRanges: vscode.Range[] = [];

  // Apply highlighting rules
  if (LOC > 50) {
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
      if (
        /^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(
          lineText
        )
      ) {
        const functionRange = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, lineText.length)
        );

        wmcRanges.push(functionRange);

        const diagnostic = new vscode.Diagnostic(
          functionRange,
          " God Class Code Smell detected (Complex method contributing to high WMC)",
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
  const metricsData = JSON.parse(fileContent) as Array<{
    fullPath: string;
    metrics: { name: string; value: number }[];
  }>;

  const fileMetrics = metricsData.find(
    (entry) => entry.fullPath === document.fileName
  );
  if (!fileMetrics) {
    console.warn("No metrics found for file:", document.fileName);
    return;
  }

  const WOC = fileMetrics.metrics.find((m) => m.name === "WOC")?.value || 1;
  const NOPA = fileMetrics.metrics.find((m) => m.name === "NOPA")?.value || 0;
  const NOAM = fileMetrics.metrics.find((m) => m.name === "NOAM")?.value || 0;
  const WMC = fileMetrics.metrics.find((m) => m.name === "WMC")?.value || 100;

  console.log(
    `Extracted WOC: ${WOC}, NOPA: ${NOPA}, NOAM: ${NOAM}, WMC: ${WMC}`
  );

  const diagnostics: vscode.Diagnostic[] = [];
  const wmcRanges: vscode.Range[] = [];
  const noamRanges: vscode.Range[] = [];
  const wocRanges: vscode.Range[] = [];

  // === Find actual class declaration line ===
  let classDeclarationLine = -1;
  for (let i = 0; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text.trim();
    if (/^\s*(public\s+)?(class|record)\s+\w+/.test(lineText)) {
      classDeclarationLine = i;
      break;
    }
  }

  if (classDeclarationLine !== -1) {
    const classLineText = document.lineAt(classDeclarationLine).text;
    const classHeadRange = new vscode.Range(
      new vscode.Position(classDeclarationLine, 0),
      new vscode.Position(classDeclarationLine, classLineText.length)
    );
    wocRanges.push(classHeadRange);
    diagnostics.push(
      new vscode.Diagnostic(
        classHeadRange,
        "Data Class Code Smell detected: this class mainly holds state with minimal logic. Using a record or adding clear separation of concerns could improve clarity and maintainability",
        vscode.DiagnosticSeverity.Warning
      )
    );
  }

  // === Highlight accessor method heads (NOAM) ===
  for (let i = 0; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text.trim();

    if (
      /^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(
        lineText
      )
    ) {
      const functionRange = new vscode.Range(
        new vscode.Position(i, 0),
        new vscode.Position(i, lineText.length)
      );

      if (
        /^\s*(public|protected)\s+\w+\s+(get|set)[A-Z]\w*\s*\(.*\)\s*\{?/.test(
          lineText
        )
      ) {
        noamRanges.push(functionRange);
        diagnostics.push(
          new vscode.Diagnostic(
            functionRange,
            "Too many accessor methods (NOAM).",
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }
  }

  // Apply diagnostics
  diagnosticCollection.set(document.uri, diagnostics);

  // Apply highlights in active editor
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.toString() === document.uri.toString()) {
    // Clear previous highlights (optional safety)
    editor.setDecorations(wmcHighlightType, []);
    editor.setDecorations(noamHighlightType, []);
    editor.setDecorations(wocHighlightType, []);

    // Apply new ones
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

  const fileContent = fs.readFileSync(METRICS_FILE_PATH, "utf-8");
  const metricsData = JSON.parse(fileContent) as Array<{
    fullPath: string;
    metrics: { name: string; value: number }[];
  }>;

  const fileMetrics = metricsData.find(
    (entry) => entry.fullPath === document.fileName
  );
  if (!fileMetrics) {
    console.warn("No metrics found for file:", document.fileName);
    return;
  }

  const WMC = fileMetrics.metrics.find((m) => m.name === "WMC")?.value || 0;
  const TCC = fileMetrics.metrics.find((m) => m.name === "TCC")?.value || 1;

  console.log("Extracted WMC:", WMC, "TCC:", TCC);

  const diagnostics: vscode.Diagnostic[] = [];
  const wmcRanges: vscode.Range[] = [];
  const tccRanges: vscode.Range[] = [];

  // === NEW: Dynamically find class declaration ===
  let classDeclarationLine = -1;
  for (let i = 0; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text.trim();
    if (/^\s*(public\s+)?(class|record)\s+\w+/.test(lineText)) {
      classDeclarationLine = i;
      break;
    }
  }

  if (classDeclarationLine !== -1) {
    const classLineText = document.lineAt(classDeclarationLine).text;
    const classHeadRange = new vscode.Range(
      new vscode.Position(classDeclarationLine, 0),
      new vscode.Position(classDeclarationLine, classLineText.length)
    );
    tccRanges.push(classHeadRange);
    diagnostics.push(
      new vscode.Diagnostic(
        classHeadRange,
        "God Class detected: too many responsibilities. Consider breaking into smaller, focused classes. This class is trying to do everything—consider splitting it up for better separation of concerns.",
        vscode.DiagnosticSeverity.Warning
      )
    );
  }

  // Highlight methods for WMC (if too high)
  if (WMC >= 19) {
    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text.trim();
      if (
        /^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(
          lineText
        )
      ) {
        const functionRange = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, lineText.length)
        );
        wmcRanges.push(functionRange);
        diagnostics.push(
          new vscode.Diagnostic(
            functionRange,
            "High complexity contributes to a God Class (WMC ≥ 43.87)",
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }
  }

  // Set diagnostics and decorations
  diagnosticCollection.set(document.uri, diagnostics);
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.toString() === document.uri.toString()) {
    // Optional: clear old highlights
    editor.setDecorations(wmcHighlightType, []);
    editor.setDecorations(tccHighlightType, []);

    // Apply new ones
    editor.setDecorations(wmcHighlightType, wmcRanges);
    editor.setDecorations(tccHighlightType, tccRanges);
  }
}

async function getModelPredictions(
  document: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection
): Promise<void> {
  const serverManager = new ServerMetricsManager();

  // Send metrics file and get response
  const response = await serverManager.sendMetricsFile();

  if (!response || !response.predictions || response.predictions.length === 0) {
    console.log("No predictions received.");
    return;
  }

  // Extract the LAST prediction object
  const predictions = response.predictions[response.predictions.length - 1];

  // Check for each smell type and call the corresponding function if its value is 1
  if (predictions["Brain Class"] === 1) {
    console.log("Detected Brain Class");
    highlightBrainClassContributors(document, diagnosticCollection);
    await suggestBrainClassFix(document);
    response.predictions = [];
  }

  if (predictions["Data Class"] === 1) {
    console.log("Detected Data Class");
    highlightDataClass(document, diagnosticCollection);
    await suggestDataClassFix(document);
    response.predictions = [];
  }

  if (predictions["God Class"] === 1) {
    console.log("Detected God Class");
    highlightGodClassContributors(document, diagnosticCollection);
    await suggestGodClassFix(document);
    response.predictions = [];
  }

  // If no smells were detected (all values were 0)
  if (
    predictions["Brain Class"] === 0 &&
    predictions["Data Class"] === 0 &&
    predictions["God Class"] === 0 &&
    predictions["Schizofrenic Class"] === 0
  ) {
    console.log("No code smells detected.");
    response.predictions = [];
  }
}
