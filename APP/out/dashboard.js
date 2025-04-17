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
const ServerMetricsManager_1 = require("./services/ServerMetricsManager");
const MongoDB_1 = require("./services/MongoDB"); // Adjust the path as needed
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
        // Set up file system watcher for the Results directory
        const resultsDir = path
            .join(__dirname, "..", "src", "Results")
            .replace(/out[\\\/]?/, "");
        if (fs.existsSync(resultsDir)) {
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(resultsDir, "*.json"));
            // When a file is created or changed
            watcher.onDidCreate(() => this.refresh());
            watcher.onDidChange(() => this.refresh());
            watcher.onDidDelete(() => this.refresh());
        }
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
        let resultsDir = path
            .join(__dirname, "..", "src", "Results")
            .replace(/out[\\\/]?/, "");
        console.log(`Fetching metrics from directory: ${resultsDir}`);
        if (!fs.existsSync(resultsDir)) {
            console.error("Results directory does not exist.");
            return [
                new TreeItem_1.TreeItem("No metrics data available", [], vscode.TreeItemCollapsibleState.None),
            ];
        }
        try {
            // Always read the directory fresh to get the current files
            console.log(`Reading directory contents of: ${resultsDir}`);
            const allFiles = fs.readdirSync(resultsDir);
            console.log(`All files in directory: ${allFiles.join(", ")}`);
            // Get all JSON files in the Results directory
            const files = allFiles.filter((file) => file.endsWith(".json"));
            if (files.length === 0) {
                console.log("No metrics files found in directory.");
                return [
                    new TreeItem_1.TreeItem("No metrics data available", [], vscode.TreeItemCollapsibleState.None),
                ];
            }
            console.log(`Found ${files.length} metrics files: ${files.join(", ")}`);
            // Array to hold all metrics data
            const allMetricsData = [];
            // Read and parse each JSON file
            for (const file of files) {
                const filePath = path.join(resultsDir, file);
                try {
                    console.log(`Reading file: ${file}`);
                    const fileContent = fs.readFileSync(filePath, "utf8");
                    if (fileContent.trim().length === 0) {
                        console.log(`Empty file: ${file}`);
                        continue;
                    }
                    const metricsData = JSON.parse(fileContent);
                    console.log(`Successfully parsed ${file}`);
                    // Validate the structure we need
                    if (metricsData.fullPath &&
                        metricsData.folderName &&
                        Array.isArray(metricsData.metrics)) {
                        allMetricsData.push(metricsData);
                    }
                    else {
                        console.log(`Invalid metrics structure in file: ${file}`);
                    }
                }
                catch (parseError) {
                    console.error(`Error reading or parsing file ${file}:`, parseError);
                }
            }
            if (allMetricsData.length === 0) {
                console.log("No valid metrics data found in any files.");
                return [
                    new TreeItem_1.TreeItem("No valid metrics data available", [], vscode.TreeItemCollapsibleState.None),
                ];
            }
            console.log(`Successfully loaded ${allMetricsData.length} metrics records`);
            // Send metrics to server for predictions (if you need this functionality)
            const serverManager = new ServerMetricsManager_1.ServerMetricsManager();
            const response = await serverManager.sendMetricsFile();
            // Create tree items for each metrics file
            const metricItems = allMetricsData.map((item, index) => {
                const fileUri = vscode.Uri.file(item.fullPath);
                const fileName = path.basename(item.fullPath);
                const fileMetrics = item.metrics.map((metric) => new TreeItem_1.TreeItem(`🔎 ${metric.name}: ${metric.value}`, [], vscode.TreeItemCollapsibleState.None));
                // Get predictions for this file if available
                const filePrediction = response?.predictions?.[index] || {};
                // Filter and display detected code smells
                const detectedSmells = Object.entries(filePrediction)
                    .filter(([_, value]) => value === 1) // Only include detected smells (value = 1)
                    .map(([smell, _]) => new TreeItem_1.TreeItem(`⚠️ ${smell}: ‼️ Detected ‼️`, [], vscode.TreeItemCollapsibleState.None));
                // If no code smells were detected, add a "No Code Smells" message
                if (detectedSmells.length === 0) {
                    detectedSmells.push(new TreeItem_1.TreeItem("✅ No code smells ✅", [], vscode.TreeItemCollapsibleState.None));
                }
                // Create a tree item for this file with metrics and smells as children
                const fileItem = new TreeItem_1.TreeItem(fileName, // Use just the filename as label
                [...fileMetrics, ...detectedSmells], vscode.TreeItemCollapsibleState.Collapsed);
                fileItem.resourceUri = fileUri;
                fileItem.tooltip = new vscode.MarkdownString(`[🔗 Click to open ${fileName}](command:vscode.open?${encodeURIComponent(JSON.stringify([fileUri.toString()]))})`);
                fileItem.tooltip.isTrusted = true;
                fileItem.command = {
                    command: "vscode.open",
                    title: `Open ${fileName}`,
                    arguments: [fileUri],
                };
                return fileItem;
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
            console.error("Error fetching metrics data:", err);
            return [
                new TreeItem_1.TreeItem(`Error fetching metrics: ${err}`, [], vscode.TreeItemCollapsibleState.None),
            ];
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
            tooltip: "Click to provide feedback",
        };
        const viewReportItem = new TreeItem_1.TreeItem("📈 View Project Report", [], vscode.TreeItemCollapsibleState.None);
        viewReportItem.command = {
            command: "extension.showDashboard",
            title: "View Project Report",
            tooltip: "Click to view the report",
        };
        const helpItem = new TreeItem_1.TreeItem("Need Help ?", [], vscode.TreeItemCollapsibleState.None);
        helpItem.command = {
            command: "vscode.open",
            title: "Open Help Page",
            tooltip: "Click to get help",
            arguments: ["https://codepure-vs.vercel.app/doc.html"],
        };
        const viewUMLItem = new TreeItem_1.TreeItem("📜 View Project Class Diagram", [], vscode.TreeItemCollapsibleState.None);
        viewUMLItem.command = {
            command: "extension.ViewUML",
            title: "View Project Class Diagram",
            tooltip: "Click to view the Class Diagram",
        };
        if (!element) {
            return Promise.resolve([
                new TreeItem_1.TreeItem("📊 Metrics Data", [], vscode.TreeItemCollapsibleState.Collapsed),
                new TreeItem_1.TreeItem("📂 Current GitHub Repository", [], vscode.TreeItemCollapsibleState.Collapsed),
                viewUMLItem,
                viewReportItem,
                feedbackItem,
                helpItem,
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
            const treeItems = await this.GithubApi.fetchRepositoriesTreeItems();
            const cleanRepoData = treeItems
                .filter((item) => item.label && item.label !== "Sync with Database")
                .map((item) => {
                const repoName = item.label?.replace(" Info", "").trim();
                const repoOwner = typeof item.tooltip === "string"
                    ? item.tooltip.replace("Owner: ", "")
                    : item.tooltip?.value.replace("Owner: ", "") || "";
                const contributors = item.children?.map((child) => {
                    const match = child.label?.match(/(?:\(Me\)\s*)?([\w-]+)\s*-\s*(\d+)\s*commits/);
                    const username = match?.[1];
                    const contributions = parseInt(match?.[2] || "0", 10);
                    const tooltipText = typeof child.tooltip === "string"
                        ? child.tooltip
                        : child.tooltip?.value || "";
                    return {
                        username,
                        contributions,
                        isOwner: tooltipText.includes("(Owner)"),
                        isCurrentUser: tooltipText.includes("(You)"),
                    };
                }) || [];
                return {
                    name: repoName,
                    owner: repoOwner,
                    contributors,
                };
            });
            // Connect to MongoDB
            const mongo = MongoDB_1.MongoService.getInstance();
            await mongo.connect();
            const db = mongo.getDb();
            const usersCollection = db.collection("Users");
            const reposCollection = db.collection("Repos");
            // Extract contributor usernames
            const contributorUsernames = new Set();
            cleanRepoData.forEach((repo) => {
                repo.contributors.forEach((contributor) => {
                    if (contributor.username) {
                        contributorUsernames.add(contributor.username);
                    }
                });
            });
            // Ensure the current user is also tracked
            contributorUsernames.add(currentUser);
            // Save or update all contributors
            const bulkOps = Array.from(contributorUsernames).map((username) => ({
                updateOne: {
                    filter: { username },
                    update: {
                        $set: { username, lastSeen: new Date() },
                    },
                    upsert: true,
                },
            }));
            await usersCollection.bulkWrite(bulkOps);
            // Save repository info
            await reposCollection.insertOne({
                owner: currentUser,
                syncedAt: new Date(),
                repositories: cleanRepoData,
            });
            vscode.window.showInformationMessage("✅ Users and repository info synced successfully!");
            this.refresh();
        }
        catch (error) {
            console.error("❌ Sync error:", error);
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
        // Get the path to the Results directory
        let resultsDir = path.join(__dirname, "..", "src", "Results");
        resultsDir = resultsDir.replace(/out[\\\/]?/, "");
        try {
            if (fs.existsSync(resultsDir)) {
                // Read all JSON files in the directory
                const files = fs
                    .readdirSync(resultsDir)
                    .filter((file) => file.endsWith(".json"));
                // Delete each file
                for (const file of files) {
                    fs.unlinkSync(path.join(resultsDir, file));
                }
                console.log("Metrics history cleared.");
                vscode.window.showInformationMessage("All metrics history has been cleared.");
            }
            else {
                vscode.window.showInformationMessage("No metrics history to clear.");
            }
            this.treeItems = [];
            this.refresh();
        }
        catch (err) {
            console.error("Error clearing metrics history files:", err);
            vscode.window.showErrorMessage("Error clearing metrics history.");
        }
    }
}
exports.CustomTreeProvider = CustomTreeProvider;
//# sourceMappingURL=dashboard.js.map