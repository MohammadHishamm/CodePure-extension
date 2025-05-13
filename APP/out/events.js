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
exports.handleEvents = handleEvents;
const vscode = __importStar(require("vscode"));
const AnalyzeCode_1 = require("./services/AnalyzeCode");
const ProblemsChecker_1 = require("./services/ProblemsChecker");
const SupportedFileTypes_1 = require("./services/SupportedFileTypes");
function handleEvents(context) {
    vscode.workspace.onDidSaveTextDocument(async (document) => {
        const problemsChecker = new ProblemsChecker_1.ProblemsChecker(document);
        const isSupportedfiletype = new SupportedFileTypes_1.isSupportedFileType(document);
        const sourceCode = document.getText();
        if (sourceCode.trim() === "") {
            vscode.window.showWarningMessage("File is Empty:", document.fileName);
            console.warn("File is Empty", document.fileName);
            return;
        }
        else if (document.lineCount < 10) {
            vscode.window.showWarningMessage("File too small to analyze for code smells:", document.fileName);
            console.warn("File too small to analyze for code smells:", document.fileName);
            return;
        }
        if (!problemsChecker.checkForErrors() &&
            isSupportedfiletype.isSupported()) {
            await (0, AnalyzeCode_1.analyzeCode)(document, sourceCode);
        }
    });
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("extension.selectedMetrics")) {
            const updatedMetrics = vscode.workspace
                .getConfiguration("codepure")
                .get("selectedMetrics", []);
            vscode.window.showInformationMessage(`Metrics updated: ${updatedMetrics.join(", ")}`);
        }
    });
}
//# sourceMappingURL=events.js.map