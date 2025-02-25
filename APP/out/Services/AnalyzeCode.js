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
exports.AnalyzeSelctedCode = AnalyzeSelctedCode;
const vscode = __importStar(require("vscode"));
const MetricsFactory_1 = require("../Factory/MetricsFactory");
const initialize_1 = require("../initialize");
const utils_1 = require("../utils");
let isAnalyzing = false;
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
            "LOC",
            "AMW",
            "CBO",
            // "ATFD",
            "FDP",
            // "LAA",
            // "NrFE",
            // "CBO",
            "DAC",
            "WMC",
            "WOC",
            "NOA",
            "NOM",
            "NOAM",
            "NOPA",
            "NAbsm",
            "NProtM",
            // "FANOUT",
            // "NDU",
            "NAS",
            "PNAS",
            // "BUR",
            // "NOD",
            // "NODD",
            "TCC",
            "DIT",
        ];
        try {
            progress.report({ message: "Initializing parser...", increment: 10 });
            await (0, utils_1.pause)(500); // Simulate processing delay
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
            }
            else {
                vscode.window.showInformationMessage("Error Occured While Analyzing.");
            }
            return results;
        }
        finally {
            isAnalyzing = false;
        }
    });
}
async function AnalyzeSelctedCode(document, sourceCode) {
    if (isAnalyzing) {
        vscode.window.showInformationMessage("Analysis is already running. Please wait...");
        return "Analysis in progress";
    }
    isAnalyzing = true;
    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Analyzing Selected code in ${document.languageId}`,
        cancellable: false,
    }, async (progress) => {
        const parser = document.languageId === "java" ? new initialize_1.javaParser() : new initialize_1.pythonParser();
        parser.selectLanguage();
        const rootNode = parser.parse(sourceCode);
        const metricsToCalculate = vscode.workspace
            .getConfiguration("codepure")
            .get("selectedMetrics", []);
        try {
            progress.report({ message: "Initializing parser...", increment: 10 });
            await (0, utils_1.pause)(500); // Simulate processing delay
            progress.report({ message: "Parsing source code...", increment: 20 });
            await (0, utils_1.pause)(500);
            const results = await calculateMetricsWithProgress(document, rootNode, sourceCode, document.languageId, metricsToCalculate, progress);
            initialize_1.servermetricsmanager.sendMetricsFile();
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
                increment: 70 / metrics.length, // Distribute remaining progress evenly
            });
            await (0, utils_1.pause)(300); // Simulate delay for each metric
        }
    }
    initialize_1.metricsSaver.saveMetrics(results.map((result) => {
        const [name, value] = result.split(": ");
        return { name, value: parseFloat(value) };
    }), document.fileName);
    return results.join("\n");
}
//# sourceMappingURL=AnalyzeCode.js.map