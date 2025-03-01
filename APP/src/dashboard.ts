import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Observer } from "./Core/MetricsObserver";
import { MetricsFileFormat } from "./Interface/MetricsFileFormat";
import { Metric } from "./Core/Metric";

export class CustomTreeProvider implements vscode.TreeDataProvider<TreeItem>, Observer {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private treeItems: TreeItem[] = [];
  private isAuthenticated: boolean = false;

  constructor() {
    vscode.commands.registerCommand("extension.connectGitHub", this.authenticateWithGitHub, this);
    vscode.commands.registerCommand("extension.clearHistory", this.clearHistory, this);
    this.checkAuthentication();
  }

  private async checkAuthentication() {
    try {
      const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: false });
      this.isAuthenticated = !!session;

      if (this.isAuthenticated) {
        await this.loadMetricsData();
      } else {
        this.treeItems = [this.createSignInItem()];
      }

      this._onDidChangeTreeData.fire();
    } catch (error) {
      console.error("Error checking GitHub authentication:", error);
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

  private async loadMetricsData(metricsData: MetricsFileFormat[] = []): Promise<void> {
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

    } catch (err) {
        console.error("Error reading or parsing metrics file:", err);
        return;
    }

    if (metricsData.length === 0) {
        console.log("No metrics data available.");
        return;
    }

    const fileItems = metricsData.map((item) => {
        const fileMetrics = item.metrics.map((metric) => new Metric(metric.name, metric.value));
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


  update(metricsData: MetricsFileFormat[]): void {
    console.log(`Observer notified: Metrics updated with ${metricsData.length} items.`);
    this.loadMetricsData(metricsData);
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
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
        new TreeItem("📂 GitHub Repositories", [], vscode.TreeItemCollapsibleState.Collapsed),
        feedbackItem
      ]);
    }

    if (element.label === "📊 Metrics Data") {
      return Promise.resolve(this.treeItems); 
    }

    if (element.label === "📂 GitHub Repositories") {
      return this.fetchRepositoriesTreeItems(); 
    }

    return Promise.resolve(element.children || []);
  }

  async fetchRepositoriesTreeItems(): Promise<TreeItem[]> {
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

        const repositories = (await response.json()) as { name: string }[];

        const currentRepo = await this.getCurrentRepository();
        const repoItems: TreeItem[] = [];

        if (currentRepo) {
            const currentRepoItem = new TreeItem(`Current Repo: ${currentRepo}`, [], vscode.TreeItemCollapsibleState.None);
            currentRepoItem.tooltip = "This is the repository currently open in VS Code.";
            currentRepoItem.iconPath = new vscode.ThemeIcon("repo");
            repoItems.push(currentRepoItem);
        }

        if (repositories.length === 0) {
            const noRepoItem = new TreeItem("No repositories found", [], vscode.TreeItemCollapsibleState.None);
            noRepoItem.tooltip = "You don't have any repositories on GitHub.";
            noRepoItem.iconPath = new vscode.ThemeIcon("warning");
            repoItems.push(noRepoItem);
        } else {
            repoItems.push(...repositories.map(repo => new TreeItem(repo.name, [], vscode.TreeItemCollapsibleState.None)));
        }

        return repoItems;

    } catch (error) {
        console.error("Error fetching repositories:", error);
        return [new TreeItem("Error fetching repositories", [], vscode.TreeItemCollapsibleState.None)];
    }
}

private async getCurrentRepository(): Promise<string | null> {
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
    } catch (error) {
        console.error("Error reading Git config:", error);
    }

    return null;
}

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  clearHistory(): void {
    console.log("Clearing metrics history...");

    let filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");
    filePath = filePath.replace(/out[\\\/]?/, "");

    try {
      fs.writeFileSync(filePath, JSON.stringify([]));
      console.log("Metrics history cleared.");

      this.treeItems = [];
      this._onDidChangeTreeData.fire();
    } catch (err) {
      console.error("Error clearing metrics history file:", err);
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

      this._onDidChangeTreeData.fire(); // Refresh tree after authentication
    } catch (error) {
      console.error("Error during GitHub authentication:", error);
      vscode.window.showErrorMessage(`GitHub authentication error: ${error}`);
    }
  }
}

class TreeItem extends vscode.TreeItem {
  children?: TreeItem[];
  
  constructor(
    public readonly label: string,
    public metrics: Metric[] = [],
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
  ) {
    super(label, collapsibleState);
    
    this.tooltip = `${label}`;
    this.description = metrics.length > 0 ? `${metrics.length} metrics` : "";
    this.contextValue = metrics.length > 0 ? "fileWithMetrics" : "file";

    // **Ensure metrics appear as children in the tree**
    if (metrics.length > 0) {
      this.children = metrics.map(metric => new TreeItem(`${metric.name}: ${metric.value}`, [], vscode.TreeItemCollapsibleState.None));
    }
  }
}

