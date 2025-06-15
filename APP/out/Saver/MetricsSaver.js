"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsSaver = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MetricsSaver {
    filePath;
    notifier; // Add notifier reference
    constructor(notifier) {
        this.filePath = path.join(__dirname, "..", "MetricsCalculated.json");
        // Ensure the 'results' folder exists
        const resultsDir = path.dirname(this.filePath);
        // Check if the directory exists, if not, create it
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
            console.log(`'Results' folder created at: ${resultsDir}`);
        }
        else {
            console.log(`'Results' folder already exists at: ${resultsDir}`);
        }
        // Inject the MetricsNotifier to the class
        this.notifier = notifier;
    }
    saveMetrics(metrics, fullPath) {
        let fileName = path.basename(fullPath);
        const parentDir = path.dirname(fullPath);
        let folderName = path.basename(parentDir);
        folderName += `/${fileName}`;
        if (metrics.length === 0) {
            console.log("No metrics to save.");
            return;
        }
        let currentData = [];
        try {
            const data = fs.readFileSync(this.filePath, "utf8").trim();
            if (data === "") {
                console.log("Metrics file is empty, initializing new data.");
            }
            else {
                currentData = JSON.parse(data);
            }
        }
        catch (err) {
            if (err === "ENOENT") {
                console.log("Metrics file does not exist, creating a new one.");
            }
            else {
                console.log("Failed to read or parse metrics file.");
                console.error(err);
                return;
            }
        }
        const existingIndex = currentData.findIndex((item) => item.fullPath === fullPath);
        if (existingIndex !== -1) {
            currentData[existingIndex].metrics = metrics;
        }
        else {
            currentData.push({ fullPath, folderName, metrics });
        }
        // Save the updated data to the file
        this.writeToFile(currentData);
        // Notify observers that metrics have been updated
        this.notifier.notify("Metrics Updated", currentData);
    }
    writeToFile(data) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
            console.log("Metrics saved to Metrics.json.");
        }
        catch (err) {
            console.log("Failed to save metrics to file.");
            console.error(err);
        }
    }
}
exports.MetricsSaver = MetricsSaver;
//# sourceMappingURL=MetricsSaver.js.map