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
exports.javaParser = exports.pythonParser = exports.statusBarItem = exports.outputChannel = exports.customTreeProvider = exports.metricsSaver = exports.metricsNotifier = exports.servermetricsmanager = exports.FECFcode = void 0;
exports.initializeExtension = initializeExtension;
const vscode = __importStar(require("vscode"));
const MetricsNotifier_1 = require("./Core/MetricsNotifier");
const MetricsSaver_1 = require("./Saver/MetricsSaver");
const dashboard_1 = require("./dashboard");
const FolderExtractComponentsFromCode_1 = require("./Extractors/FolderExtractComponentsFromCode");
const javaParser_1 = require("./Languages/javaParser");
Object.defineProperty(exports, "javaParser", { enumerable: true, get: function () { return javaParser_1.javaParser; } });
const pythonParser_1 = require("./Languages/pythonParser");
Object.defineProperty(exports, "pythonParser", { enumerable: true, get: function () { return pythonParser_1.pythonParser; } });
const ServerMetricsManager_1 = require("./Services/ServerMetricsManager");
exports.FECFcode = new FolderExtractComponentsFromCode_1.FolderExtractComponentsFromCode();
exports.servermetricsmanager = new ServerMetricsManager_1.ServerMetricsManager();
exports.metricsNotifier = new MetricsNotifier_1.MetricsNotifier();
exports.metricsSaver = new MetricsSaver_1.MetricsSaver(exports.metricsNotifier);
exports.customTreeProvider = new dashboard_1.CustomTreeProvider();
exports.metricsNotifier.addObserver(exports.customTreeProvider);
// Shared components
exports.outputChannel = vscode.window.createOutputChannel("CodePure Output");
exports.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
// Initialization function
function initializeExtension(context) {
    console.log("Initializing CodePure...");
    exports.servermetricsmanager.checkServerStatus();
    vscode.window.showInformationMessage("CodePure is now active! Use 'Ctrl+S' to detect CodeSmells.");
    exports.statusBarItem.text = "CodePure: Ready";
    exports.statusBarItem.show();
    context.subscriptions.push(exports.outputChannel, exports.statusBarItem);
}
//# sourceMappingURL=initialize.js.map