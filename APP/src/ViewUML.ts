import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
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
    const mermaidCode = this._convertToMermaid(umlData);

    this._panel.webview.html = this._getHtmlForWebview(mermaidCode);
  }

  private _getExtractedUML(): any {
    const filePath = path.join(__dirname, "..", "src", "Results", "ExtractedClasses.json").replace(/out[\\\/]?/, "");
    
    if (fs.existsSync(filePath)) {
      try {
        const rawData = fs.readFileSync(filePath, "utf8");
        return JSON.parse(rawData);
      } catch (err) {
        console.error("❌ Error reading UML data:", err);
        return { nodes: [], edges: [] };
      }
    }

    return { nodes: [], edges: [] };
  }

  private _convertToMermaid(umlData: any): string 
  {
    
    let mermaidCode = "classDiagram\n";
  
    const classMembers: Record<string, string[]> = {};
  
    for (const node of umlData.nodes) {
      const nodeId = node.data.id;
      const nodeLabel = node.data.label;
  
      // Detect fields
      if (nodeLabel.startsWith("Field: ")) {
        const [fieldName, fieldType] = nodeLabel.replace("Field: ", "").split(" : ");
        const className = nodeId.split(".")[0]; 
        if (!classMembers[className]) classMembers[className] = [];
        classMembers[className].push(`  - ${fieldName}: ${fieldType}`);
      }
  
      // Detect methods
      else if (nodeLabel.startsWith("Method: ")) {
        const methodSignature = nodeLabel.replace("Method: ", "+ "); 
        const className = nodeId.split(".")[0];
        if (!classMembers[className]) classMembers[className] = [];
        classMembers[className].push(`  ${methodSignature}`);
      }
    }
  
    // Add classes and their members
    for (const node of umlData.nodes) {
      // Lw Class
      if (!node.data.id.includes(".")) { 
        const className = node.data.id;
        if (classMembers[className] && classMembers[className].length > 0) {
          mermaidCode += `  class ${className} {\n`;
          mermaidCode += classMembers[className].join("\n") + "\n";
          mermaidCode += "}\n";
        } else {
          mermaidCode += `  class ${className}\n`;
        }
      }
    }
  
    // Add relationships
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
  
  
  private _getHtmlForWebview(mermaidCode: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  
        <title>CodePure Class Diagram</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
  
          body { 
            font-family: "Arial", sans-serif; 
            background: #1e1e1e; 
            color: #ffffff; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            width: 100vw;
            margin: 0; 
            overflow: hidden;
          }
  
          h2 {
            text-align: center;
            margin-bottom: 20px;
          }
  
          #loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }
  
          .spinner {
            width: 60px;
            height: 60px;
            border: 6px solid rgba(255, 255, 255, 0.3);
            border-top: 6px solid #ffffff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
  
          .loading-text {
            margin-top: 10px;
            font-size: 16px;
            font-weight: bold;
            color: #ffffff;
            text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
          }
  
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
  
          #uml-container {
            opacity: 0;
            transition: opacity 1s ease-in-out;
            width: 90%;
            max-width: 1200px;
          }
  
          .mermaid {
            background: #ffffff !important;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
            transition: transform 0.3s ease-in-out;
            text-align: center;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
  
          .mermaid:hover {
            transform: scale(1.02);
          }
  
          .export-buttons {
            display: none;
            margin-top: 20px;
            gap: 10px;
          }
  
          .export-buttons button {
            background: #0078D4;
            color: white;
            border: none;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 5px;
            transition: background 0.3s;
            font-size: 14px;
          }
  
          .export-buttons button:hover {
            background: #005fa3;
          }
        </style>
      </head>
      <body>
        <h2>CodePure UML Diagram</h2>
        <div id="loading">
          <div class="spinner"></div>
          <div class="loading-text">Generating UML...</div>
        </div>
        <div id="uml-container">
          <div class="mermaid">
            ${mermaidCode}
          </div>
        </div>
        <div class="export-buttons" id="export-btn">
          <button onclick="saveUmlFile('svg')">💾 Save as SVG</button>
          <button onclick="saveUmlFile('png')">💾 Save as PNG</button>
        </div>
  
        <script>
          const vscode = acquireVsCodeApi();
  
          document.addEventListener("DOMContentLoaded", () => {
            const loading = document.getElementById("loading");
            const umlContainer = document.getElementById("uml-container");
            const exportButtons = document.getElementById("export-btn");
  
            loading.style.display = "flex";
  
            mermaid.initialize({ startOnLoad: false });
  
            setTimeout(() => {
              mermaid.init(undefined, ".mermaid").then(() => {
                loading.style.display = "none";
                umlContainer.style.opacity = "1";
                exportButtons.style.display = "flex";
              }).catch((error) => {
                console.error("Error during mermaid initialization:", error);
                alert("Failed to generate UML diagram. Check the console for details.");
              });
            }, 1000);
          });
  
          function saveUmlFile(format) {
            const svgElement = document.querySelector(".mermaid svg");
  
            if (!svgElement) {
              console.error("Error: UML diagram not found!");
              alert("Error: UML diagram not found!");
              return;
            }
  
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
  
            if (format === "svg") {
              vscode.postMessage({ type: "saveUml", fileType: "svg", content: svgString });
            } else if (format === "png") {
              convertSvgToPng(svgString);
            }
          }
  
          function convertSvgToPng(svgString) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);
  
            img.onload = function () {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              URL.revokeObjectURL(url);
  
              canvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = function () {
                  vscode.postMessage({ type: "saveUml", fileType: "png", content: reader.result });
                };
              }, "image/png");
            };
  
            img.onerror = function (error) {
              console.error("Error while loading SVG image:", error);
              alert("Error while loading SVG image.");
            };
  
            img.src = url;
          }
        </script>
      </body>
      </html>
    `;
  }
  
  
  
  
  
}
