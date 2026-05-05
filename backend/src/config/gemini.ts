export const geminiConfig = {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.5-flash', 
    temperature: 0.7, 
    maxOutputTokens: 512,  
    timeout: 10000,  
    streamTimeout: 15000
};