import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { TreeItem } from "../TreeItem";
import { MongoService } from "./MongoDB"; // adjust path as needed

export class GitHubAPI implements vscode.TreeDataProvider<TreeItem> {

  

    public async fetchRepositoriesTreeItems(): Promise<TreeItem[]> {
        try {
            const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: false });
            if (!session) {
                vscode.window.showErrorMessage("No GitHub session found.");
                return [];
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
    
            const repositories = (await response.json()) as { name: string, owner: { login: string } }[];
            const repoItems: TreeItem[] = [];
    
            const currentRepo = await this.getCurrentRepository();
            if (currentRepo) {
                const currentRepoData = repositories.find(repo => repo.name === currentRepo);
                if (currentRepoData) {
                    const owner = currentRepoData.owner.login;
                    const contributors = await this.fetchContributors(owner, currentRepo, accessToken);
    
                    const currentRepoItem = new TreeItem(`${currentRepo} Info`, contributors, vscode.TreeItemCollapsibleState.Collapsed);
                    currentRepoItem.tooltip = `Owner: ${owner}`;
                    currentRepoItem.iconPath = new vscode.ThemeIcon("repo");
    
                    const mongo = MongoService.getInstance();
                    await mongo.connect();
                    const db = mongo.getDb();
    
                    const repoCollection = db.collection("Repos");
    
                    const repoDoc = await repoCollection.findOne({
                        owner: owner,
                        repositories: {
                            $elemMatch: {
                                name: currentRepo,
                                owner: owner
                            }
                        }
                    });
    
                    if (!repoDoc) {
                        const syncItem = new TreeItem("Sync with Database", [], vscode.TreeItemCollapsibleState.None);
                        syncItem.iconPath = new vscode.ThemeIcon("database");
                        syncItem.command = {
                            command: "extension.syncDatabase",
                            title: "Sync with Database",
                            tooltip: "Click to sync the latest metrics with the database",
                            arguments: [owner, currentRepo]
                        };
                        repoItems.push(syncItem);
                    } else {
                        const alreadySyncedItem = new TreeItem("Already Synced", [], vscode.TreeItemCollapsibleState.None);
                        alreadySyncedItem.iconPath = new vscode.ThemeIcon("check");
                        repoItems.push(alreadySyncedItem);
                    }
    
                    repoItems.unshift(currentRepoItem);
                }
            } else {
                repoItems.push(new TreeItem("This project isn't connected with a GitHub repository.", [], vscode.TreeItemCollapsibleState.None));
            }
    
            return repoItems;
    
        } catch (error) {
            console.error("Error fetching repositories:", error);
            return [new TreeItem("Error fetching repositories", [], vscode.TreeItemCollapsibleState.None)];
        }
    }
    

    public async fetchContributors(owner: string, repo: string, accessToken: string): Promise<TreeItem[]> {
        try {
            const session = await vscode.authentication.getSession("github", ["repo", "user"], { createIfNone: false });
            let currentUser = "";

            if (session) {
                currentUser = session.account.label;
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

            const contributors = (await response.json()) as { login: string; contributions: number }[];

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

                const item = new TreeItem(`${displayName} - ${contributor.contributions} commits`, [], vscode.TreeItemCollapsibleState.None);
                item.iconPath = new vscode.ThemeIcon(isOwner ? "star" : "account");
                item.tooltip = `${contributor.contributions} commits${isOwner ? " (Owner)" : ""}${isCurrentUser ? " (You)" : ""}`;

                return item;
            });

        } catch (error) {
            console.error("Error fetching contributors:", error);
            return [new TreeItem("Error fetching contributors.", [], vscode.TreeItemCollapsibleState.None)];
        }
    }


    public async getCurrentRepository(): Promise<string | null> {
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

    getTreeItem(element: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        throw new Error("Method not implemented.");
    }
    getChildren(element?: TreeItem | undefined): vscode.ProviderResult<TreeItem[]> {
        throw new Error("Method not implemented.");
    }
    getParent?(element: TreeItem): vscode.ProviderResult<TreeItem> {
        throw new Error("Method not implemented.");
    }
    resolveTreeItem?(item: vscode.TreeItem, element: TreeItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
        throw new Error("Method not implemented.");
    }
}


