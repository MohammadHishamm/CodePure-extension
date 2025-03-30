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
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
const ViewProjectReport_1 = require("./ViewProjectReport");
const FeedbackViewProvider_1 = require("./FeedbackViewProvider");
const ViewUML_1 = require("./ViewUML");
const initialize_1 = require("./initialize");
let isActive = true;
function registerCommands(context) {
    const activateCommand = vscode.commands.registerCommand("extension.activateCommand", () => {
        if (!isActive) {
            isActive = true;
            vscode.window.showInformationMessage("CodePure is now active!");
        }
        else {
            vscode.window.showWarningMessage("CodePure is already active!");
        }
    });
    const deactivateCommand = vscode.commands.registerCommand("extension.deactivateCommand", () => {
        if (isActive) {
            isActive = false;
            vscode.window.showInformationMessage("CodePure Deactivated!");
        }
        else {
            vscode.window.showWarningMessage("CodePure is not active!");
        }
    });
    // Register the feedback command
    const feedbackCommand = vscode.commands.registerCommand("codepure.provideFeedback", () => (0, FeedbackViewProvider_1.provideFeedbackCommand)());
    const analyzeSelectedCodeCommand = vscode.commands.registerCommand("extension.analyzeSelectedCode", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No active editor found!");
            return;
        }
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (!selectedText) {
            vscode.window.showInformationMessage("No text selected!");
            return;
        }
        vscode.window.showInformationMessage(`Current selected metrics: ${(0, utils_1.getSelectedMetrics)().join(", ")}`);
    });
    const openSettingsCommand = vscode.commands.registerCommand("codepure.openSettings", () => {
        vscode.commands.executeCommand("workbench.action.openSettings", "CodePure");
    });
    const showDashboardCommand = vscode.commands.registerCommand("extension.showDashboard", () => {
        ViewProjectReport_1.DashboardPanel.show(context.extensionUri);
    });
    const showUMLCommand = vscode.commands.registerCommand("extension.ViewUML", async () => {
        await initialize_1.FECFcode.parseAllJavaFiles();
        ViewUML_1.UMLDashboard.show(initialize_1.FECFcode.getAllParsedComponents());
    });
    context.subscriptions.push(activateCommand, showUMLCommand, deactivateCommand, analyzeSelectedCodeCommand, openSettingsCommand, showDashboardCommand, feedbackCommand);
}
//# sourceMappingURL=commands.js.map