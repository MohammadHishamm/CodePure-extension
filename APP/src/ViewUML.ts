import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { UMLExtractor } from "./services/UMLExtractor";

export class UMLDashboard {
  public static currentPanel: UMLDashboard | undefined;
  private readonly _panel: vscode.WebviewPanel;

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;
    this._update();

    this._panel.onDidDispose(() => this.dispose(), null);
  }

  public static show(classesData: any) {
    if (UMLDashboard.currentPanel) {
      UMLDashboard.currentPanel._update();
      UMLDashboard.currentPanel._panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "umlDashboard",
      "CodePure UML Diagram",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    UMLExtractor.extract(classesData); // Extract UML data
    UMLDashboard.currentPanel = new UMLDashboard(panel);
  }

  public dispose() {
    UMLDashboard.currentPanel = undefined;
    this._panel.dispose();
  }

  private _update() {
    const umlData = this._getExtractedUML();
    const hasData = umlData.nodes.length > 0 || umlData.edges.length > 0;
    const mermaidCode = hasData ? this._convertToMermaid(umlData) : "";

    this._panel.webview.html = this._getHtmlForWebview(mermaidCode, hasData);
  }

  private _getExtractedUML(): any {
    const resultsDir = path.join(__dirname, "uml");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, "ExtractedClasses.json");

    if (fs.existsSync(filePath)) {
      try {
        const rawData = fs.readFileSync(filePath, "utf8");
        if (!rawData || rawData.trim() === "") {
          console.warn("⚠️ UML data file is empty.");
          return { nodes: [], edges: [] };
        }
        return JSON.parse(rawData);
      } catch (err) {
        console.error("❌ Error reading UML data:", err);
        return { nodes: [], edges: [] };
      }
    }

    console.warn("⚠️ UML data file does not exist:", filePath);
    return { nodes: [], edges: [] };
  }

  private _convertToMermaid(umlData: any): string {
    let mermaidCode = "classDiagram\n";
    const classMembers: Record<string, string[]> = {};

    for (const node of umlData.nodes) {
      const nodeId = node.data.id;
      const nodeLabel = node.data.label;

      if (nodeLabel.startsWith("Field: ")) {
        const [fieldName, fieldType] = nodeLabel.replace("Field: ", "").split(" : ");
        const className = nodeId.split(".")[0];
        if (!classMembers[className]) classMembers[className] = [];
        classMembers[className].push(`  - ${fieldName}: ${fieldType}`);
      } else if (nodeLabel.startsWith("Method: ")) {
        const methodSignature = nodeLabel.replace("Method: ", "+ ");
        const className = nodeId.split(".")[0];
        if (!classMembers[className]) classMembers[className] = [];
        classMembers[className].push(`  ${methodSignature}`);
      }
    }

    for (const node of umlData.nodes) {
      if (!node.data.id.includes(".")) {
        const className = node.data.id;
        if (classMembers[className]?.length) {
          mermaidCode += `  class ${className} {\n`;
          mermaidCode += classMembers[className].join("\n") + "\n";
          mermaidCode += "}\n";
        } else {
          mermaidCode += `  class ${className}\n`;
        }
      }
    }

    for (const edge of umlData.edges) {
      if (edge.data.label === "inherits") {
        mermaidCode += `  ${edge.data.target} <|-- ${edge.data.source}\n`;
      } else if (edge.data.label === "implements") {
        mermaidCode += `  ${edge.data.target} <|.. ${edge.data.source}\n`;
      } else if (edge.data.label === "uses") {
        mermaidCode += `  ${edge.data.source} --> ${edge.data.target}\n`;
      }
    }

    return mermaidCode;
  }

  private _getHtmlForWebview(mermaidCode: string, hasData: boolean): string {
    const diagramHtml = hasData
      ? `<div class="mermaid">${mermaidCode}</div>`
      : `<div class="no-data">🚫 No UML data to generate</div>`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <title>CodePure Class Diagram</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #1e1e1e;
            color: #ffffff;
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          h2 {
            margin-bottom: 20px;
          }
          #uml-container {
            width: 90%;
            max-width: 1200px;
            text-align: center;
          }
          .mermaid {
            background: #fff;
            color: #000;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
          }
          .no-data {
            font-size: 18px;
            color: #ff6b6b;
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.2);
          }
          .refresh-btn, .save-btn {
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #007acc;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          .refresh-btn:hover, .save-btn:hover {
            background-color: #005f8b;
          }
        </style>
      </head>
      <body>
        <h2>CodePure UML Diagram</h2>
        <div id="uml-container">${diagramHtml}</div>

        <script>
          const vscode = acquireVsCodeApi();
          document.addEventListener("DOMContentLoaded", () => {
            ${hasData ? `
              mermaid.initialize({ startOnLoad: false });
              mermaid.init(undefined, ".mermaid").catch(err => {
                console.error("Mermaid error:", err);
              });
            ` : ""}

          });
        </script>
      </body>
      </html>
    `;
  }
}
