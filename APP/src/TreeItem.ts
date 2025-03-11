import * as vscode from "vscode";
import { Metric } from "./Core/Metric";

export class TreeItem extends vscode.TreeItem {
    children?: TreeItem[];
  
    constructor(
      public readonly label: string,
      children: TreeItem[] = [],
      collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed,
      public metrics: Metric[] = []
    ) {
      super(label, collapsibleState);
  
      this.tooltip = `${label}`;
      this.description = metrics.length > 0 ? `${metrics.length} metrics` : "";
      this.contextValue = metrics.length > 0 ? "fileWithMetrics" : "file";
  
      // Assign children properly
      if (children.length > 0) {
        this.children = children;
      } else if (metrics.length > 0) {
        this.children = metrics.map(metric => 
          new TreeItem(`${metric.name}: ${metric.value}`, [], vscode.TreeItemCollapsibleState.None)
        );
      }
    }
  }