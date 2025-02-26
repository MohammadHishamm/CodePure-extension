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
const initialize_1 = require("../initialize");
const utils_1 = require("../utils");
const GoogleGemini_AI_1 = require("../Services/GoogleGemini_AI");
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
        const diagnostic = new vscode.Diagnostic(fullRange, "Potential Brain Class detected. AI can suggest a fix.", vscode.DiagnosticSeverity.Warning);
        diagnostic.code = "brainClass";
        diagnostic.source = "CodePure";
        diagnostics.push(diagnostic);
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
//# sourceMappingURL=AnalyzeCode.js.map