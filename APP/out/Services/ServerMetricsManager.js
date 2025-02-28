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
        this.filePath = path_1.default.resolve(__dirname, '..', '.env');
        this.filePath = this.filePath.replace(/out[\\\/]?/, "");
        dotenv_1.default.config({ path: this.filePath });
        this.serverUrl = 'http://localhost:3000';
        if (!process.env.API_KEY) {
            throw new Error('API_KEY is missing in the .env file');
        }
        this.apiKey = process.env.API_KEY;
    }
    // Function to check if the server is online
    async checkServerStatus() {
        try {
            const response = await (0, node_fetch_1.default)(`${this.serverUrl}/`, {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey,
                },
            });
            if (response.ok) {
                console.log("CodePure Extension: Trying To Connect To The Server.");
                const data = await response.text();
                console.log(data);
                return true;
            }
            else {
                console.error('Server is not responding:', response.statusText);
                return false;
            }
        }
        catch (error) {
            console.error('Error connecting to server:', error);
            return false;
        }
    }
    async sendMetricsFile() {
        let filePath = path_1.default.join(__dirname, "..", "src", "Results", "MetricsCalculated.json");
        filePath = filePath.replace(/out[\\\/]?/, "");
        try {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf8');
            if (!fileContent.trim()) {
                console.log('The metrics file is empty.');
                return;
            }
            const metricsData = JSON.parse(fileContent);
            const response = await (0, node_fetch_1.default)(`${this.serverUrl}/metrics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                },
                body: JSON.stringify(metricsData),
            });
            if (response.ok) {
                console.log('CodePure Extension: Metrics Sent To The Server.');
                const data = await response.json();
                console.log(data);
                return data;
            }
            else {
                console.error('Failed to send metrics file:', response.statusText);
                return null;
            }
        }
        catch (error) {
            console.error('Error connecting to server:', error);
            return null;
        }
    }
}
exports.ServerMetricsManager = ServerMetricsManager;
//# sourceMappingURL=ServerMetricsManager.js.map