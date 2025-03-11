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
exports.CustomTreeProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const TreeItem_1 = require("./TreeItem");
const GithubAPI_1 = require("./services/GithubAPI");
class CustomTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    treeItems = [];
    isAuthenticated = false;
    GithubApi;
    constructor() {
        this.GithubApi = new GithubAPI_1.GitHubAPI();
        vscode.commands.registerCommand("extension.connectGitHub", this.authenticateWithGitHub, this);
        vscode.commands.registerCommand("extension.clearHistory", this.clearHistory, this);
        vscode.commands.registerCommand("extension.syncDatabase", this.syncWithDatabase, this);
        this.checkAuthentication();
    }
    async checkAuthentication() {
        try {
            const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: false });
            this.isAuthenticated = !!session;
            if (!this.isAuthenticated) {
                this.treeItems = [this.createSignInItem()];
            }
            console.log("GithubAPI: isAuthenticated");
            this.refresh();
        }
        catch (error) {
            console.error("Error checking GitHub authentication:", error);
        }
    }
    async authenticateWithGitHub() {
        try {
            const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: true });
            if (!session) {
                vscode.window.showErrorMessage("GitHub authentication failed or was cancelled.");
                return;
            }
            console.log("GitHub authentication successful!");
            this.isAuthenticated = true;
            this.refresh();
        }
        catch (error) {
            console.error("Error during GitHub authentication:", error);
            vscode.window.showErrorMessage(`GitHub authentication error: ${error}`);
        }
    }
    createSignInItem() {
        const signInItem = new TreeItem_1.TreeItem("Sign in to GitHub", [], vscode.TreeItemCollapsibleState.None);
        signInItem.command = {
            command: "extension.connectGitHub",
            title: "Sign in to GitHub",
            tooltip: "Click to authenticate with GitHub",
        };
        signInItem.iconPath = new vscode.ThemeIcon("sign-in");
        return signInItem;
    }
    async fetchMetricsData() {
        let filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");
        filePath = filePath.replace(/out[\\\/]?/, "");
        console.log(`Fetching metrics from: ${filePath}`);
        if (!fs.existsSync(filePath)) {
            console.error("Metrics file does not exist.");
            return [new TreeItem_1.TreeItem("No metrics to fetch", [], vscode.TreeItemCollapsibleState.None)];
        }
        try {
            const data = fs.readFileSync(filePath, "utf8");
            if (data.trim().length === 0) {
                console.log("No metrics found in file.");
                return [new TreeItem_1.TreeItem("No metrics to fetch", [], vscode.TreeItemCollapsibleState.None)];
            }
            const metricsData = JSON.parse(data);
            if (metricsData.length === 0) {
                console.log("No metrics data available.");
                return [new TreeItem_1.TreeItem("No metrics to fetch", [], vscode.TreeItemCollapsibleState.None)];
            }
            const metricItems = metricsData.map((item) => {
                const fileUri = vscode.Uri.file(item.fullPath); // Ensure item.fullPath contains the absolute path
                const fileMetrics = item.metrics.map((metric) => new TreeItem_1.TreeItem(`${metric.name}: ${metric.value}`, [], vscode.TreeItemCollapsibleState.None));
                const folderItem = new TreeItem_1.TreeItem(`${item.folderName}`, fileMetrics, vscode.TreeItemCollapsibleState.Collapsed);
                folderItem.command = {
                    command: "vscode.open",
                    title: `Open ${item.folderName}`,
                    tooltip: `Click to open ${item.fullPath}`,
                    arguments: [fileUri] // Pass the file path to open
                };
                return folderItem;
            });
            const clearHistoryItem = new TreeItem_1.TreeItem("🗑️ Clear All History", [], vscode.TreeItemCollapsibleState.None);
            clearHistoryItem.command = {
                command: "extension.clearHistory",
                title: "Clear All History",
                tooltip: "Click to clear the metrics history",
            };
            return [...metricItems, clearHistoryItem];
        }
        catch (err) {
            console.error("Error reading or parsing metrics file:", err);
            return [new TreeItem_1.TreeItem("Error fetching metrics", [], vscode.TreeItemCollapsibleState.None)];
        }
    }
    update(metricsData) {
        console.log(`Observer notified: Metrics updated with ${metricsData.length} items.`);
        this.fetchMetricsData().then((items) => {
            this.treeItems = items;
            this.refresh();
        });
    }
    async getChildren(element) {
        const feedbackItem = new TreeItem_1.TreeItem("📝 Provide Feedback", [], vscode.TreeItemCollapsibleState.None);
        feedbackItem.command = {
            command: "codepure.provideFeedback",
            title: "Provide Feedback",
            tooltip: "Click to provide feedback"
        };
        const viewReportItem = new TreeItem_1.TreeItem("📈 View Project Report", [], vscode.TreeItemCollapsibleState.None);
        viewReportItem.command = {
            command: "extension.showDashboard",
            title: "View Project Report",
            tooltip: "Click to view the report"
        };
        const helpItem = new TreeItem_1.TreeItem("Need Help ?", [], vscode.TreeItemCollapsibleState.None);
        helpItem.command = {
            command: "vscode.open",
            title: "Open Help Page",
            tooltip: "Click to get help",
            arguments: ["https://codepure-vs.vercel.app/doc.html"]
        };
        if (!element) {
            return Promise.resolve([
                new TreeItem_1.TreeItem("📊 Metrics Data", [], vscode.TreeItemCollapsibleState.Collapsed),
                new TreeItem_1.TreeItem("📂 Current GitHub Repository", [], vscode.TreeItemCollapsibleState.Collapsed),
                feedbackItem,
                viewReportItem,
                helpItem
            ]);
        }
        if (element.label === "📊 Metrics Data") {
            return this.fetchMetricsData();
        }
        if (element.label === "📂 Current GitHub Repository") {
            return this.GithubApi.fetchRepositoriesTreeItems();
        }
        return Promise.resolve(element.children || []);
    }
    async syncWithDatabase(owner) {
        try {
            const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: false });
            if (!session) {
                vscode.window.showErrorMessage("GitHub authentication required for syncing.");
                return;
            }
            const currentUser = session.account.label;
            if (currentUser !== owner) {
                vscode.window.showErrorMessage("Only the repository owner can sync with the database.");
                return;
            }
            const reason = "Syncing will allow CodePure to analyze and store code smell metrics, making them available for all repository users.";
            const userChoice = await vscode.window.showInformationMessage(`${reason}\n\nDo you want to proceed with the sync?`, { modal: true }, "Yes", "No");
            if (userChoice !== "Yes") {
                vscode.window.showInformationMessage("Sync canceled.");
                return;
            }
            vscode.window.showInformationMessage("Syncing with the database...");
            const currentRepo = await this.GithubApi.getCurrentRepository();
            if (!currentRepo) {
                vscode.window.showErrorMessage("No repository found to sync.");
                return;
            }
            vscode.window.showInformationMessage(`Successfully synced ${currentRepo} with the database.`);
        }
        catch (error) {
            console.error("Sync error:", error);
            vscode.window.showErrorMessage("An error occurred while syncing with the database.");
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async clearHistory() {
        const reason = "Clearing history will remove all saved metrics from your project permanently.";
        const userChoice = await vscode.window.showInformationMessage(`${reason}\n\nDo you want to proceed with clearing the history?`, { modal: true }, "Yes", "No");
        if (userChoice !== "Yes") {
            vscode.window.showInformationMessage("Metrics history was not cleared.");
            return;
        }
        let filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");
        filePath = filePath.replace(/out[\\\/]?/, "");
        try {
            fs.writeFileSync(filePath, JSON.stringify([]));
            console.log("Metrics history cleared.");
            vscode.window.showInformationMessage("All metrics history has been cleared.");
            this.treeItems = [];
            this.refresh();
        }
        catch (err) {
            console.error("Error clearing metrics history file:", err);
            vscode.window.showErrorMessage("Error clearing metrics history.");
        }
    }
}
exports.CustomTreeProvider = CustomTreeProvider;
//# sourceMappingURL=dashboard.js.map