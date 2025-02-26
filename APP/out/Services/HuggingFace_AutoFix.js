"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFixSuggestion = getFixSuggestion;
const generative_ai_1 = require("@google/generative-ai");
// 🔥 Replace with your actual Google Gemini API key
const API_KEY = "AIzaSyAEDdw0JG5z2HL2BLDsHv3T-q-wEfLS8j0";
async function getFixSuggestion(code, issue) {
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
        // ✅ Use the latest correct model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `### Code Issue: ${issue}
        ### Code Before:
        ${code}
        
        ### Provide a clear fix for the above issue:`;
        const result = await model.generateContent([prompt]);
        console.log("AI Suggestion:", result.response.text());
    }
    catch (error) {
        console.error("❌ Error fetching AI fix:", error);
    }
}
// const genAI = new GoogleGenerativeAI("YOUR_API_KEY");
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
// const prompt = "Explain how AI works";
// const result = await model.generateContent(prompt);
// console.log(result.response.text());
// // Test the function
getFixSuggestion("public static void main(String[] args) { System.out.println(Hello World); }", "Syntax Error in Java");
//# sourceMappingURL=HuggingFace_AutoFix.js.map