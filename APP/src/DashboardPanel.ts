import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._update();

    this._panel.onDidDispose(() => this.dispose(), null);
  }

  public static show(extensionUri: vscode.Uri) {
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._update(); // Ensure data refreshes
      DashboardPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "dashboard",
      "CodePure Dashboard",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
  }

  public dispose() {
    DashboardPanel.currentPanel = undefined;
    this._panel.dispose();
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview();
  }



}