"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMetricsManager = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
class ServerMetricsManager {
    serverUrl;
    apiKey;
    filePath;
    constructor() {
        this.filePath = path_1.default.resolve(__dirname, "..", ".env");
        this.filePath = this.filePath.replace(/out[\\\/]?/, "");
        dotenv_1.default.config({ path: this.filePath });
        this.serverUrl = "http://localhost:3000";
        if (!process.env.API_KEY) {
            throw new Error("API_KEY is missing in the .env file");
        }
        this.apiKey = process.env.API_KEY;
    }
    // Function to check if the server is online
    async checkServerStatus() {
        try {
            const response = await (0, node_fetch_1.default)(`${this.serverUrl}/`, {
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
            }
            else {
                console.error("Server is not responding:", response.statusText);
                return false;
            }
        }
        catch (error) {
            console.error("Error connecting to server:", error);
            return false;
        }
    }
    /**
     * Sends a metrics file to the server and gets predictions back
     * @param filePath Path to specific metrics file
     * @returns Promise with the server response
     */
    async sendMetricsFile(filePath) {
        try {
            // If no specific file path is provided, use the last metrics file
            if (!filePath) {
                const resultsDir = path_1.default.join(__dirname, "..", "src", "Results");
                const resultsPath = resultsDir.replace(/out[\\\/]?/, "");
                // Get all JSON files in the Results directory
                const files = fs_1.default
                    .readdirSync(resultsPath)
                    .filter((file) => file.endsWith(".json"));
                if (files.length === 0) {
                    console.log("No metrics files found in the Results directory.");
                    return null;
                }
                // Use the most recently modified file
                const fileStats = files.map((file) => ({
                    file,
                    mtime: fs_1.default.statSync(path_1.default.join(resultsPath, file)).mtime,
                }));
                fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
                filePath = path_1.default.join(resultsPath, fileStats[0].file);
                console.log(`Using most recent metrics file: ${filePath}`);
            }
            else {
                // Ensure the path is correct when provided
                filePath = filePath.replace(/out[\\\/]?/, "");
            }
            if (!fs_1.default.existsSync(filePath)) {
                console.error(`Metrics file not found: ${filePath}`);
                return null;
            }
            const fileContent = fs_1.default.readFileSync(filePath, "utf8");
            if (!fileContent.trim()) {
                console.log("The metrics file is empty.");
                return null;
            }
            const metricsData = JSON.parse(fileContent);
            // Wrap the metrics data in an array to match server expectations
            const serverReadyData = [metricsData];
            console.log("Sending data to server:", JSON.stringify(serverReadyData, null, 2));
            const response = await (0, node_fetch_1.default)(`${this.serverUrl}/metrics`, {
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
            }
            else {
                console.error("Failed to send metrics file:", response.statusText);
                return null;
            }
        }
        catch (error) {
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
            const resultsDir = path_1.default.join(__dirname, "..", "src", "Results");
            const resultsPath = resultsDir.replace(/out[\\\/]?/, "");
            if (!fs_1.default.existsSync(resultsPath)) {
                console.error("Results directory not found");
                return [];
            }
            const files = fs_1.default
                .readdirSync(resultsPath)
                .filter((file) => file.endsWith(".json"));
            const responses = [];
            for (const file of files) {
                const filePath = path_1.default.join(resultsPath, file);
                const response = await this.sendMetricsFile(filePath);
                if (response) {
                    responses.push({
                        file,
                        response,
                    });
                }
            }
            console.log(`Sent ${responses.length} out of ${files.length} metrics files to server`);
            return responses;
        }
        catch (error) {
            console.error("Error sending all metrics files:", error);
            return [];
        }
    }
}
exports.ServerMetricsManager = ServerMetricsManager;
//# sourceMappingURL=ServerMetricsManager.js.map