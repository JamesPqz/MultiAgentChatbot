import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { proxyConfig } from '../config/proxy';
import { geminiConfig } from '../config/gemini';
import { logger } from '../utils/logger';

// proxy
if (proxyConfig.enabled) {
    const proxyAgent = new ProxyAgent(proxyConfig.url);
    setGlobalDispatcher(proxyAgent);
    logger.info(`Proxy enabled: ${proxyConfig.url}`);
}


export const createModel = () => {
    return new ChatGoogleGenerativeAI({
        model: geminiConfig.model,
        temperature: geminiConfig.temperature,
        maxOutputTokens: geminiConfig.maxOutputTokens,
        apiKey: geminiConfig.apiKey
    });
};