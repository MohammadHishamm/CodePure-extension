"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPanel = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DashboardPanel {
    static currentPanel;
    _panel;
    _extensionUri;
    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null);
    }
    static show(extensionUri) {
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._update(); // Ensure data refreshes
            DashboardPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return;
        }
        const panel = vscode.window.createWebviewPanel("dashboard", "CodePure Dashboard", vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
        });
        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
    }
    dispose() {
        DashboardPanel.currentPanel = undefined;
        this._panel.dispose();
    }
    _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }
    _getHtmlForWebview() {
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
    _getMetricsData() {
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
        }
        catch (err) {
            console.error("Error reading metrics file:", err);
            return { metrics: [] };
        }
    }
}
exports.DashboardPanel = DashboardPanel;
//# sourceMappingURL=DashboardPanel.js.map