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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const initialize_1 = require("./initialize");
const commands_1 = require("./commands");
const events_1 = require("./events");
const AnalyzeCode_1 = require("./services/AnalyzeCode");
// Import the cleanup function
async function activate(context) {
    console.time("Extension Execution Time");
    // Initialize extension components
    (0, initialize_1.initializeExtension)(context);
    // Register commands
    (0, commands_1.registerCommands)(context);
    // Handle events (e.g., file save)
    (0, events_1.handleEvents)(context);
    // Register Tree View
    vscode.window.registerTreeDataProvider("codepureTreeView", initialize_1.customTreeProvider);
    console.timeEnd("Extension Execution Time");
}
async function deactivate() {
    // Clean up all metrics JSON files
    (0, AnalyzeCode_1.cleanupMetricsFiles)();
    // Keep the existing FECF cleanup
    await initialize_1.FECFcode.deleteAllResultsFiles();
    console.log("CodePure extension is now deactivated and all metrics files cleaned up.");
}
//# sourceMappingURL=extension.js.map