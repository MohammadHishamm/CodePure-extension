import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

export class ServerMetricsManager {
  protected readonly serverUrl: string;
  protected readonly apiKey: string;
  protected readonly filePath: string;

  constructor() {
    this.filePath = path.resolve(__dirname, "..", ".env");
    this.filePath = this.filePath.replace(/out[\\\/]?/, "");

    dotenv.config({ path: this.filePath });

    this.serverUrl = "http://localhost:3000";
    if (!process.env.API_KEY) {
      throw new Error("API_KEY is missing in the .env file");
    }
    this.apiKey = process.env.API_KEY;
  }

  // Function to check if the server is online
  async checkServerStatus() {
    try {
      const response = await fetch(`${this.serverUrl}/`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
        },
      });

      if (response.ok) {
        console.log("CodePure Extension: Trying To Connect To The Server.");
        const data = await response.text();
        console.log(data);
        return true;
      } else {
        console.error("Server is not responding:", response.statusText);
        return false;
      }
    } catch (error) {
      console.error("Error connecting to server:", error);
      return false;
    }
  }

  /**
   * Sends a metrics file to the server and gets predictions back
   * @param filePath Path to specific metrics file
   * @returns Promise with the server response
   */
  async sendMetricsFile(filePath?: string) {
    try {
      // If no specific file path is provided, use the last metrics file
      if (!filePath) {
        const resultsDir = path.join(__dirname, "..", "src", "Results");
        const resultsPath = resultsDir.replace(/out[\\\/]?/, "");

        // Get all JSON files in the Results directory
        const files = fs
          .readdirSync(resultsPath)
          .filter((file) => file.endsWith(".json"));

        if (files.length === 0) {
          console.log("No metrics files found in the Results directory.");
          return null;
        }

        // Use the most recently modified file
        const fileStats = files.map((file) => ({
          file,
          mtime: fs.statSync(path.join(resultsPath, file)).mtime,
        }));

        fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        filePath = path.join(resultsPath, fileStats[0].file);

        console.log(`Using most recent metrics file: ${filePath}`);
      } else {
        // Ensure the path is correct when provided
        filePath = filePath.replace(/out[\\\/]?/, "");
      }

      if (!fs.existsSync(filePath)) {
        console.error(`Metrics file not found: ${filePath}`);
        return null;
      }

      const fileContent = fs.readFileSync(filePath, "utf8");
      if (!fileContent.trim()) {
        console.log("The metrics file is empty.");
        return null;
      }

      const metricsData = JSON.parse(fileContent);

      // Wrap the metrics data in an array to match server expectations
      const serverReadyData = [metricsData];

      console.log(
        "Sending data to server:",
        JSON.stringify(serverReadyData, null, 2)
      );

      const response = await fetch(`${this.serverUrl}/metrics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify(serverReadyData), // Send as array
      });

      if (response.ok) {
        console.log("CodePure Extension: Metrics Sent To The Server.");
        const data = await response.json();
        console.log(data);
        return data;
      } else {
        console.error("Failed to send metrics file:", response.statusText);
        return null;
      }
    } catch (error) {
      console.error("Error connecting to server:", error);
      return null;
    }
  }

  /**
   * Sends all metrics files in the Results directory to the server
   * This can be useful for batch analysis
   * @returns Promise with an array of server responses
   */
  async sendAllMetricsFiles() {
    try {
      const resultsDir = path.join(__dirname, "..", "src", "Results");
      const resultsPath = resultsDir.replace(/out[\\\/]?/, "");

      if (!fs.existsSync(resultsPath)) {
        console.error("Results directory not found");
        return [];
      }

      const files = fs
        .readdirSync(resultsPath)
        .filter((file) => file.endsWith(".json"));
      const responses = [];

      for (const file of files) {
        const filePath = path.join(resultsPath, file);
        const response = await this.sendMetricsFile(filePath);
        if (response) {
          responses.push({
            file,
            response,
          });
        }
      }

      console.log(
        `Sent ${responses.length} out of ${files.length} metrics files to server`
      );
      return responses;
    } catch (error) {
      console.error("Error sending all metrics files:", error);
      return [];
    }
  }
}
