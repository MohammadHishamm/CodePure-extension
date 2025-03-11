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
class CustomTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    treeItems = [];
    isAuthenticated = false;
    constructor() {
        vscode.commands.registerCommand("extension.connectGitHub", this.authenticateWithGitHub, this);
        vscode.commands.registerCommand("extension.clearHistory", this.clearHistory, this);
        vscode.commands.registerCommand("extension.syncDatabase", this.syncWithDatabase, this);
        this.checkAuthentication();
    }
    async checkAuthentication() {
        try {
            const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: false });
            this.isAuthenticated = !!session;
            if (this.isAuthenticated) {
                await this.loadMetricsData();
            }
            else {
                this.treeItems = [this.createSignInItem()];
            }
            this._onDidChangeTreeData.fire();
        }
        catch (error) {
            console.error("Error checking GitHub authentication:", error);
        }
    }
    createSignInItem() {
        const signInItem = new TreeItem("Sign in to GitHub", [], vscode.TreeItemCollapsibleState.None);
        signInItem.command = {
            command: "extension.connectGitHub",
            title: "Sign in to GitHub",
            tooltip: "Click to authenticate with GitHub",
        };
        signInItem.iconPath = new vscode.ThemeIcon("sign-in");
        return signInItem;
    }
    async loadMetricsData(metricsData = []) {
        let filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");
        filePath = filePath.replace(/out[\\\/]?/, "");
        console.log(`Loading metrics from: ${filePath}`);
        try {
            if (!fs.existsSync(filePath)) {
                console.error("Metrics file does not exist.");
                return;
            }
            const data = fs.readFileSync(filePath, "utf8");
            if (data.trim().length === 0) {
                console.log("No metrics found in file.");
                return;
            }
            metricsData = JSON.parse(data);
        }
        catch (err) {
            console.error("Error reading or parsing metrics file:", err);
            return;
        }
        if (metricsData.length === 0) {
            console.log("No metrics data available.");
            return;
        }
        const fileItems = metricsData.map((item) => {
            const fileMetrics = item.metrics.map((metric) => new TreeItem(`${metric.name}: ${metric.value}`, [], vscode.TreeItemCollapsibleState.None));
            return new TreeItem(item.folderName, fileMetrics, vscode.TreeItemCollapsibleState.Collapsed);
        });
        const clearHistoryItem = new TreeItem("🗑️ Clear History", [], vscode.TreeItemCollapsibleState.None);
        clearHistoryItem.command = {
            command: "extension.clearHistory",
            title: "Clear History",
            tooltip: "Click to clear the metrics history",
        };
        this.treeItems = [...fileItems, clearHistoryItem];
        this._onDidChangeTreeData.fire();
    }
    update(metricsData) {
        console.log(`Observer notified: Metrics updated with ${metricsData.length} items.`);
        this.loadMetricsData(metricsData);
    }
    async getChildren(element) {
        // Create the Provide Feedback tree item with a command
        const feedbackItem = new TreeItem("📝 Provide Feedback", [], vscode.TreeItemCollapsibleState.None);
        feedbackItem.command = {
            command: "codepure.provideFeedback",
            title: "Provide Feedback",
            tooltip: "Click to provide feedback"
        };
        if (!element) {
            return Promise.resolve([
                new TreeItem("📊 Metrics Data", [], vscode.TreeItemCollapsibleState.Collapsed),
                new TreeItem("📂 Current GitHub Repository", [], vscode.TreeItemCollapsibleState.Collapsed),
                feedbackItem
            ]);
        }
        if (element.label === "📊 Metrics Data") {
            return Promise.resolve(this.treeItems);
        }
        if (element.label === "📂 Current GitHub Repository") {
            return this.fetchRepositoriesTreeItems();
        }
        return Promise.resolve(element.children || []);
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
            this._onDidChangeTreeData.fire();
        }
        catch (error) {
            console.error("Error during GitHub authentication:", error);
            vscode.window.showErrorMessage(`GitHub authentication error: ${error}`);
        }
    }
    async fetchRepositoriesTreeItems() {
        try {
            const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: false });
            if (!session) {
                vscode.window.showErrorMessage("No GitHub session found.");
                return [this.createSignInItem()];
            }
            const accessToken = session.accessToken;
            const response = await fetch("https://api.github.com/user/repos", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.statusText}`);
            }
            const repositories = (await response.json());
            const repoItems = [];
            const currentRepo = await this.getCurrentRepository();
            if (currentRepo) {
                const currentRepoData = repositories.find(repo => repo.name === currentRepo);
                if (currentRepoData) {
                    const owner = currentRepoData.owner.login;
                    const contributors = await this.fetchContributors(owner, currentRepo, accessToken);
                    const currentRepoItem = new TreeItem(`${currentRepo} Info`, contributors, vscode.TreeItemCollapsibleState.Collapsed);
                    currentRepoItem.tooltip = `Owner: ${owner}`;
                    currentRepoItem.iconPath = new vscode.ThemeIcon("repo");
                    // Sync with Database Button
                    const syncItem = new TreeItem("Sync with Database", [], vscode.TreeItemCollapsibleState.None);
                    syncItem.iconPath = new vscode.ThemeIcon("database");
                    syncItem.command = {
                        command: "extension.syncDatabase",
                        title: "Sync with Database",
                        tooltip: "Click to sync the latest metrics with the database",
                        arguments: [owner]
                    };
                    repoItems.push(currentRepoItem);
                    repoItems.push(syncItem);
                }
            }
            else {
                repoItems.push(new TreeItem("This project isn't connected with a GitHub repository.", [], vscode.TreeItemCollapsibleState.None));
            }
            return repoItems;
        }
        catch (error) {
            console.error("Error fetching repositories:", error);
            return [new TreeItem("Error fetching repositories", [], vscode.TreeItemCollapsibleState.None)];
        }
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
            const currentRepo = await this.getCurrentRepository();
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
    async fetchContributors(owner, repo, accessToken) {
        try {
            const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: false });
            let currentUser = "";
            if (session) {
                currentUser = session.account.label; // Get the authenticated GitHub username
            }
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.statusText}`);
            }
            const contributors = (await response.json());
            if (contributors.length === 0) {
                return [new TreeItem("No contributors found.", [], vscode.TreeItemCollapsibleState.None)];
            }
            return contributors.map(contributor => {
                const isOwner = contributor.login === owner;
                const isCurrentUser = contributor.login === currentUser;
                let displayName = contributor.login;
                if (isCurrentUser) {
                    displayName = " (Me) " + displayName;
                }
                // Assign proper icon: "star" for the owner, "account" for others
                const item = new TreeItem(`${displayName} - ${contributor.contributions} commits`, [], vscode.TreeItemCollapsibleState.None);
                item.iconPath = new vscode.ThemeIcon(isOwner ? "star" : "account");
                item.tooltip = `${contributor.contributions} commits${isOwner ? " (Owner)" : ""}${isCurrentUser ? " (You)" : ""}`;
                return item;
            });
        }
        catch (error) {
            console.error("Error fetching contributors:", error);
            return [new TreeItem("Error fetching contributors.", [], vscode.TreeItemCollapsibleState.None)];
        }
    }
    async getCurrentRepository() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }
        const workspacePath = workspaceFolders[0].uri.fsPath;
        const gitFolderPath = path.join(workspacePath, ".git");
        if (!fs.existsSync(gitFolderPath)) {
            return null;
        }
        try {
            const configPath = path.join(gitFolderPath, "config");
            const configContent = fs.readFileSync(configPath, "utf8");
            const match = configContent.match(/\[remote "origin"\]\s*url = https:\/\/github\.com\/([^\/]+)\/([^\.]+)\.git/);
            if (match) {
                return match[2];
            }
        }
        catch (error) {
            console.error("Error reading Git config:", error);
        }
        return null;
    }
    getTreeItem(element) {
        return element;
    }
    clearHistory() {
        console.log("Clearing metrics history...");
        let filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");
        filePath = filePath.replace(/out[\\\/]?/, "");
        try {
            fs.writeFileSync(filePath, JSON.stringify([]));
            console.log("Metrics history cleared.");
            this.treeItems = [];
            this._onDidChangeTreeData.fire();
        }
        catch (err) {
            console.error("Error clearing metrics history file:", err);
        }
    }
}
exports.CustomTreeProvider = CustomTreeProvider;
class TreeItem extends vscode.TreeItem {
    label;
    metrics;
    children;
    constructor(label, children = [], collapsibleState = vscode.TreeItemCollapsibleState.Collapsed, metrics = []) {
        super(label, collapsibleState);
        this.label = label;
        this.metrics = metrics;
        this.tooltip = `${label}`;
        this.description = metrics.length > 0 ? `${metrics.length} metrics` : "";
        this.contextValue = metrics.length > 0 ? "fileWithMetrics" : "file";
        // Assign children properly
        if (children.length > 0) {
            this.children = children;
        }
        else if (metrics.length > 0) {
            this.children = metrics.map(metric => new TreeItem(`${metric.name}: ${metric.value}`, [], vscode.TreeItemCollapsibleState.None));
        }
    }
}
//# sourceMappingURL=dashboard.js.map