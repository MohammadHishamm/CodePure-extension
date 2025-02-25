import * as vscode from "vscode";
import { MetricsFactory } from "../Factory/MetricsFactory";
import {
  metricsSaver,
  servermetricsmanager,
  FECFcode,
  pythonParser,
  javaParser,
} from "../initialize";
import { pause } from "../utils";

let isAnalyzing = false;

export async function analyzeCode(
  document: vscode.TextDocument,
  sourceCode: string
): Promise<string> {
  if (isAnalyzing) {
    vscode.window.showInformationMessage(
      "Analysis is already running. Please wait..."
    );
    return "Analysis in progress";
  }

  isAnalyzing = true;

  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Analyzing ${document.languageId} code`,
      cancellable: false,
    },
    async (progress) => {
      const parser =
        document.languageId === "java" ? new javaParser() : new pythonParser();
      parser.selectLanguage();

      const rootNode = parser.parse(sourceCode);

      const metricsToCalculate = [
        "LOC",
        "AMW",
        "CBO",
        // "ATFD",
        "FDP",
        // "LAA",
        // "NrFE",
        // "CBO",
        "DAC",
        "WMC",
        "WOC",
        "NOA",
        "NOM",
        "NOAM",
        "NOPA",
        "NAbsm",
        "NProtM",
        // "FANOUT",
        // "NDU",
        "NAS",
        "PNAS",
        // "BUR",
        // "NOD",
        // "NODD",
        "TCC",
        "DIT",
      ];

      try {
        progress.report({ message: "Initializing parser...", increment: 10 });
        await pause(500); // Simulate processing delay

        progress.report({ message: "Parsing source code...", increment: 20 });
        await pause(500);

        progress.report({
          message: "Extracting Components From Code...",
          increment: 30,
        });
        await pause(500);
        await FECFcode.parseAllJavaFiles();

        const results = await calculateMetricsWithProgress(
          document,
          rootNode,
          sourceCode,
          document.languageId,
          metricsToCalculate,
          progress
        );

        if (results) {
          vscode.window.showInformationMessage("Analysis is Finished.");
          servermetricsmanager.sendMetricsFile();
        } else {
          vscode.window.showInformationMessage(
            "Error Occured While Analyzing."
          );
        }

        return results;
      } finally {
        isAnalyzing = false;
      }
    }
  );
}

export async function AnalyzeSelctedCode(
  document: vscode.TextDocument,
  sourceCode: string
): Promise<string> {
  if (isAnalyzing) {
    vscode.window.showInformationMessage(
      "Analysis is already running. Please wait..."
    );
    return "Analysis in progress";
  }

  isAnalyzing = true;

  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Analyzing Selected code in ${document.languageId}`,
      cancellable: false,
    },
    async (progress) => {
      const parser =
        document.languageId === "java" ? new javaParser() : new pythonParser();
      parser.selectLanguage();

      const rootNode = parser.parse(sourceCode);
      const metricsToCalculate = vscode.workspace
        .getConfiguration("codepure")
        .get<string[]>("selectedMetrics", []);

      try {
        progress.report({ message: "Initializing parser...", increment: 10 });
        await pause(500); // Simulate processing delay

        progress.report({ message: "Parsing source code...", increment: 20 });
        await pause(500);

        const results = await calculateMetricsWithProgress(
          document,
          rootNode,
          sourceCode,
          document.languageId,
          metricsToCalculate,
          progress
        );

        servermetricsmanager.sendMetricsFile();

        return results;
      } finally {
        isAnalyzing = false;
      }
    }
  );
}

async function calculateMetricsWithProgress(
  document: vscode.TextDocument,
  rootNode: any,
  sourceCode: string,
  languageId: string,
  metrics: string[],
  progress: vscode.Progress<{ message: string; increment: number }>
): Promise<string> {
  const results: string[] = [];
  for (const [index, metricName] of metrics.entries()) {
    const metricCalculator = MetricsFactory.CreateMetric(
      metricName,
      languageId
    );
    if (metricCalculator) {
      const value = metricCalculator.calculate(
        rootNode,
        FECFcode,
        document.fileName
      );
      results.push(`${metricName}: ${value}`);
      // Update progress
      progress.report({
        message: `Calculating ${metricName}...`,
        increment: 70 / metrics.length, // Distribute remaining progress evenly
      });
      await pause(300); // Simulate delay for each metric
    }
  }

  metricsSaver.saveMetrics(
    results.map((result) => {
      const [name, value] = result.split(": ");
      return { name, value: parseFloat(value) };
    }),
    document.fileName
  );

  return results.join("\n");
}
