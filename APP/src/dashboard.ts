import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { TreeItem } from "./TreeItem";
import { GitHubAPI } from "./services/GithubAPI";
import { Observer } from "./Core/MetricsObserver";
import { MetricsFileFormat } from "./Interface/MetricsFileFormat";
import { ServerMetricsManager } from "./services/ServerMetricsManager";

export class CustomTreeProvider implements vscode.TreeDataProvider<TreeItem>, Observer {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private treeItems: TreeItem[] = [];
  private isAuthenticated: boolean = false;
  private GithubApi;

  constructor() {
    this.GithubApi = new GitHubAPI();

    vscode.commands.registerCommand("extension.connectGitHub", this.authenticateWithGitHub, this);
    vscode.commands.registerCommand("extension.clearHistory", this.clearHistory, this);
    vscode.commands.registerCommand("extension.syncDatabase", this.syncWithDatabase, this);


    this.checkAuthentication();
  }

  private async checkAuthentication() {
    try {
      const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: false });
      this.isAuthenticated = !!session;

      if (!this.isAuthenticated) {
        this.treeItems = [this.createSignInItem()];
      }

      console.log("GithubAPI: isAuthenticated");
      this.refresh();
    } catch (error) {
      console.error("Error checking GitHub authentication:", error);
    }
  }

  private async authenticateWithGitHub() {
    try {
      const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: true });
      if (!session) {
        vscode.window.showErrorMessage("GitHub authentication failed or was cancelled.");
        return;
      }

      console.log("GitHub authentication successful!");
      this.isAuthenticated = true;

      this.refresh();
    } catch (error) {
      console.error("Error during GitHub authentication:", error);
      vscode.window.showErrorMessage(`GitHub authentication error: ${error}`);
    }
  }

  private createSignInItem(): TreeItem {
    const signInItem = new TreeItem("Sign in to GitHub", [], vscode.TreeItemCollapsibleState.None);
    signInItem.command = {
      command: "extension.connectGitHub",
      title: "Sign in to GitHub",
      tooltip: "Click to authenticate with GitHub",
    };
    signInItem.iconPath = new vscode.ThemeIcon("sign-in");

    return signInItem;
  }

  private async fetchMetricsData(): Promise<TreeItem[]> {
    let filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");
    filePath = filePath.replace(/out[\\\/]?/, "");

    console.log(`Fetching metrics from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error("Metrics file does not exist.");
        return [new TreeItem("No metrics to fetch", [], vscode.TreeItemCollapsibleState.None)];
    }

    try {
        const data = fs.readFileSync(filePath, "utf8");

        if (data.trim().length === 0) {
            console.log("No metrics found in file.");
            return [new TreeItem("No metrics to fetch", [], vscode.TreeItemCollapsibleState.None)];
        }

        const metricsData: MetricsFileFormat[] = JSON.parse(data);

        if (metricsData.length === 0) {
            console.log("No metrics data available.");
            return [new TreeItem("No metrics to fetch", [], vscode.TreeItemCollapsibleState.None)];
        }

        const serverManager = new ServerMetricsManager();
        const response = await serverManager.sendMetricsFile();
        
        const metricItems = metricsData.map((item, index) => {
            const fileUri = vscode.Uri.file(item.fullPath);

            const fileMetrics = item.metrics.map(
                (metric) => new TreeItem(`🔎 ${metric.name}: ${metric.value}`, [], vscode.TreeItemCollapsibleState.None)
            );

            // ✅ Get the correct prediction for this specific file
            const filePrediction = response?.predictions?.[index] || {}; 

            // ✅ Filter out "Not Detected" smells
            const detectedSmells: TreeItem[] = Object.entries(filePrediction)
                .filter(([_, value]) => value === 1)  // Only keep detected smells
                .map(([smell, _]) => new TreeItem(`⚠️ ${smell}: ‼️ Detected ‼️`, [], vscode.TreeItemCollapsibleState.None));

            // ✅ If no code smells were detected, add a "No Code Smells" message
            if (detectedSmells.length === 0) {
                detectedSmells.push(new TreeItem("✅ No code smells ✅", [], vscode.TreeItemCollapsibleState.None));
            }

            const folderItem = new TreeItem(item.folderName, [...fileMetrics, ...detectedSmells], vscode.TreeItemCollapsibleState.Collapsed);
            folderItem.resourceUri = fileUri;

            folderItem.tooltip = new vscode.MarkdownString(
                `[🔗 Click to open ${item.folderName}](command:vscode.open?${encodeURIComponent(JSON.stringify([fileUri.toString()]))})`
            );
            folderItem.tooltip.isTrusted = true;

            folderItem.command = {
                command: "vscode.open",
                title: `Open ${item.folderName}`,
                arguments: [fileUri]
            };

            return folderItem;
        });

        const clearHistoryItem = new TreeItem("🗑️ Clear All History", [], vscode.TreeItemCollapsibleState.None);
        clearHistoryItem.command = {
            command: "extension.clearHistory",
            title: "Clear All History",
            tooltip: "Click to clear the metrics history",
        };

        return [...metricItems, clearHistoryItem];

    } catch (err) {
        console.error("Error reading or parsing metrics file:", err);
        return [new TreeItem("Error fetching metrics", [], vscode.TreeItemCollapsibleState.None)];
    }
}





  update(metricsData: MetricsFileFormat[]): void {
    console.log(`Observer notified: Metrics updated with ${metricsData.length} items.`);
    this.fetchMetricsData().then((items) => {
      this.treeItems = items;
      this.refresh();
    });
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    const feedbackItem = new TreeItem("📝 Provide Feedback", [], vscode.TreeItemCollapsibleState.None);
    feedbackItem.command = {
      command: "codepure.provideFeedback",
      title: "Provide Feedback",
      tooltip: "Click to provide feedback"
    };

    const viewReportItem = new TreeItem("📈 View Project Report", [], vscode.TreeItemCollapsibleState.None);
    viewReportItem.command = {
      command: "extension.showDashboard",
      title: "View Project Report",
      tooltip: "Click to view the report"
    };

    const helpItem = new TreeItem("Need Help ?", [], vscode.TreeItemCollapsibleState.None);
    helpItem.command = {
      command: "vscode.open",
      title: "Open Help Page",
      tooltip: "Click to get help",
      arguments: ["https://codepure-vs.vercel.app/doc.html"]
    };

    
    const viewUMLItem = new TreeItem("📜 View Project Class Diagram", [], vscode.TreeItemCollapsibleState.None);
    viewUMLItem.command = {
      command: "extension.ViewUML",
      title: "View Project Class Diagram",
      tooltip: "Click to view the Class Diagram"
    };

    if (!element) {
      return Promise.resolve([
        new TreeItem("📊 Metrics Data", [], vscode.TreeItemCollapsibleState.Collapsed),
        new TreeItem("📂 Current GitHub Repository", [], vscode.TreeItemCollapsibleState.Collapsed),
        viewUMLItem,
        viewReportItem,
        feedbackItem,
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


  async syncWithDatabase(owner: string) {
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

      const userChoice = await vscode.window.showInformationMessage(
        `${reason}\n\nDo you want to proceed with the sync?`,
        { modal: true },
        "Yes", "No"
      );

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

    } catch (error) {
      console.error("Sync error:", error);
      vscode.window.showErrorMessage("An error occurred while syncing with the database.");
    }
  }


  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async clearHistory(): Promise<void> {
    const reason = "Clearing history will remove all saved metrics from your project permanently.";

    const userChoice = await vscode.window.showInformationMessage(
      `${reason}\n\nDo you want to proceed with clearing the history?`,
      { modal: true },
      "Yes", "No"
    );

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
    } catch (err) {
      console.error("Error clearing metrics history file:", err);
      vscode.window.showErrorMessage("Error clearing metrics history.");
    }
  }




}
