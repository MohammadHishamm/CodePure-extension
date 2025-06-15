import * as fs from "fs";
import * as path from "path";
import { MetricsNotifier } from "../Core/MetricsNotifier";
import { MetricsFileFormat } from "../Interface/MetricsFileFormat";
import { Metric } from "../Core/Metric";

export class MetricsSaver {
  private filePath: string;
  private notifier: MetricsNotifier; // Add notifier reference

  constructor(notifier: MetricsNotifier) {
    this.filePath = path.join(
      __dirname,"..", "MetricsCalculated.json"
    );


    // Ensure the 'results' folder exists
    const resultsDir = path.dirname(this.filePath);


    // Check if the directory exists, if not, create it
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
      console.log(`'Results' folder created at: ${resultsDir}`);
    } else {
      console.log(`'Results' folder already exists at: ${resultsDir}`);
    }
    // Inject the MetricsNotifier to the class
    this.notifier = notifier;
  }

  saveMetrics(metrics: Metric[], fullPath: string): void {
    let fileName = path.basename(fullPath);
    const parentDir = path.dirname(fullPath);
    let folderName = path.basename(parentDir);

    folderName += `/${fileName}`;

    if (metrics.length === 0) {
      console.log("No metrics to save.");
      return;
    }

    let currentData: MetricsFileFormat[] = [];
    try {
      const data = fs.readFileSync(this.filePath, "utf8").trim();
      if (data === "") {
        console.log("Metrics file is empty, initializing new data.");
      } else {
        currentData = JSON.parse(data);
      }
    } catch (err) {
      if (err === "ENOENT") {
        console.log("Metrics file does not exist, creating a new one.");
      } else {
        console.log("Failed to read or parse metrics file.");
        console.error(err);
        return;
      }
    }

    const existingIndex = currentData.findIndex(
      (item) => item.fullPath === fullPath
    );
    if (existingIndex !== -1) {
      currentData[existingIndex].metrics = metrics;
    } else {
      currentData.push({ fullPath, folderName, metrics });
    }

    // Save the updated data to the file
    this.writeToFile(currentData);

    // Notify observers that metrics have been updated
    this.notifier.notify("Metrics Updated", currentData);
  }

  private writeToFile(data: MetricsFileFormat[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      console.log("Metrics saved to Metrics.json.");
    } catch (err) {
      console.log("Failed to save metrics to file.");
      console.error(err);
    }
  }
}
