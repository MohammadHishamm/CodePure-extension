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
    this._setupMessageListener();
    this.refresh();

    this._panel.onDidDispose(() => this.dispose(), null);
  }

  public static show(extensionUri: vscode.Uri) {
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.refresh();
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

  private refresh() {
    const fileList = this._getFileNames();
    this._panel.webview.html = this._getHtmlForWebview(fileList);
  }

  private _getFileNames(): string[] {
    const metricsData = this._getMetricsData();
    return metricsData.map((file: { folderName: string }) => file.folderName); // Fixed the map function here
  }

  private _getMetricsData() {
    const filePath = path.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");

    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf8");
        return data ? JSON.parse(data) : [];
      }
      return [];
    } catch (err) {
      console.error("Error reading metrics file:", err);
      return [];
    }
  }

  private _setupMessageListener() {
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.type === "fileSelected") {
          const metricsData = this._getMetricsData();
          const fileMetrics = metricsData.find((file: { folderName: string }) => file.folderName === message.fileName);

          this._panel.webview.postMessage({ type: "updateCharts", fileMetrics: fileMetrics ? [fileMetrics] : [] });
        }
      },
      undefined
    );
  }

  private _getHtmlForWebview(fileList: string[]): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <title>CodePure Dashboard</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            display: flex; 
            height: 100vh; 
          }
          #sidebar {
            width: 300px; 
            background: #252526; 
            padding: 20px;
            overflow-y: auto;
            border-right: 3px solid #333; 
            color: white;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
          }
          #file-list { 
            list-style: none; 
            padding: 0; 
            margin-top: 20px;
          }
          .file-item {
            padding: 12px 18px; 
            cursor: pointer; 
            border-radius: 6px; 
            transition: background 0.3s;
            font-size: 16px;
          }
          .file-item:hover { 
            background: #333; 
          }
          /* Center charts in a column */
          .chart-container { 
            flex-grow: 1;
            display: flex; 
            flex-direction: column; 
            align-items: center; /* Center horizontally */
            justify-content: center; /* Center vertically */
            padding: 20px;
            overflow-y: auto;
          }
          .chart-wrapper { 
            width: 100%;
            max-width: 900px; /* Keeps charts readable */
            margin-bottom: 30px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); 
            border-radius: 8px;
            background: #fff;
            padding: 20px;
            text-align: center;
          }
          h3 {
            font-size: 20px; 
            margin-bottom: 10px;
          }
          canvas {
            width: 100% !important; 
            height: 350px !important; 
          }
        </style>
      </head>
      <body>
        <div id="sidebar">
          <h3>Files</h3>
          <ul id="file-list">
            ${fileList.map(file => `<li class="file-item" onclick="selectFile('${file}')">${file}</li>`).join('')}
          </ul>
        </div>
        <div class="chart-container" id="chart-container"></div>
        
        <script>
          const vscode = acquireVsCodeApi();
          function selectFile(fileName) {
            vscode.postMessage({ type: "fileSelected", fileName });
          }
  
          window.addEventListener("message", event => {
            const { type, fileMetrics } = event.data;
            if (type === "updateCharts") {
              document.getElementById("chart-container").innerHTML = fileMetrics.map((file, index) => \`
                <div class="chart-wrapper">
                  <h3>\${file.folderName}</h3>
                  <canvas id="metricsChart\${index}"></canvas>
                </div>
              \`).join('');
  
              fileMetrics.forEach((file, index) => {
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
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                  }
                });
              });
            }
          });
        </script>
      </body>
      </html>
    `;
  }
  
  
  
  
}
