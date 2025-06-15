import { GoogleGenerativeAI } from "@google/generative-ai";


export async function getFixSuggestion(code: string, issue: string) 
{

    const API_KEY = "AIzaSyAEDdw0JG5z2HL2BLDsHv3T-q-wEfLS8j0";
    
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
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
        
    } catch (error) {
        console.error("Error fetching AI fix:", error);
        return "Error fetching AI fix";
    }
}
