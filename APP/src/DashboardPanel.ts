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
          .chart-container { display: flex; justify-content: space-around; flex-wrap: wrap; }
        </style>
      </head>
      <body>
        <h1>CodePure Metrics Dashboard</h1>
        <div class="chart-container">
          <canvas id="metricsChart"></canvas>
        </div>
        <script>
          const metricsData = ${JSON.stringify(metricsData)};
          
          if (metricsData && metricsData.metrics && metricsData.metrics.length > 0) {

            const ctxMetrics = document.getElementById("metricsChart").getContext("2d");

            new Chart(ctxMetrics, {
              type: "bar",
              data: {
                labels: metricsData.metrics.map(m => m.name),
                datasets: [{
                  label: "Metric Values",
                  data: metricsData.metrics.map(m => m.value),
                  backgroundColor: "rgba(75, 192, 192, 0.2)",
                  borderColor: "rgba(75, 192, 192, 1)",
                  borderWidth: 1
                }]
              },
              options: {
                responsive: true,
                scales: {
                  y: { beginAtZero: true }
                }
              }
            });
          } else {
            document.body.innerHTML += "<p>No metrics available</p>";
          }
        </script>
      </body>
      </html>
    `;
  }

  private _getMetricsData() {
    const filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");
    try {
        if (!fs.existsSync(filePath)) {
            console.error("Metrics file not found:", filePath);
            return { metrics: [] };
        }

        const data = fs.readFileSync(filePath, "utf8");
        const jsonData = JSON.parse(data);

        // Ensure it's an array and return the first file's metrics
        return jsonData.length > 0 ? jsonData[0] : { metrics: [] };
    } catch (err) {
        console.error("Error reading metrics file:", err);
        return { metrics: [] };
    }
}

}