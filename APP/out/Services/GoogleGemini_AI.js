"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFixSuggestion = getFixSuggestion;
const generative_ai_1 = require("@google/generative-ai");
async function getFixSuggestion(code, issue) {
    const API_KEY = "AIzaSyAEDdw0JG5z2HL2BLDsHv3T-q-wEfLS8j0";
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