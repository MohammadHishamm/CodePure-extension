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

  private _getHtmlForWebview(): string {
    const metricsData = this._getMetricsData();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <title>CodePure Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          canvas { max-width: 100%; }
          .chart-container { display: flex; flex-wrap: wrap; justify-content: space-around; }
          .chart-wrapper { width: 45%; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>CodePure Metrics Dashboard</h1>
        <div class="chart-container">
          ${metricsData.map((file, index) => `
            <div class="chart-wrapper">
              <h3>${file.folderName}</h3>
              <canvas id="metricsChart${index}"></canvas>
            </div>
          `).join('')}
        </div>
        <script>
          const metricsData = ${JSON.stringify(metricsData)};

          metricsData.forEach((file, index) => {
            const ctxMetrics = document.getElementById("metricsChart" + index).getContext("2d");
            new Chart(ctxMetrics, {
              type: "bar",
              data: {
                labels: file.metrics.map(m => m.name),
                datasets: [{
                  label: "Metric Values",
                  data: file.metrics.map(m => m.value),
                  backgroundColor: "rgba(75, 192, 192, 0.2)",
                  borderColor: "rgba(75, 192, 192, 1)",
                  borderWidth: 1
                }]
              },
              options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
              }
            });
          });
        </script>
      </body>
      </html>
    `;
}


private _saveMetricsData(newMetrics: any) {
  const filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");

  try {
      let jsonData: any[] = [];

      if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, "utf8");
          jsonData = data ? JSON.parse(data) : [];
      }

      const existingIndex = jsonData.findIndex(entry => entry.fullPath === newMetrics.fullPath);

      if (existingIndex !== -1) {
          console.log(`Updating metrics for: ${newMetrics.fullPath}`);
          jsonData[existingIndex] = newMetrics;
      } else {
          console.log(`Adding new file: ${newMetrics.fullPath}`);
          jsonData.push(newMetrics);
      }

      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf8");
      console.log("Metrics saved successfully!");

      // Force update the dashboard
      if (DashboardPanel.currentPanel) {
          DashboardPanel.currentPanel._update();
      }

  } catch (err) {
      console.error("Error saving metrics data:", err);
  }
}



private _getMetricsData() {
  const filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");
  
  try {
      let jsonData: any[] = [];

      if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, "utf8");
          jsonData = data ? JSON.parse(data) : [];
      }

      console.log("Loaded metrics for files:", jsonData.map(f => f.folderName));
      return jsonData;

  } catch (err) {
      console.error("Error reading metrics file:", err);
      return [];
  }
}


}