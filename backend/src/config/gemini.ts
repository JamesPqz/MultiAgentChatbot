export const geminiConfig = {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-3.1-flash-lite-preview', 
    temperature: 0.7, 
    maxOutputTokens: 512,  
    timeout: 10000,  
    streamTimeout: 15000
};