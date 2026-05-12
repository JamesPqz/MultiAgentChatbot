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
import { generateSessionId } from '../utils/string';
import { isValidBase64Image, extractBase64Data } from '../utils/image';
import { isValidMessage, isValidSessionId, sanitizeInput } from '../utils/validator';
import { getGenAI, getVisionModel } from '../agents/model';
import { constants } from '../config/constants';

const router = Router();

// proxy setup
const proxyAgent = new ProxyAgent(proxyConfig.url);
setGlobalDispatcher(proxyAgent);

// Gemini init
const genAI = getGenAI()
const visionModel = getVisionModel()

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
    return inputSessionId || generateSessionId();
}

router.post('/chat', async (req: Request, res: Response) => {
    const timer = new Timer();

    try {
        const { message, sessionId: inputSessionId, image } = req.body;

        if (!message && !image) {
            return badRequest(res, 'message or image required');
        }
        if (message && !isValidMessage(message)) {
            return badRequest(res, 'Invalid message: must be 1-5000 characters');
        }

        const sessionId = getSessionId(inputSessionId);
        const cleanMessage = message ? sanitizeInput(message) : null;
        await saveMessage(sessionId, 'user', cleanMessage || '[Image]');

        const history = await getHistory(sessionId, constants.DEFAULT_HISTORY_LIMIT);
        const historyText = history.slice(0, -1).map(msg =>
            `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n');

        const fullPrompt = historyText
            ? `${historyText}\nUser: ${message || 'Describe this image'}`
            : (message || 'Describe this image');

        // const outboundIP = await getOutboundIP();
        // logger.info(`Outbound IP: ${outboundIP}`);

        // if (outboundIP.startsWith('182.') || outboundIP.startsWith('119.')) {
        //     logger.warn('IP in hk，proxy might be ineffective');
        // }

        let result;
        if (image) {
            const imageData = image.includes('base64,') ? image.split('base64,')[1] : image;
            result = await visionModel.generateContent([
                fullPrompt,
                { inlineData: { data: imageData, mimeType: 'image/jpeg' } }
            ]);
        } else {
            result = await genAI.getGenerativeModel({
                model: geminiConfig.model,
                generationConfig: {
                    temperature: geminiConfig.temperature,
                    maxOutputTokens: geminiConfig.maxOutputTokens
                }
            }).generateContent(fullPrompt);
        }

        const responseText = result.response.text();
        await saveMessage(sessionId, 'assistant', responseText);

        success(res, {
            sessionId,
            response: responseText,
            // proxyIp: outboundIP,
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
        if (message && !isValidMessage(message)) {
            return badRequest(res, 'Invalid message: must be 1-5000 characters');
        }

        const sessionId = getSessionId(inputSessionId);

        // save user messages
        const cleanMessage = message ? sanitizeInput(message) : null;
        await saveMessage(sessionId, 'user', cleanMessage || '[Image]');

        const history = await getHistory(sessionId, constants.DEFAULT_HISTORY_LIMIT);
        // const outboundIP = await getOutboundIP();
        // logger.info(`Agent Outbound IP: ${outboundIP}`);

        let responseText: string;

        // vision-base query
        if (image) {
            logger.info(`Vision query detected, processing image...`);

            if (!isValidBase64Image(image)) {
                logger.warn('Invalid base64 image format');
                responseText = 'invalid image format, please provide a valid base64-encoded image';
            } else {
                const { mimeType, data } = extractBase64Data(image);

                const visionPrompt = cleanMessage || 'Please describe this image';
                const fullPrompt = `${visionPrompt}\n\nPlease keep your response concise. Limit to 2-3 sentences.`;

                const visionResult = await visionModel.generateContent([
                    fullPrompt,
                    { inlineData: { data, mimeType } }
                ]);
                responseText = visionResult.response.text();
                logger.info(`Vision response generated`);
            }
        } else {
            // text dialogue query
            const { response: agentResponse, elapsedMs: agentElapsed } = await runAgent(
                cleanMessage,
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
            // proxyIp: outboundIP,
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
        if (!isValidSessionId(sessionId)) {
            return badRequest(res, 'Invalid session ID format');
        }
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
        if (!isValidSessionId(sessionId)) {
            return badRequest(res, 'Invalid session ID format');
        }
        await clearHistory(sessionId);
        success(res, null, 'History cleared');
    } catch (err: any) {
        internalError(res, err.message);
    }
});

export default router;