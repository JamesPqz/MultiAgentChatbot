import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProxyAgent, setGlobalDispatcher, fetch as undiciFetch } from 'undici';
import { proxyConfig } from '../config/proxy';
import { geminiConfig } from '../config/gemini';
import { saveMessage, getHistory, clearHistory } from '../models/chatHistory';
import { success, badRequest, unauthorized, internalError } from '../utils/response';
import { logger } from '../utils/logger';
import { Timer } from '../utils/performance';
import { runAgent } from '../agents/runner';

const router = Router();

// proxy setup
const proxyAgent = new ProxyAgent(proxyConfig.url);
setGlobalDispatcher(proxyAgent);

// Gemini init
const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
const model = genAI.getGenerativeModel({ 
    model: geminiConfig.model,
    generationConfig: {
        temperature: geminiConfig.temperature,
        maxOutputTokens: geminiConfig.maxOutputTokens
    }
});

// get outbound IP
async function getOutboundIP(): Promise<string> {
    try {
        const response = await undiciFetch('https://ifconfig.me/ip', {
            dispatcher: proxyAgent
        });
        const ip = await response.text();
        return ip.trim();
    } catch (error) {
        logger.error('get outbound IP fail', error);
        return 'unknown';
    }
}

function getSessionId(inputSessionId: any): string {
    return inputSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

router.post('/chat', async (req: Request, res: Response) => {
    const timer = new Timer();
    
    try {
        const { message, sessionId: inputSessionId, image } = req.body;
        
        if (!message && !image) {
            return badRequest(res, 'message or image required');
        }
        
        const sessionId = getSessionId(inputSessionId);
        await saveMessage(sessionId, 'user', message || '[Image]');
        
        const history = await getHistory(sessionId, 10);
        const historyText = history.slice(0, -1).map(msg => 
            `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n');
        
        const fullPrompt = historyText 
            ? `${historyText}\nUser: ${message || 'Describe this image'}` 
            : (message || 'Describe this image');
        
        const outboundIP = await getOutboundIP();
        logger.info(`Outbound IP: ${outboundIP}`);
        
        if (outboundIP.startsWith('182.') || outboundIP.startsWith('119.')) {
            logger.warn('IP in hk，proxy might be ineffective');
        }
        
        let result;
        if (image) {
            const imageData = image.includes('base64,') ? image.split('base64,')[1] : image;
            result = await model.generateContent([
                fullPrompt,
                { inlineData: { data: imageData, mimeType: 'image/jpeg' } }
            ]);
        } else {
            result = await model.generateContent(fullPrompt);
        }
        
        const responseText = result.response.text();
        await saveMessage(sessionId, 'assistant', responseText);
        
        success(res, {
            sessionId,
            response: responseText,
            proxyIp: outboundIP,
            elapsedMs: timer.elapsed()
        });
        
    } catch (err: any) {
        logger.error('Chat error:', err);
        
        if (err.message?.includes('User location not supported')) {
            badRequest(res, 'proxy not working, please check your VPN/proxy settings');
        } else if (err.message?.includes('API key')) {
            unauthorized(res, 'API Key invalid');
        } else {
            internalError(res, err.message);
        }
    }
});

router.post('/chat/agent', async (req: Request, res: Response) => {
    const timer = new Timer();
    
    try {
        const { message, sessionId: inputSessionId, image } = req.body;
        
        if (!message && !image) {
            return badRequest(res, 'message or image required');
        }
        
        const sessionId = getSessionId(inputSessionId);
        
        // save user messages
        await saveMessage(sessionId, 'user', message || '[Image]');
        
        const history = await getHistory(sessionId, 10);
        const outboundIP = await getOutboundIP();
        logger.info(`Agent Outbound IP: ${outboundIP}`);
        
        let responseText: string;
        
        // vision-base query
        if (image) {
            logger.info(`🖼️ Vision query detected, processing image...`);
            
            const imageData = image.includes('base64,') 
                ? image.split('base64,')[1] 
                : image;
            
            const visionModel = genAI.getGenerativeModel({ model: geminiConfig.model });
            const visionResult = await visionModel.generateContent([
                message || 'Please describe this image.',
                { inlineData: { data: imageData, mimeType: 'image/jpeg' } }
            ]);
            responseText = visionResult.response.text();
            logger.info(`Vision response generated`);
        } else {
            // text dialogue query
            const { response: agentResponse, elapsedMs: agentElapsed } = await runAgent(
                message,
                sessionId,
                history
            );
            responseText = agentResponse;
        }
        
        // save assistant response
        await saveMessage(sessionId, 'assistant', responseText);
        
        success(res, {
            sessionId,
            response: responseText,
            proxyIp: outboundIP,
            elapsedMs: timer.elapsed()
        });
        
    } catch (err: any) {
        logger.error('Agent error:', err);
        
        if (err.message?.includes('User location not supported')) {
            badRequest(res, 'proxy not working, please check your VPN/proxy settings');
        } else {
            internalError(res, err.message);
        }
    }
});

// get history
router.get('/history/:sessionId', async (req: Request, res: Response) => {
    try {
        const sessionId = String(req.params.sessionId);
        const history = await getHistory(sessionId);
        success(res, { sessionId, history });
    } catch (err: any) {
        internalError(res, err.message);
    }
});

// clear history
router.delete('/history/:sessionId', async (req: Request, res: Response) => {
    try {
        const sessionId = String(req.params.sessionId);
        await clearHistory(sessionId);
        success(res, null, 'History cleared');
    } catch (err: any) {
        internalError(res, err.message);
    }
});

export default router;