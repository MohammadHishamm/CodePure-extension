import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import dotenv from 'dotenv';

export async function getFixSuggestion(code: string, issue: string) {
    let filePath = path.resolve(__dirname, '..', '.env');
    filePath = filePath.replace(/out[\\\/]?/, "");

    dotenv.config({ path: filePath });

    if (!process.env.Google_Gemini_API_KEY) {
        throw new Error('API_KEY is missing in the .env file');
    }
    
    const API_KEY = process.env.Google_Gemini_API_KEY;
    
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
