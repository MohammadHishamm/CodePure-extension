import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { TreeItem } from "./TreeItem";
import { GitHubAPI } from "./services/GithubAPI";
import { Observer } from "./Core/MetricsObserver";
import { MetricsFileFormat } from "./Interface/MetricsFileFormat";
import { ServerMetricsManager } from "./services/ServerMetricsManager";
import { MongoService } from "./services/MongoDB"; // Adjust the path as needed

export class CustomTreeProvider
  implements vscode.TreeDataProvider<TreeItem>, Observer {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeItem | undefined | null | void
  > = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<
    TreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private treeItems: TreeItem[] = [];
  private isAuthenticated: boolean = false;
  private GithubApi;
  private predictionCache: Map<string, any> = new Map(); // Store predictions by filename

  constructor() {
    this.GithubApi = new GitHubAPI();
    this.loadPredictionCache();
    vscode.commands.registerCommand(
      "extension.connectGitHub",
      this.authenticateWithGitHub,
      this
    );
    vscode.commands.registerCommand(
      "extension.clearHistory",
      this.clearHistory,
      this
    );
    vscode.commands.registerCommand(
      "extension.syncDatabase",
      this.syncWithDatabase,
      this
    );

    this.checkAuthentication();

    // Set up file system watcher for the Results directory
    const resultsDir = path
      .join(__dirname, "..", "src", "Results")
      .replace(/out[\\\/]?/, "");

    if (fs.existsSync(resultsDir)) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(resultsDir, "*.json")
      );

      // When a file is created or changed
      watcher.onDidCreate(() => this.refresh());
      watcher.onDidChange(() => this.refresh());
      watcher.onDidDelete(() => this.refresh());
    }
  }

  private async checkAuthentication() {
    try {
      const session = await vscode.authentication.getSession(
        "github",
        ["repo", "user"],
        { createIfNone: false }
      );
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
      const session = await vscode.authentication.getSession(
        "github",
        ["repo", "user"],
        { createIfNone: true }
      );
      if (!session) {
        vscode.window.showErrorMessage(
          "GitHub authentication failed or was cancelled."
        );
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
    const signInItem = new TreeItem(
      "Sign in to GitHub",
      [],
      vscode.TreeItemCollapsibleState.None
    );
    signInItem.command = {
      command: "extension.connectGitHub",
      title: "Sign in to GitHub",
      tooltip: "Click to authenticate with GitHub",
    };
    signInItem.iconPath = new vscode.ThemeIcon("sign-in");

    return signInItem;
  }

  private async fetchMetricsData(): Promise<TreeItem[]> {


    let resultsDir = path.join(__dirname, "..", "src", "Results").replace(/out[\\\/]?/, "");
    console.log(`Fetching metrics from directory: ${resultsDir}`);

    if (!fs.existsSync(resultsDir)) {
        console.error("Results directory does not exist.");
        return [new TreeItem("No metrics data available", [], vscode.TreeItemCollapsibleState.None)];
    }

    try {
        const allFiles = fs.readdirSync(resultsDir);
        const files = allFiles.filter((file) => file.endsWith(".json"));

        if (files.length === 0) {
            return [new TreeItem("No metrics data available", [], vscode.TreeItemCollapsibleState.None)];
        }

        const allMetricsData: any[] = [];

        for (const file of files) {
            const filePath = path.join(resultsDir, file);

            try {
                const fileContent = fs.readFileSync(filePath, "utf8");
                if (fileContent.trim().length === 0) continue;

                const metricsData = JSON.parse(fileContent);

                if (
                    metricsData.fullPath &&
                    metricsData.folderName &&
                    Array.isArray(metricsData.metrics)
                ) {
                    allMetricsData.push(metricsData);

             
                }
            } catch (parseError) {
                console.error(`Error reading or parsing file ${file}:`, parseError);
            }
        }

        if (allMetricsData.length === 0) {
            return [new TreeItem("No valid metrics data available", [], vscode.TreeItemCollapsibleState.None)];
        }

        const serverManager = new ServerMetricsManager();
        const response = await serverManager.sendMetricsFile();

        if (response?.predictions && Array.isArray(response.predictions)) {
            response.predictions.forEach((prediction: any) => {
                if (prediction.fileName) {
                    this.predictionCache.set(prediction.fileName, prediction);
                }
            });
        }

        const metricItems = allMetricsData.map((item) => {
            const fileUri = vscode.Uri.file(item.fullPath);
            const fileName = path.basename(item.fullPath);

            const fileMetrics = item.metrics.map(
                (metric: { name: string; value: number }) =>
                    new TreeItem(
                        `🔎 ${metric.name}: ${metric.value}`,
                        [],
                        vscode.TreeItemCollapsibleState.None
                    )
            );

            const filePrediction = this.predictionCache.get(fileName) || {};
            const { fileName: _, ...predictionWithoutFileName } = filePrediction;

            const detectedSmells: TreeItem[] = Object.entries(predictionWithoutFileName)
                .filter(([_, value]) => value === 1)
                .map(
                    ([smell, _]) =>
                        new TreeItem(
                            `⚠️ ${smell}: ‼️ Detected ‼️`,
                            [],
                            vscode.TreeItemCollapsibleState.None
                        )
                );

            if (detectedSmells.length === 0) {
                detectedSmells.push(
                    new TreeItem(
                        "✅ No code smells ✅",
                        [],
                        vscode.TreeItemCollapsibleState.None
                    )
                );
            }

            const fileItem = new TreeItem(
                fileName,
                [...fileMetrics, ...detectedSmells],
                vscode.TreeItemCollapsibleState.Collapsed
            );

            fileItem.resourceUri = fileUri;
            fileItem.tooltip = new vscode.MarkdownString(
                `[🔗 Click to open ${fileName}](command:vscode.open?${encodeURIComponent(
                    JSON.stringify([fileUri.toString()])
                )})`
            );
            fileItem.tooltip.isTrusted = true;

            fileItem.command = {
                command: "vscode.open",
                title: `Open ${fileName}`,
                arguments: [fileUri],
            };

            return fileItem;
        });

        const clearHistoryItem = new TreeItem(
            "🗑️ Clear All History",
            [],
            vscode.TreeItemCollapsibleState.None
        );
        clearHistoryItem.command = {
            command: "extension.clearHistory",
            title: "Clear All History",
            tooltip: "Click to clear the metrics history",
        };

        return [...metricItems, clearHistoryItem];
    } catch (err) {
        console.error("Error fetching metrics data:", err);
        return [
            new TreeItem(
                `Error fetching metrics: ${err}`,
                [],
                vscode.TreeItemCollapsibleState.None
            ),
        ];
    }
}


  update(metricsData: MetricsFileFormat[]): void {
    console.log(
      `Observer notified: Metrics updated with ${metricsData.length} items.`
    );
    this.fetchMetricsData().then((items) => {
      this.treeItems = items;
      this.savePredictionCache();
      this.refresh();
    });
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    const feedbackItem = new TreeItem(
      "📝 Provide Feedback",
      [],
      vscode.TreeItemCollapsibleState.None
    );
    feedbackItem.command = {
      command: "codepure.provideFeedback",
      title: "Provide Feedback",
      tooltip: "Click to provide feedback",
    };

    const viewReportItem = new TreeItem(
      "📈 View Project Report",
      [],
      vscode.TreeItemCollapsibleState.None
    );
    viewReportItem.command = {
      command: "extension.showDashboard",
      title: "View Project Report",
      tooltip: "Click to view the report",
    };

    const helpItem = new TreeItem(
      "Need Help ?",
      [],
      vscode.TreeItemCollapsibleState.None
    );
    helpItem.command = {
      command: "vscode.open",
      title: "Open Help Page",
      tooltip: "Click to get help",
      arguments: ["https://codepure-vs.vercel.app/doc.html"],
    };

    const viewUMLItem = new TreeItem(
      "📜 View Project Class Diagram",
      [],
      vscode.TreeItemCollapsibleState.None
    );
    viewUMLItem.command = {
      command: "extension.ViewUML",
      title: "View Project Class Diagram",
      tooltip: "Click to view the Class Diagram",
    };

    if (!element) {
      return Promise.resolve([
        new TreeItem(
          "📊 Metrics Data",
          [],
          vscode.TreeItemCollapsibleState.Collapsed
        ),
        new TreeItem(
          "📂 Current GitHub Repository",
          [],
          vscode.TreeItemCollapsibleState.Collapsed
        ),
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

  async syncWithDatabase(owner: string) {
    try {
      const session = await vscode.authentication.getSession(
        "github",
        ["repo", "user"],
        { createIfNone: false }
      );
      if (!session) {
        vscode.window.showErrorMessage(
          "GitHub authentication required for syncing."
        );
        return;
      }

      const currentUser = session.account.label;

      if (currentUser !== owner) {
        vscode.window.showErrorMessage(
          "Only the repository owner can sync with the database."
        );
        return;
      }

      const reason =
        "Syncing will allow CodePure to analyze and store code smell metrics, making them available for all repository users.";

      const userChoice = await vscode.window.showInformationMessage(
        `${reason}\n\nDo you want to proceed with the sync?`,
        { modal: true },
        "Yes",
        "No"
      );

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
          const repoOwner =
            typeof item.tooltip === "string"
              ? item.tooltip.replace("Owner: ", "")
              : item.tooltip?.value.replace("Owner: ", "") || "";

          const contributors =
            item.children?.map((child) => {
              const match = child.label?.match(
                /(?:\(Me\)\s*)?([\w-]+)\s*-\s*(\d+)\s*commits/
              );
              const username = match?.[1];
              const contributions = parseInt(match?.[2] || "0", 10);
              const tooltipText =
                typeof child.tooltip === "string"
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
      const mongo = MongoService.getInstance();
      await mongo.connect();
      const db = mongo.getDb();


      const usersCollection = db.collection("Users");
      const reposCollection = db.collection("Repos");

      // Extract contributor usernames
      const contributorUsernames = new Set<string>();
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

      vscode.window.showInformationMessage(
        "✅ Users and repository info synced successfully!"
      );
      this.refresh();
    } catch (error) {
      console.error("❌ Sync error:", error);
      vscode.window.showErrorMessage(
        "An error occurred while syncing with the database."
      );
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async clearHistory(): Promise<void> {
    const reason =
      "Clearing history will remove all saved metrics from your project permanently.";

    const userChoice = await vscode.window.showInformationMessage(
      `${reason}\n\nDo you want to proceed with clearing the history?`,
      { modal: true },
      "Yes",
      "No"
    );

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

        // Clear the prediction cache as well
        this.predictionCache.clear();

        console.log("Metrics history cleared.");
        vscode.window.showInformationMessage(
          "All metrics history has been cleared."
        );
      } else {
        vscode.window.showInformationMessage("No metrics history to clear.");
      }

      this.treeItems = [];
      this.refresh();
    } catch (err) {
      console.error("Error clearing metrics history files:", err);
      vscode.window.showErrorMessage("Error clearing metrics history.");
    }
  }

  private savePredictionCache(): void {
    try {
      const cacheDir = path.join(__dirname, "..", "src", "Cache");
      const cachePath = cacheDir.replace(/out[\\\/]?/, "");

      // Create cache directory if it doesn't exist
      if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
      }

      const cachefile = path.join(cachePath, "prediction-cache.json");
      const cacheData = Object.fromEntries(this.predictionCache);
      fs.writeFileSync(cachefile, JSON.stringify(cacheData, null, 2));
      console.log("Prediction cache saved successfully");
    } catch (error) {
      console.error("Error saving prediction cache:", error);
    }
  }

  private async loadPredictionCache(): Promise<void> {
    try {
      // Resolve cache file path
      const cacheDir = path.join(__dirname, "..", "src", "Cache").replace(/out[\\\/]?/, "");
      const cacheFile = path.join(cacheDir, "prediction-cache.json");
  
      // Initialize repo details
      let owner: string | undefined;
      let repo: string | undefined;
      let repoId: any = undefined;
  
      // Try to find the already synced repo from GitHub API
      const treeItems = await this.GithubApi.fetchRepositoriesTreeItems();
      for (const item of treeItems) {
        if (item.label === "Already Synced" && item.command?.arguments) {
          [owner, repo] = item.command.arguments;
          console.log("Already Synced Repo Found:", { owner, repo });
          break;
        }
      }
  
      // If a synced repo was found, try to find its ID from the MongoDB
      if (owner && repo) {
        try {
          const mongo = MongoService.getInstance();
          await mongo.connect();
          const db = mongo.getDb();
  
          const repoCollection = db.collection("Repos");
          const repoDoc = await repoCollection.findOne({
            owner,
            "repositories.name": repo
          });
  
          if (repoDoc) {
            const matchingRepo = repoDoc.repositories.find((r: any) => r.name === repo);
            repoId = matchingRepo?._id || repoDoc._id;
            console.log("Repository ID found in DB:", repoId);
          } else {
            console.log("Repository not found in DB.");
          }
        } catch (dbError) {
          console.error("Error querying repository from MongoDB:", dbError);
        }
      } else {
        console.warn("Owner or repo not found; skipping DB lookup.");
      }
  
      // Load prediction cache and store predictions in DB
      if (fs.existsSync(cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
        this.predictionCache = new Map(Object.entries(cacheData));
        console.log("Prediction cache loaded successfully.");
  
        // Save predictions to MongoDB
        try {
          const mongo = MongoService.getInstance();
          await mongo.connect();
          const db = mongo.getDb();
  
          const predictionCollection = db.collection("Predictions");
  
          for (const [filePath, predictionData] of this.predictionCache.entries()) {
            const doc = {
              filePath,
              prediction: predictionData.prediction,
              confidence: predictionData.confidence,
              repoId: repoId || null,
              savedAt: new Date()
            };
  
            await predictionCollection.insertOne(doc);
            console.log(`Saved prediction for ${filePath}`);
          }
        } catch (dbInsertErr) {
          console.error("Failed to insert predictions:", dbInsertErr);
        }
      } else {
        console.warn("Prediction cache file does not exist.");
        this.predictionCache = new Map();
      }
    } catch (error) {
      console.error("Error loading prediction cache:", error);
      this.predictionCache = new Map(); // Initialize empty cache on failure
    }
  }
  
}
