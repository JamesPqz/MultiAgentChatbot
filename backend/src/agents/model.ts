import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { proxyConfig } from '../config/proxy';
import { geminiConfig } from '../config/gemini';
import { logger } from '../utils/logger';

if (proxyConfig.enabled) {
    const proxyAgent = new ProxyAgent(proxyConfig.url);
    setGlobalDispatcher(proxyAgent);
    logger.info(`Proxy enabled: ${proxyConfig.url}`);
}

const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);

export const getGenAI = () => genAI;

export const getModel = () => {
    return genAI.getGenerativeModel({
        model: geminiConfig.model,
        generationConfig: {
            temperature: geminiConfig.temperature,
            maxOutputTokens: geminiConfig.maxOutputTokens
        }
    });
};

export const createModel = () => {
    return new ChatGoogleGenerativeAI({
        model: geminiConfig.model,
        temperature: geminiConfig.temperature,
        maxOutputTokens: geminiConfig.maxOutputTokens,
        apiKey: geminiConfig.apiKey,
        thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false
        }
    });
};

export const createFastModel = () => {
    return new ChatGoogleGenerativeAI({
        model: 'gemini-2.5-flash',
        temperature: geminiConfig.temperature,
        maxOutputTokens: 100,
        apiKey: geminiConfig.apiKey,
        thinkingConfig: {
            thinkingBudget: 0,
            includeThoughts: false
        }
    });
};

export const getVisionModel = () => {
    return genAI.getGenerativeModel({
        model: geminiConfig.model,
        generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 150,
            topP: 0.9
        }
    });
};

import { ChatOpenAI } from '@langchain/openai';

export const createQwenModel = () => {
    return new ChatOpenAI({
        model: 'qwen-turbo',
        temperature: 0.5,
        maxTokens: 1024,
        apiKey: process.env.QWEN_API_KEY,
        configuration: {
            baseURL: process.env.QWEN_BASE_URL
        }
    });
};

export const getQwenVisionModel = () => {
    return new ChatOpenAI({
        model: 'qwen-vl-plus',
        temperature: 0.4,
        maxTokens: 150,
        apiKey: process.env.QWEN_API_KEY,
        configuration: {
            baseURL: process.env.QWEN_BASE_URL
        }
    });
};