import fetch from "node-fetch";
import fs from "fs";
import path from "path";


export class ServerMetricsManager {
  protected readonly serverUrl: string;
  protected readonly apiKey: string;


  constructor() {




    // Update this to your AWS API Gateway endpoint
    this.serverUrl =
      "https://beo09xx2gh.execute-api.eu-north-1.amazonaws.com/prod";

    // API key is hardcoded for AWS API Gateway
    this.apiKey = "yeGY1v9j8MiOSorrOrnMtQx8KPeHGOSm"; // Replace with your actual API key

    // Debug logging (remove in production)
    console.log("AWS API Gateway URL:", this.serverUrl);
    console.log("API Key configured:", this.apiKey ? "✓" : "✗");
  }

  /**
   * Get headers with API key for AWS API Gateway requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key header if available
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    return headers;
  }

  // Function to check if the server is online
  async checkServerStatus() {
    try {
      const response = await fetch(`${this.serverUrl}/`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (response.ok) {
        console.log(
          "CodePure Extension: Successfully Connected To AWS API Gateway."
        );
        const data = await response.text();
        console.log(data);
        return true;
      } else {
        console.error(
          "AWS API Gateway is not responding:",
          response.statusText
        );
        console.error("Response status:", response.status);

        // Try to get error details
        try {
          const errorData = await response.text();
          console.error("Error response body:", errorData);
        } catch (e) {
          console.error("Could not read error response body");
        }

        return false;
      }
    } catch (error) {
      console.error("Error connecting to AWS API Gateway:", error);
      return false;
    }
  }

  /**
   * Sends a metrics file to the AWS API Gateway and gets predictions back
   * @param filePath Path to specific metrics file
   * @returns Promise with the server response
   */
  async sendMetricsFile(filePath?: string) {
    try {
      // Check if API key is available
      if (!this.apiKey || this.apiKey === "YOUR_API_KEY_HERE") {
        console.error(
          "Cannot send metrics: API key is not configured. Please update the hardcoded API key in the constructor."
        );
        return null;
      }

      // If no specific file path is provided, use the last metrics file
      if (!filePath) {
        const resultsDir = path.join(__dirname, "..", "src", "Results");
        const resultsPath = resultsDir;

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
        filePath = filePath;
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

      // Add filename to metrics data for identification
      const fileName = path.basename(metricsData.fullPath);
      metricsData.fileName = fileName;

      // Wrap the metrics data in an array to match server expectations
      const serverReadyData = [metricsData];

      console.log(
        "Sending data to AWS API Gateway:",
        JSON.stringify(serverReadyData, null, 2)
      );

      const response = await fetch(`${this.serverUrl}/metrics`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(serverReadyData), // Send as array
      });

      if (response.ok) {
        console.log("CodePure Extension: Metrics Sent To AWS API Gateway.");
        const data = await response.json();
        console.log("AWS Response:", data);

        // The response structure matches what you showed:
        // {
        //   "message": "CodePure server: data received successfully. (Mock response for testing)",
        //   "predictions": [{"Brain Class": 0, "Data Class": 0, "God Class": 1, "Schizofrenic Class": 0, "fileName": "Godclass"}]
        // }

        return data;
      } else {
        console.error(
          "Failed to send metrics to AWS API Gateway:",
          response.statusText
        );
        console.error("Response status:", response.status);

        // Try to get error details from response
        try {
          const errorData = await response.text();
          console.error("Error response body:", errorData);
        } catch (e) {
          console.error("Could not read error response body");
        }

        return null;
      }
    } catch (error) {
      console.error("Error connecting to AWS API Gateway:", error);
      return null;
    }
  }

  /**
   * Sends all metrics files in the Results directory to the AWS API Gateway
   * This can be useful for batch analysis
   * @returns Promise with an array of server responses
   */
  async sendAllMetricsFiles() {
    try {


      const resultsDir = path.join(__dirname, "..", "src", "Results");
      const resultsPath = resultsDir;

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

        // Add a small delay between requests to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        `Sent ${responses.length} out of ${files.length} metrics files to AWS API Gateway`
      );
      return responses;
    } catch (error) {
      console.error(
        "Error sending all metrics files to AWS API Gateway:",
        error
      );
      return [];
    }
  }
}
