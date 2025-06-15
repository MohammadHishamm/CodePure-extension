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
exports.cleanupMetricsFiles = cleanupMetricsFiles;
exports.analyzeCode = analyzeCode;
const vscode = __importStar(require("vscode"));
const MetricsFactory_1 = require("../Factory/MetricsFactory");
const ServerMetricsManager_1 = require("./ServerMetricsManager");
const initialize_1 = require("../initialize");
const utils_1 = require("../utils");
const GoogleGemini_AI_1 = require("./GoogleGemini_AI");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let isAnalyzing = false;
const diagnosticCollection = vscode.languages.createDiagnosticCollection("codepure");
// Utility function to get the metrics file path for a specific document
function getMetricsFilePath(document) {
    const fileName = path.basename(document.fileName, path.extname(document.fileName));
    let filePath = path.join(__dirname, "..", "Results", `${fileName}.json`);
    return filePath;
}
let createdMetricsFiles = [];
// Function to save metrics to individual files
function saveMetricsToIndividualFile(filePath, metricsArray) {
    try {
        // Extract file name without extension
        const fileName = path.basename(filePath, path.extname(filePath));
        // Create metrics data object
        const metricsData = {
            fullPath: filePath,
            folderName: path.relative(vscode.workspace.rootPath || "", filePath),
            metrics: metricsArray,
        };
        // Create directory if it doesn't exist
        let resultsDir = path.join(__dirname, "..", "Results");
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        // Save metrics to individual JSON file
        const outputFilePath = path.join(resultsDir, `${fileName}.json`);
        fs.writeFileSync(outputFilePath, JSON.stringify(metricsData, null, 2), "utf-8");
        // Add the file path to our tracking array
        createdMetricsFiles.push(outputFilePath);
        console.log(`Metrics saved to ${outputFilePath}`);
    }
    catch (error) {
        console.error(`Error saving metrics to individual file: ${error}`);
    }
}
function cleanupMetricsFiles() {
    try {
        // Delete all tracked metrics files
        for (const filePath of createdMetricsFiles) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted metrics file: ${filePath}`);
            }
        }
        // Clear the tracking array
        createdMetricsFiles = [];
        // Optionally, try to remove the Results directory if it's empty
        const resultsDir = path
            .join(__dirname, "..", "Results");
        if (fs.existsSync(resultsDir)) {
            const files = fs.readdirSync(resultsDir);
            if (files.length === 0) {
                fs.rmdirSync(resultsDir);
                console.log(`Removed empty Results directory: ${resultsDir}`);
            }
        }
    }
    catch (error) {
        console.error(`Error cleaning up metrics files: ${error}`);
    }
}
async function analyzeCode(document, sourceCode) {
    if (isAnalyzing) {
        vscode.window.showInformationMessage("Analysis is already running. Please wait...");
        return "Analysis in progress";
    }
    isAnalyzing = true;
    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Analyzing ${document.languageId} code`,
        cancellable: false,
    }, async (progress) => {
        const parser = document.languageId === "java" ? new initialize_1.javaParser() : new initialize_1.javaParser();
        parser.selectLanguage();
        const rootNode = parser.parse(sourceCode);
        const metricsToCalculate = [
            "LOC",
            "AMW",
            "CBO",
            "FDP",
            "DAC",
            "WMC",
            "WOC",
            "NOA",
            "NOM",
            "NOAM",
            "NOPA",
            "NAbsm",
            "NProtM",
            "NAS",
            "PNAS",
            "TCC",
            "DIT",
        ];
        try {
            progress.report({ message: "Initializing parser...", increment: 10 });
            await (0, utils_1.pause)(500);
            progress.report({ message: "Parsing source code...", increment: 20 });
            await (0, utils_1.pause)(500);
            progress.report({
                message: "Extracting Components From Code...",
                increment: 30,
            });
            await (0, utils_1.pause)(500);
            await initialize_1.FECFcode.parseAllJavaFiles();
            const results = await calculateMetricsWithProgress(document, rootNode, sourceCode, document.languageId, metricsToCalculate, progress);
            if (results) {
                vscode.window.showInformationMessage("Analysis is Finished.");
                // Send the metrics for the current file to the server
                const metricsFilePath = getMetricsFilePath(document);
                initialize_1.servermetricsmanager.sendMetricsFile(metricsFilePath);
                // Detect code smells and suggest AI fixes
                // detectAndSuggestFixes(document, results);
                // highlightBrainClassContributors(document,diagnosticCollection);
                // highlightDataClass(document,diagnosticCollection);
                // highlightGodClassContributors(document,diagnosticCollection);
                getModelPredictions(document, diagnosticCollection);
            }
            else {
                vscode.window.showInformationMessage("Error Occurred While Analyzing.");
            }
            return results;
        }
        finally {
            isAnalyzing = false;
        }
    });
}
async function calculateMetricsWithProgress(document, rootNode, sourceCode, languageId, metrics, progress) {
    const results = [];
    const metricsObjects = [];
    for (const [index, metricName] of metrics.entries()) {
        const metricCalculator = MetricsFactory_1.MetricsFactory.CreateMetric(metricName, languageId);
        if (metricCalculator) {
            const value = metricCalculator.calculate(rootNode, initialize_1.FECFcode, document.fileName);
            results.push(`${metricName}: ${value}`);
            metricsObjects.push({
                name: metricName,
                value: parseFloat(value.toString()),
            });
            // Update progress
            progress.report({
                message: `Calculating ${metricName}...`,
                increment: 70 / metrics.length,
            });
            await (0, utils_1.pause)(300);
        }
    }
    // Save metrics to an individual file named after the source file
    saveMetricsToIndividualFile(document.fileName, metricsObjects);
    return results.join("\n");
}
async function suggestBrainClassFix(document) {
    const fullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length));
    vscode.window
        .showInformationMessage("CodePure detected a Brain Class! Want to apply a Quick AI Fix?", "✨ Quick AI Fix")
        .then((selection) => {
        if (selection === "✨ Quick AI Fix") {
            vscode.commands.executeCommand("codepure.getBrainClassFix", document);
        }
    });
}
async function suggestSchizoClassFix(document) {
    const fullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length));
    vscode.window
        .showInformationMessage("CodePure detected a Schizophrenic class! Want to apply a Quick AI Fix?", "✨ Quick AI Fix")
        .then((selection) => {
        if (selection === "✨ Quick AI Fix") {
            vscode.commands.executeCommand("codepure.getSchizoClassFix", document);
        }
    });
}
async function suggestGodClassFix(document) {
    const fullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length));
    vscode.window
        .showInformationMessage("CodePure detected a God Class! Want to apply a Quick AI Fix?", "✨ Quick AI Fix")
        .then((selection) => {
        if (selection === "✨ Quick AI Fix") {
            vscode.commands.executeCommand("codepure.getGodClassFix", document);
        }
    });
}
async function suggestDataClassFix(document) {
    const fullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length));
    vscode.window
        .showInformationMessage("CodePure detected a Data Class! Want to apply a Quick AI Fix?", "✨ Quick AI Fix")
        .then((selection) => {
        if (selection === "✨ Quick AI Fix") {
            vscode.commands.executeCommand("codepure.getDataClassFix", document);
        }
    });
}
vscode.commands.registerCommand("codepure.getBrainClassFix", async (document) => {
    await applyAIFix(document, `You are assisting in refactoring Java code to eliminate the 'Brain Class' code smell.

        A Brain Class contains too much intelligence in one place. It is often too complex, with large, highly weighted methods and high internal logic. This class was detected based on the following key metrics:
        - AMW (Average Method Weight): Indicates overly complex methods.
        - NOM (Number of Methods): Too many methods lead to too much responsibility.
        - FDP (Access to Foreign Data): Indicates frequent access to foreign data.

        Apply the following strategies:
        - Split large methods into smaller ones with single responsibilities.
        - Extract utility or helper classes where appropriate.
        - Reduce method complexity by removing deeply nested logic or breaking down conditionals.

        🔧 Refactor the class to reduce these values.
        Respond with Java code only, no comments, explanations, or markdown.`);
});
vscode.commands.registerCommand("codepure.getSchizoClassFix", async (document) => {
    await applyAIFix(document, ` `);
});
vscode.commands.registerCommand("codepure.getGodClassFix", async (document) => {
    await applyAIFix(document, `You are helping improve Java code by fixing the 'God Class' code smell.

        A God Class centralizes too much intelligence and has low modularity. This smell was detected due to:
        - FDP (Access to Foreign Data): Accessing too much data from other classes.
        - NOM (Number of Methods): Too many methods implies excessive responsibility.
        - AMW (Average Method Weight): Methods are too complex.

        Refactoring strategies:
        - Extract classes for independent responsibilities.
        - Move methods that mostly operate on foreign data.
        - Reduce method complexity via decomposition or helper methods.

        🔧 Refactor the class to reduce size and increase cohesion.
        Respond with Java code only, no comments or explanations.`);
});
vscode.commands.registerCommand("codepure.getDataClassFix", async (document) => {
    await applyAIFix(document, `You are improving Java code by fixing the 'Data Class' code smell.

A Data Class contains mostly fields and accessors (getters/setters) with little or no real behavior. It is a passive object, and this is considered poor object-oriented design.

It was detected using these metrics:
- WOC: Low (few meaningful methods)
- NOAM: High (lots of accessors)
- NOM: Low (very few functional methods)

Your goal is to transform this into a class with real behavior. You must:
- Introduce methods that operate on the class's internal data.
- Remove or reduce public accessors if behavior is added internally.
- Encapsulate logic that would otherwise live in other classes.

❌ Example of a bad Data Class:
public class JmxCredentials {

	public static final String WRITE_FLAG = "readwrite";

	private String username;

	private String password;

	private boolean writeAccess;

    public JmxCredentials(String username, String password, boolean writeAccess) {
		this.username = username;
		this.password = password;
		this.writeAccess = writeAccess;
	}

    public String getCredentialsString() {
        return username + ":" + password + (writeAccess ? ":" + WRITE_FLAG : "");
    }

    public boolean isValid() {
        return username != null && !username.isEmpty() && password != null && !password.isEmpty();
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setWriteAccess(boolean writeAccess) {
        this.writeAccess = writeAccess;
    }

    private String getSanitizedUsername(){
        return username == null ? "" : username;
    }

    private String getSanitizedPassword(){
        return password == null ? "" : password;
    }

    public String getSanitizedCredentialsString(){
        return getSanitizedUsername() + ":" + getSanitizedPassword() + (writeAccess ? ":" + WRITE_FLAG : "");
    }

}

✅ Example of a good version with behavior:
public class JmxCredentials {

	public static final String WRITE_FLAG = "readwrite";

	private String username;

	private String password;

	private boolean writeAccess;

    public JmxCredentials(String username, String password, boolean writeAccess) {
		this.username = username;
		this.password = password;
		this.writeAccess = writeAccess;
	}

    public String getCredentialsString() {
        return username + ":" + password + (writeAccess ? ":" + WRITE_FLAG : "");
    }

    public boolean isValid() {
        return username != null && !username.isEmpty() && password != null && !password.isEmpty();
    }


    public String getSanitizedCredentialsString(){
        return (username == null ? "" : username) + ":" + (password == null ? "" : password) + (writeAccess ? ":" + WRITE_FLAG : "");
    }

    public boolean hasWriteAccess(){
        return writeAccess;
    }

    public void setWriteAccess(boolean writeAccess){
        this.writeAccess = writeAccess;
    }
}

🔧 Refactor the class to include logic that uses the fields. Avoid creating a new class that still just has getters/setters.
Respond with Java code only. No comments, no explanation.`);
});
async function applyAIFix(document, issue) {
    vscode.window.showInformationMessage("Fetching AI fix suggestion...");
    const sourceCode = document.getText();
    const enhancedIssue = `${issue} Respond with Java code only. No explanations, comments, or formatting.`;
    const fix = await (0, GoogleGemini_AI_1.getFixSuggestion)(sourceCode, enhancedIssue);
    if (fix) {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount, 0));
        edit.replace(document.uri, fullRange, fix);
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage("AI Fix applied!");
    }
    else {
        vscode.window.showWarningMessage("No AI fix suggestion available.");
    }
}
// Define highlight styles
const wmcHighlightType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 255, 0, 0.4)", // Yellow for WMC
});
const locHighlightType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 105, 180, 0.3)", // Pink for LOC
});
const noamHighlightType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 105, 180, 0.3)", // Pink for NOAM (Accessors)
});
const wocHighlightType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(0, 255, 255, 0.4)", // Cyan for WOC
});
const tccHighlightType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(0, 255, 255, 0.3)", // Cyan for TCC
});
async function highlightBrainClassContributors(document, diagnosticCollection) {
    const metricsFilePath = getMetricsFilePath(document);
    if (!fs.existsSync(metricsFilePath)) {
        console.error("Metrics JSON file not found:", metricsFilePath);
        return;
    }
    const fileContent = fs.readFileSync(metricsFilePath, "utf-8");
    const fileMetrics = JSON.parse(fileContent);
    // Extract LOC & WMC
    const LOC = fileMetrics.metrics.find((m) => m.name === "LOC")?.value || 0;
    const WMC = fileMetrics.metrics.find((m) => m.name === "WMC")?.value || 0;
    console.log("File Path:", metricsFilePath);
    console.log(`Extracted LOC: ${LOC}, WMC: ${WMC}`);
    const diagnostics = [];
    const wmcRanges = [];
    const locRanges = [];
    // Apply highlighting rules
    if (LOC > 50) {
        const classHeadRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, document.lineAt(0).text.length));
        locRanges.push(classHeadRange);
        const diagnostic = new vscode.Diagnostic(classHeadRange, "Try to make lines more less (LOC > 351)", vscode.DiagnosticSeverity.Warning);
        diagnostic.code = "brainClass.LOC";
        diagnostic.source = "CodePure";
        diagnostics.push(diagnostic);
    }
    if (WMC > 15) {
        // Iterate over lines and find method headers to highlight
        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text.trim();
            if (/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(lineText)) {
                const functionRange = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lineText.length));
                wmcRanges.push(functionRange);
                const diagnostic = new vscode.Diagnostic(functionRange, " God Class Code Smell detected (Complex method contributing to high WMC)", vscode.DiagnosticSeverity.Warning);
                diagnostic.code = "brainClass.WMC";
                diagnostic.source = "CodePure";
                diagnostics.push(diagnostic);
            }
        }
    }
    // Apply decorations and diagnostics
    diagnosticCollection.set(document.uri, diagnostics);
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
        editor.setDecorations(wmcHighlightType, wmcRanges);
        editor.setDecorations(locHighlightType, locRanges);
    }
}
async function highlightDataClass(document, diagnosticCollection) {
    const metricsFilePath = getMetricsFilePath(document);
    if (!fs.existsSync(metricsFilePath)) {
        console.error("Metrics JSON file not found:", metricsFilePath);
        return;
    }
    const fileContent = fs.readFileSync(metricsFilePath, "utf-8");
    const fileMetrics = JSON.parse(fileContent);
    const WOC = fileMetrics.metrics.find((m) => m.name === "WOC")?.value || 1;
    const NOPA = fileMetrics.metrics.find((m) => m.name === "NOPA")?.value || 0;
    const NOAM = fileMetrics.metrics.find((m) => m.name === "NOAM")?.value || 0;
    const WMC = fileMetrics.metrics.find((m) => m.name === "WMC")?.value || 100;
    console.log(`Extracted WOC: ${WOC}, NOPA: ${NOPA}, NOAM: ${NOAM}, WMC: ${WMC}`);
    const diagnostics = [];
    const wmcRanges = [];
    const noamRanges = [];
    const wocRanges = [];
    // === Find actual class declaration line ===
    let classDeclarationLine = -1;
    for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text.trim();
        if (/^\s*(public\s+)?(class|record)\s+\w+/.test(lineText)) {
            classDeclarationLine = i;
            break;
        }
    }
    if (classDeclarationLine !== -1) {
        const classLineText = document.lineAt(classDeclarationLine).text;
        const classHeadRange = new vscode.Range(new vscode.Position(classDeclarationLine, 0), new vscode.Position(classDeclarationLine, classLineText.length));
        wocRanges.push(classHeadRange);
        diagnostics.push(new vscode.Diagnostic(classHeadRange, "Data Class Code Smell detected: this class mainly holds state with minimal logic. Using a record or adding clear separation of concerns could improve clarity and maintainability", vscode.DiagnosticSeverity.Warning));
    }
    // === Highlight accessor method heads (NOAM) ===
    for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text.trim();
        if (/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(lineText)) {
            const functionRange = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lineText.length));
            if (/^\s*(public|protected)\s+\w+\s+(get|set)[A-Z]\w*\s*\(.*\)\s*\{?/.test(lineText)) {
                noamRanges.push(functionRange);
                diagnostics.push(new vscode.Diagnostic(functionRange, "Too many accessor methods (NOAM).", vscode.DiagnosticSeverity.Warning));
            }
        }
    }
    // Apply diagnostics
    diagnosticCollection.set(document.uri, diagnostics);
    // Apply highlights in active editor
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
        // Clear previous highlights (optional safety)
        editor.setDecorations(wmcHighlightType, []);
        editor.setDecorations(noamHighlightType, []);
        editor.setDecorations(wocHighlightType, []);
        // Apply new ones
        editor.setDecorations(wmcHighlightType, wmcRanges);
        editor.setDecorations(noamHighlightType, noamRanges);
        editor.setDecorations(wocHighlightType, wocRanges);
    }
}
async function highlightGodClassContributors(document, diagnosticCollection) {
    const metricsFilePath = getMetricsFilePath(document);
    if (!fs.existsSync(metricsFilePath)) {
        console.error("Metrics JSON file not found:", metricsFilePath);
        return;
    }
    const fileContent = fs.readFileSync(metricsFilePath, "utf-8");
    const fileMetrics = JSON.parse(fileContent);
    const WMC = fileMetrics.metrics.find((m) => m.name === "WMC")?.value || 0;
    const TCC = fileMetrics.metrics.find((m) => m.name === "TCC")?.value || 1;
    console.log("Extracted WMC:", WMC, "TCC:", TCC);
    const diagnostics = [];
    const wmcRanges = [];
    const tccRanges = [];
    // === NEW: Dynamically find class declaration ===
    let classDeclarationLine = -1;
    for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text.trim();
        if (/^\s*(public\s+)?(class|record)\s+\w+/.test(lineText)) {
            classDeclarationLine = i;
            break;
        }
    }
    if (classDeclarationLine !== -1) {
        const classLineText = document.lineAt(classDeclarationLine).text;
        const classHeadRange = new vscode.Range(new vscode.Position(classDeclarationLine, 0), new vscode.Position(classDeclarationLine, classLineText.length));
        tccRanges.push(classHeadRange);
        diagnostics.push(new vscode.Diagnostic(classHeadRange, "God Class detected: too many responsibilities. Consider breaking into smaller, focused classes. This class is trying to do everything—consider splitting it up for better separation of concerns.", vscode.DiagnosticSeverity.Warning));
    }
    // Highlight methods for WMC (if too high)
    if (WMC >= 19) {
        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text.trim();
            if (/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\(.*\)\s*\{?/.test(lineText)) {
                const functionRange = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lineText.length));
                wmcRanges.push(functionRange);
                diagnostics.push(new vscode.Diagnostic(functionRange, "High complexity contributes to a God Class (WMC ≥ 43.87)", vscode.DiagnosticSeverity.Warning));
            }
        }
    }
    // Set diagnostics and decorations
    diagnosticCollection.set(document.uri, diagnostics);
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
        // Optional: clear old highlights
        editor.setDecorations(wmcHighlightType, []);
        editor.setDecorations(tccHighlightType, []);
        // Apply new ones
        editor.setDecorations(wmcHighlightType, wmcRanges);
        editor.setDecorations(tccHighlightType, tccRanges);
    }
}
async function getModelPredictions(document, diagnosticCollection) {
    const serverManager = new ServerMetricsManager_1.ServerMetricsManager();
    // Get the metrics file path for the current document
    const metricsFilePath = getMetricsFilePath(document);
    if (!fs.existsSync(metricsFilePath)) {
        console.error("Metrics JSON file not found:", metricsFilePath);
        return;
    }
    // Send metrics file and get response
    const response = await serverManager.sendMetricsFile(metricsFilePath);
    if (!response || !response.predictions || response.predictions.length === 0) {
        console.log("No predictions received.");
        return;
    }
    // Extract the LAST prediction object
    const predictions = response.predictions[response.predictions.length - 1];
    // Check for each smell type and call the corresponding function if its value is 1
    if (predictions["Brain Class"] === 1) {
        console.log("Detected Brain Class");
        highlightBrainClassContributors(document, diagnosticCollection);
        await suggestBrainClassFix(document);
        response.predictions = [];
    }
    if (predictions["Data Class"] === 1) {
        console.log("Detected Data Class");
        highlightDataClass(document, diagnosticCollection);
        await suggestDataClassFix(document);
        response.predictions = [];
    }
    if (predictions["God Class"] === 1) {
        console.log("Detected God Class");
        highlightGodClassContributors(document, diagnosticCollection);
        await suggestGodClassFix(document);
        response.predictions = [];
    }
    // If no smells were detected (all values were 0)
    if (predictions["Brain Class"] === 0 &&
        predictions["Data Class"] === 0 &&
        predictions["God Class"] === 0 &&
        predictions["Schizofrenic Class"] === 0) {
        console.log("No code smells detected.");
        response.predictions = [];
    }
}
//# sourceMappingURL=AnalyzeCode.js.map