export const geminiConfig = {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.5-flash', 
    fastModel: 'gemini-2.5-flash-lite', 
    visionModel: 'gemini-2.5-flash-lite', 
    temperature: 0.2, 
    maxOutputTokens: 256,  
    timeout: 10000,  
    streamTimeout: 15000
};