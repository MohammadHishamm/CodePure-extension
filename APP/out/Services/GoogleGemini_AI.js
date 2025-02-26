"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFixSuggestion = getFixSuggestion;
const generative_ai_1 = require("@google/generative-ai");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
async function getFixSuggestion(code, issue) {
    let filePath = path_1.default.resolve(__dirname, '..', '.env');
    filePath = filePath.replace(/out[\\\/]?/, "");
    dotenv_1.default.config({ path: filePath });
    if (!process.env.Google_Gemini_API_KEY) {
        throw new Error('API_KEY is missing in the .env file');
    }
    const API_KEY = process.env.Google_Gemini_API_KEY;
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
        ### Code Issue: ${issue}
        ### Code Before:
        ${code}
        ### Provide a clear fix for the above issue:`;
        const result = await model.generateContent([prompt]);
        // Ensure proper handling of response
        const suggestion = await result.response.text();
        return "AI Suggestion: " + suggestion;
    }
    catch (error) {
        console.error("Error fetching AI fix:", error);
        return "Error fetching AI fix";
    }
}
//# sourceMappingURL=GoogleGemini_AI.js.map