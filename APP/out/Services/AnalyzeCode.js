"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCode = analyzeCode;
const vscode = __importStar(require("vscode"));
const MetricsFactory_1 = require("../Factory/MetricsFactory");
const ServerMetricsManager_1 = require("./ServerMetricsManager"); // Ensure correct import path
const initialize_1 = require("../initialize");
const utils_1 = require("../utils");
const GoogleGemini_AI_1 = require("./GoogleGemini_AI");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let isAnalyzing = false;
const diagnosticCollection = vscode.languages.createDiagnosticCollection("codepure");
async function analyzeCode(document, sourceCode) {
    if (isAnalyzing) {
        vscode.window.showInformationMessage("Analysis is already running. Please wait...");
        return "Analysis in progress";
    }
    isAnalyzing = true;
    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Analyzing ${document.languageId} code`,
        cancellable: false,
    }, async (progress) => {
        const parser = document.languageId === "java" ? new initialize_1.javaParser() : new initialize_1.pythonParser();
        parser.selectLanguage();
        const rootNode = parser.parse(sourceCode);
        const metricsToCalculate = [
            "LOC", "AMW", "CBO", "FDP", "DAC", "WMC", "WOC", "NOA",
            "NOM", "NOAM", "NOPA", "NAbsm", "NProtM", "NAS", "PNAS",
            "TCC", "DIT",
        ];
        try {
            progress.report({ message: "Initializing parser...", increment: 10 });
            await (0, utils_1.pause)(500);
            progress.report({ message: "Parsing source code...", increment: 20 });
            await (0, utils_1.pause)(500);
            progress.report({
                message: "Extracting Components From Code...",
                increment: 30,
            });
            await (0, utils_1.pause)(500);
            await initialize_1.FECFcode.parseAllJavaFiles();
            const results = await calculateMetricsWithProgress(document, rootNode, sourceCode, document.languageId, metricsToCalculate, progress);
            if (results) {
                vscode.window.showInformationMessage("Analysis is Finished.");
                initialize_1.servermetricsmanager.sendMetricsFile();
                // Detect code smells and suggest AI fixes
                detectAndSuggestFixes(document, results);
                // highlightBrainClassContributors(document,diagnosticCollection);
                // highlightDataClass(document,diagnosticCollection);
                // highlightGodClassContributors(document,diagnosticCollection);
                getModelPredictions(document, diagnosticCollection);
            }
            else {
                vscode.window.showInformationMessage("Error Occurred While Analyzing.");
            }
            return results;
        }
        finally {
            isAnalyzing = false;
        }
    });
}
async function calculateMetricsWithProgress(document, rootNode, sourceCode, languageId, metrics, progress) {
    const results = [];
    for (const [index, metricName] of metrics.entries()) {
        const metricCalculator = MetricsFactory_1.MetricsFactory.CreateMetric(metricName, languageId);
        if (metricCalculator) {
            const value = metricCalculator.calculate(rootNode, initialize_1.FECFcode, document.fileName);
            results.push(`${metricName}: ${value}`);
            // Update progress
            progress.report({
                message: `Calculating ${metricName}...`,
                increment: 70 / metrics.length,
            });
            await (0, utils_1.pause)(300);
        }
    }
    initialize_1.metricsSaver.saveMetrics(results.map((result) => {
        const [name, value] = result.split(": ");
        return { name, value: parseFloat(value) };
    }), document.fileName);
    return results.join("\n");
}
async function detectAndSuggestFixes(document, results) {
    const diagnostics = [];
    if (results.includes("WMC") && results.includes("LOC")) {
        const fullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length));
        // const diagnostic = new vscode.Diagnostic(
        //   fullRange,
        //   "Potential Brain Class detected. AI can suggest a fix.",
        //   vscode.DiagnosticSeverity.Warning
        // );
        // diagnostic.code = "brainClass";
        // diagnostic.source = "CodePure";
        // diagnostics.push(diagnostic);
        // Show notification with Quick AI Fix button
        vscode.window.showInformationMessage("CodePure detected a Brain Class! Want to apply a Quick AI Fix?", "✨ Quick AI Fix").then((selection) => {
            if (selection === "✨ Quick AI Fix") {
                vscode.commands.executeCommand("codepure.getAIFix", document);
            }
        });
    }
    diagnosticCollection.set(document.uri, diagnostics);
}
vscode.languages.registerCodeActionsProvider("*", {
    provideCodeActions(document, range, context, token) {
        const actions = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.code === "brainClass") {
                const fixAction = new vscode.CodeAction("CodePure: ✨ Apply AI Fix for Brain Class", vscode.CodeActionKind.QuickFix);
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
vscode.commands.registerCommand("codepure.getAIFix", async (document) => {
    if (!document)
        return;
    vscode.window.showInformationMessage("Fetching AI fix suggestion...");
    const sourceCode = document.getText();
    const issue = "Brain Class detected, suggest a fix.";
    const fix = await (0, GoogleGemini_AI_1.getFixSuggestion)(sourceCode, issue);
    if (fix) {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount, 0));
        edit.replace(document.uri, fullRange, fix);
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage("AI Fix applied!");
    }
    else {
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
let METRICS_FILE_PATH = path.join(__dirname, "..", "..", "src", "Results", "MetricsCalculated.json");
async function highlightBrainClassContributors(document, diagnosticCollection) {
    if (!fs.existsSync(METRICS_FILE_PATH)) {
        console.error("Metrics JSON file not found:", METRICS_FILE_PATH);
        return;
    }
    const fileContent = fs.readFileSync(METRICS_FILE_PATH, 'utf-8');
    const metricsData = JSON.parse(fileContent);
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
    const diagnostics = [];
    const wmcRanges = [];
    const locRanges = [];
    // Apply highlighting rules
    if (LOC > 50) {
        const classHeadRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, document.lineAt(0).text.length));
        locRanges.push(classHeadRange);
        const diagnostic = new vscode.Diagnostic(classHeadRange, "Try to make lines more less (LOC > 351)", vscode.DiagnosticSeverity.Warning);
        diagnostic.code = "brainClass.LOC";
        diagnostic.source = "CodePure";
        diagnostics.push(diagnostic);
    }
    if (WMC > 15) {
        // Iterate over lines and find method headers to highlight
        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text.trim();
            if (/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(lineText)) {
                const functionRange = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lineText.length));
                wmcRanges.push(functionRange);
                const diagnostic = new vscode.Diagnostic(functionRange, "Complex method contributing to high WMC (> 87)", vscode.DiagnosticSeverity.Warning);
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
async function highlightDataClass(document, diagnosticCollection) {
    if (!fs.existsSync(METRICS_FILE_PATH)) {
        console.error("Metrics JSON file not found:", METRICS_FILE_PATH);
        return;
    }
    const fileContent = fs.readFileSync(METRICS_FILE_PATH, "utf-8");
    const metricsData = JSON.parse(fileContent);
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
    const diagnostics = [];
    const wmcRanges = [];
    const noamRanges = [];
    const wocRanges = [];
    // Check Data Class conditions
    if (WOC < 0.333 || (NOPA + NOAM) > 2 || WMC < 29) {
        // Highlight class head for WOC
        const classHeadRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, document.lineAt(0).text.length));
        wocRanges.push(classHeadRange);
        diagnostics.push(new vscode.Diagnostic(classHeadRange, "Try to make the weight less (WOC < 0.333).", vscode.DiagnosticSeverity.Warning));
        // Highlight method heads for WMC
        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text.trim();
            // Detect method heads (functions)
            if (/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(lineText)) {
                const functionRange = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lineText.length));
                if (WMC > 0) {
                    wmcRanges.push(functionRange);
                    diagnostics.push(new vscode.Diagnostic(functionRange, "Try to make complexity less in this function (WMC).", vscode.DiagnosticSeverity.Warning));
                }
                // Detect accessor methods (getters/setters)
                if (/^\s*(public|protected)\s+\w+\s+(get|set)[A-Z]\w*\s*\(.*\)\s*\{?/.test(lineText)) {
                    noamRanges.push(functionRange);
                    diagnostics.push(new vscode.Diagnostic(functionRange, "Too much accessor methods (NOAM).", vscode.DiagnosticSeverity.Warning));
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
async function highlightGodClassContributors(document, diagnosticCollection) {
    if (!fs.existsSync(METRICS_FILE_PATH)) {
        console.error("Metrics JSON file not found:", METRICS_FILE_PATH);
        return;
    }
    const fileContent = fs.readFileSync(METRICS_FILE_PATH, 'utf-8');
    const metricsData = JSON.parse(fileContent);
    const fileMetrics = metricsData.find(entry => entry.fullPath === document.fileName);
    if (!fileMetrics) {
        console.warn("No metrics found for file:", document.fileName);
        return;
    }
    const WMC = fileMetrics.metrics.find(m => m.name === "WMC")?.value || 0;
    const TCC = fileMetrics.metrics.find(m => m.name === "TCC")?.value || 1;
    console.log("Extracted WMC:", WMC, "TCC:", TCC);
    const diagnostics = [];
    const wmcRanges = [];
    const tccRanges = [];
    if (TCC < 0.333) {
        const classHeadRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, document.lineAt(0).text.length));
        tccRanges.push(classHeadRange);
        diagnostics.push(new vscode.Diagnostic(classHeadRange, "Low cohesion contributes to a God Class (TCC < 0.333)", vscode.DiagnosticSeverity.Warning));
    }
    if (WMC >= 19) {
        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text.trim();
            if (/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(lineText)) {
                const functionRange = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lineText.length));
                wmcRanges.push(functionRange);
                diagnostics.push(new vscode.Diagnostic(functionRange, "High complexity contributes to a God Class (WMC ≥ 43.87)", vscode.DiagnosticSeverity.Warning));
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
async function getModelPredictions(document, diagnosticCollection) {
    const serverManager = new ServerMetricsManager_1.ServerMetricsManager();
    // Send metrics file and get response
    const response = await serverManager.sendMetricsFile();
    if (!response || !response.predictions || response.predictions.length === 0) {
        console.log("No predictions received.");
        return;
    }
    // Extract the first predictions object
    const predictions = response.predictions[0];
    // Check for each smell type and call the corresponding function if its value is 1
    if (predictions["Brain Class"] === 1) {
        console.log("Detected Brain Class");
        highlightBrainClassContributors(document, diagnosticCollection);
    }
    if (predictions["Data Class"] === 1) {
        console.log("Detected Data Class");
        highlightDataClass(document, diagnosticCollection);
    }
    if (predictions["God Class"] === 1) {
        console.log("Detected God Class");
        highlightGodClassContributors(document, diagnosticCollection);
    }
    // If no smells were detected (all values were 0)
    if (predictions["Brain Class"] === 0 &&
        predictions["Data Class"] === 0 &&
        predictions["God Class"] === 0 &&
        predictions["Schizofrenic Class"] === 0) {
        console.log("No code smells detected.");
    }
}
//# sourceMappingURL=AnalyzeCode.js.map