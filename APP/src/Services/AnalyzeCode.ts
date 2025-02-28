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
          highlightBrainClassContributors(document,diagnosticCollection);
          findFieldDeclarationLines(document);
          findExternalCouplingLines(document);
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

const noaHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 255, 0, 0.4)" // Yellow
});

const cboHighlightType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 105, 180, 0.3)" // Pink
});


async function highlightBrainClassContributors(
  document: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection
): Promise<void> {
  const diagnostics: vscode.Diagnostic[] = [];
  const noaRanges: vscode.Range[] = [];
  const cboRanges: vscode.Range[] = [];
  
  // Find lines with field declarations (contributing to NOA)
  const fieldLines = findFieldDeclarationLines(document);
  
  // Find lines with external dependencies (contributing to CBO)
  const couplingLines = findExternalCouplingLines(document);
  
  // Create diagnostics and collect ranges for NOA
  for (const line of fieldLines) {
    const lineRange = new vscode.Range(
      new vscode.Position(line, 0),
      new vscode.Position(line, document.lineAt(line).text.length)
    );

    noaRanges.push(lineRange); // Collect range for highlighting
    
    const diagnostic = new vscode.Diagnostic(
      lineRange,
      "Field declaration contributing to high NOA (Number of Attributes)",
      vscode.DiagnosticSeverity.Warning
    );
    
    diagnostic.code = "brainClass.NOA";
    diagnostic.source = "CodePure";
    diagnostics.push(diagnostic);
  }
  
  // Create diagnostics and collect ranges for CBO
  for (const line of couplingLines) {
    const lineRange = new vscode.Range(
      new vscode.Position(line, 0),
      new vscode.Position(line, document.lineAt(line).text.length)
    );

    cboRanges.push(lineRange); // Collect range for highlighting
    
    const diagnostic = new vscode.Diagnostic(
      lineRange,
      "External coupling contributing to high CBO (Coupling Between Objects)",
      vscode.DiagnosticSeverity.Warning
    );
    
    diagnostic.code = "brainClass.CBO";
    diagnostic.source = "CodePure";
    diagnostics.push(diagnostic);
  }

  // Set diagnostics for underlining & Problems panel
  diagnosticCollection.set(document.uri, diagnostics);

  // Apply decorations for selection-style highlighting
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.toString() === document.uri.toString()) {
    editor.setDecorations(noaHighlightType, noaRanges);
editor.setDecorations(cboHighlightType, cboRanges);
  }
}


/**
 * Finds lines in the document that contain field declarations
 * which contribute to a high NOA (Number of Attributes)
 */
function findFieldDeclarationLines(document: vscode.TextDocument): number[] {
  const fieldLines: number[] = [];
  const text = document.getText();
  const lines = text.split('\n');
  
  // Regular expressions for different programming languages
  // These patterns will need to be adjusted based on the languages you support
  const patterns = {
    java: /^\s*(private|protected|public)?\s+\w+\s+\w+(\s*=.*)?\s*;/,
    typescript: /^\s*(private|protected|public)?\s+\w+(\s*:\s*\w+)?(\s*=.*)?\s*;?/,
    csharp: /^\s*(private|protected|public|internal)?\s+\w+\s+\w+(\s*=.*)?\s*;/,
    // Add patterns for other languages as needed
  };
  
  // Determine the language of the document
  const languageId = document.languageId;
  const pattern = patterns["java"] || patterns.java; // Default to Java pattern
  
  // Find field declarations
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      fieldLines.push(i);
    }
  }
  
  return fieldLines;
}

/**
 * Finds lines in the document that show coupling to other objects
 * which contribute to a high CBO (Coupling Between Objects)
 */
function findExternalCouplingLines(document: vscode.TextDocument): number[] {
  const couplingLines: number[] = [];
  const text = document.getText();
  const lines = text.split('\n');
  
  // Find class name
  const classNameMatch = /class\s+(\w+)/.exec(text);
  const className = classNameMatch ? classNameMatch[1] : '';
  
  // Find imports and dependencies
  const importPattern = /import\s+([^;]+);/g;
  const imports: string[] = [];
  let match;
  while ((match = importPattern.exec(text)) !== null) {
    imports.push(match[1].trim().split('.').pop()!); // Get the class name from import
  }
  
  // Find external type usages and method calls
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip import lines
    if (line.trim().startsWith('import ')) {
      continue;
    }
    
    // Check for usage of imported types
    const containsExternalType = imports.some(importName => {
      const regex = new RegExp(`\\b${importName}\\b`);
      return regex.test(line) && !line.includes(`class ${importName}`);
    });
    
    // Check for method calls on other objects
    const methodCallPattern = /\b\w+\.\w+\(/;
    const containsMethodCall = methodCallPattern.test(line);
    
    if (containsExternalType || containsMethodCall) {
      couplingLines.push(i);
    }
  }
  
  return couplingLines;
}