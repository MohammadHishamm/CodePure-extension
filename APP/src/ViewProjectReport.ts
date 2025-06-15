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
    const metricsData = this._getMetricsData();
    this._panel.webview.html = this._getHtmlForWebview(metricsData);
  }

  private _getMetricsData() {
    let resultsDir = path.join(__dirname, "Results");

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
            // Extract just the filename without path for display
            metricsData.displayName = path.basename(metricsData.folderName);
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

  private _getHtmlForWebview(metricsData: any[]): string {
    // Create the file list items with proper event handling
    const fileListItems = metricsData
      .map(
        (file) =>
          `<li class="file-item" data-fullpath="${file.folderName}" title="${
            file.folderName
          }">${file.displayName || path.basename(file.folderName)}</li>`
      )
      .join("");

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
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .file-item:hover { 
            background: #333; 
          }
          .file-item.active {
            background: #1e8ad6;
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
          #no-selection {
            color: #888;
            font-size: 18px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div id="sidebar">
          <h3>Files</h3>
          <ul id="file-list">
            ${fileListItems}
          </ul>
        </div>
        <div class="chart-container" id="chart-container">
          <div id="no-selection">Select a file to view metrics</div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          // Add click event listeners to all file items
          document.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', function() {
              // Remove active class from all items
              document.querySelectorAll('.file-item').forEach(i => 
                i.classList.remove('active'));
              
              // Add active class to clicked item
              this.classList.add('active');
              
              // Get the full path from data attribute
              const fullPath = this.getAttribute('data-fullpath');
              
              // Send message to extension
              vscode.postMessage({ 
                type: "fileSelected", 
                fileName: fullPath 
              });
            });
          });
  
          window.addEventListener("message", event => {
            const { type, fileMetrics } = event.data;
            if (type === "updateCharts") {
              if (fileMetrics && fileMetrics.length > 0) {
                document.getElementById("chart-container").innerHTML = fileMetrics.map((file, index) => \`
                  <div class="chart-wrapper">
                    <h3>\${file.displayName || file.folderName}</h3>
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
              } else {
                document.getElementById("chart-container").innerHTML = 
                  '<div id="no-selection">No metrics available for this file</div>';
              }
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}
