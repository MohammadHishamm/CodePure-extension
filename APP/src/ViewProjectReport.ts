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
    return metricsData.map((file) => file.folderName);
  }

  private _getMetricsData() {
    let resultsDir = path
      .join(__dirname, "..", "src", "Results")
      .replace(/out[\\\/]?/, "");

    console.log(`Fetching metrics from directory: ${resultsDir}`);

    if (!fs.existsSync(resultsDir)) {
      console.error("Results directory does not exist.");
      return [];
    }

    try {
      // Read all files in the Results directory
      console.log(`Reading directory contents of: ${resultsDir}`);
      const allFiles = fs.readdirSync(resultsDir);
      console.log(`All files in directory: ${allFiles.join(", ")}`);

      // Filter for JSON files only
      const files = allFiles.filter((file) => file.endsWith(".json"));

      if (files.length === 0) {
        console.log("No metrics files found in directory.");
        return [];
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
          if (
            metricsData.fullPath &&
            metricsData.folderName &&
            Array.isArray(metricsData.metrics)
          ) {
            allMetricsData.push(metricsData);
          } else {
            console.log(`Invalid metrics structure in file: ${file}`);
          }
        } catch (parseError) {
          console.error(`Error reading or parsing file ${file}:`, parseError);
        }
      }

      if (allMetricsData.length === 0) {
        console.log("No valid metrics data found in any files.");
        return [];
      }

      console.log(
        `Successfully loaded ${allMetricsData.length} metrics records`
      );
      return allMetricsData;
    } catch (err) {
      console.error("Error fetching metrics data:", err);
      return [];
    }
  }

  private _setupMessageListener() {
    this._panel.webview.onDidReceiveMessage((message) => {
      if (message.type === "fileSelected") {
        const metricsData = this._getMetricsData();
        const fileMetrics = metricsData.find(
          (file) => file.folderName === message.fileName
        );

        this._panel.webview.postMessage({
          type: "updateCharts",
          fileMetrics: fileMetrics ? [fileMetrics] : [],
        });
      }
    }, undefined);
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
            ${fileList
              .map(
                (file) =>
                  `<li class="file-item" onclick="selectFile('${file}')">${file}</li>`
              )
              .join("")}
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
