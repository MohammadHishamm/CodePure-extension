"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFixSuggestionHF = getFixSuggestionHF;
const node_fetch_1 = __importDefault(require("node-fetch"));
const HF_API_KEY = "YOUR_HF_API_KEY";
async function getFixSuggestionHF(code, issue) {
    const apiUrl = "https://api-inference.huggingface.co/models/Intel/dynamic-code-repair";
    const headers = {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
    };
    const body = JSON.stringify({
        inputs: `### Code Issue: ${issue}\n\n### Code Before:\n${code}\n\n### Suggested Fix:\n`
    });
    try {
        const response = await (0, node_fetch_1.default)(apiUrl, { method: "POST", headers, body });
        const result = await response.json();
        if (result.error) {
            console.error("Hugging Face API error:", result.error);
            return "AI Fix not available.";
        }
        return result[0]?.generated_text || "No fix suggestion.";
    }
    catch (error) {
        console.error("Error fetching fix from Hugging Face:", error);
        return "Failed to get AI fix.";
    }
}
//# sourceMappingURL=ats.js.map