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

  async sendMetricsFile() {
    let filePath = path.join(
      __dirname,
      "..",
      "src",
      "Results",
      "MetricsCalculated.json"
    );

    filePath = filePath.replace(/out[\\\/]?/, "");

    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      if (!fileContent.trim()) {
        console.log("The metrics file is empty.");
        return;
      }

      const metricsData = JSON.parse(fileContent);

      const response = await fetch(`${this.serverUrl}/metrics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify(metricsData),
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
}
