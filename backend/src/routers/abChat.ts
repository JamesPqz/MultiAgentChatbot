import { Router, Request, Response } from 'express';
import { success, badRequest, internalError } from '../utils/response';
import { logger } from '../utils/logger';
import { Timer } from '../utils/performance';
import { saveMessage, getHistory } from '../models/chatHistory';
import { generateSessionId } from '../utils/string';
import { extractBase64Data } from '../utils/image';
import { isValidMessage, sanitizeInput } from '../utils/validator';
import { saveABTestRecord, getABTestStats, clearABTestRecords } from '../models/abTest';
import { multiAgentGraph } from '../agents/multi/m_agent';
import { Command } from '@langchain/langgraph';
import { analyzeImage } from '../services/imageService';

// Single agent
import { runAgent as runSingleAgent } from '../agents/runner';

// Multi-agent
import { runMultiAgent } from '../agents/multi/m_runner';
import { getQwenVisionModel } from '../agents/model';
import { constants } from '../config/constants';

const router = Router();

// Routing logic: deterministic hash based on sessionId
// Same session always gets same variant
function determineVariant(sessionId: string): 'A' | 'B' {
    const hash = sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const useMulti = hash % 2 === 0;
    return useMulti ? 'B' : 'A';
}

// streaming response helper
function sendSSE(res: Response, event: string, data: any): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function getVariant(sessionId: string, agentMode: string): 'A' | 'B' {
    let variant: 'A' | 'B';

    if (agentMode === 'single') {
        variant = 'A';
    } else if (agentMode === 'multi') {
        variant = 'B';
    } else {
        variant = determineVariant(sessionId);
    }

    logger.info(`session: ${sessionId}, variant: ${variant}`);
    return variant;
}

function createStreamCallback(
    res: Response,
    firstTokenTimeRef: { value: number | null },
    agentStartTime: number,
    variant: string,
    sessionId: string
): (chunk: string) => void {
    return (chunk: string) => {
        if (firstTokenTimeRef.value === null && chunk) {
            firstTokenTimeRef.value = Date.now();
            const ttf = firstTokenTimeRef.value - agentStartTime;
            logger.info(`First token time: ${ttf}ms`);
            sendSSE(res, 'meta', { firstTokenLatency: ttf, variant, sessionId });
        }
        sendSSE(res, 'chunk', { content: chunk });
    };
}

router.post('/chat', async (req: Request, res: Response) => {
    const timer = new Timer();

    const { message, sessionId: inputSessionId, image, agentMode, stream = true } = req.body;
    logger.info(`AgentMode: ${agentMode}, reqBody: ${JSON.stringify(req.body).substring(0, 50)}`);

    if (!message && !image) {
        return badRequest(res, 'message or image required');
    }

    const sessionId = inputSessionId || generateSessionId();
    const cleanMessage = message ? sanitizeInput(message) : null;

    if (!image && stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
    }

    try {
        await saveMessage(sessionId, 'user', cleanMessage || '[Image]');
        let history = await getHistory(sessionId);
        history = history.slice(constants.DEFAULT_HISTORY_LIMIT * -1); 

        let variant: 'A' | 'B' = getVariant(sessionId, agentMode);

        // Execute agent
        const agentStartTime = Date.now();
        let responseText: string;

        const firstTokenTimeRef = { value: null };

        if (image) {
            const { responseText: visionResponse } = await analyzeImage(image, cleanMessage);
            responseText = visionResponse;
            if (firstTokenTimeRef.value === null && responseText) {
                firstTokenTimeRef.value = Date.now();
            }
            // if (stream) {
            //     sendSSE(res, 'chunk', { content: responseText });
            //     sendSSE(res, 'end', { sessionId, variant, latency: Date.now() - agentStartTime });
            //     res.end();
            //     return;
            // }
        } else if (variant === 'B') {
            const onChunk = stream ? createStreamCallback(res, firstTokenTimeRef, agentStartTime, variant, sessionId) : undefined;
            const result = await runMultiAgent(
                cleanMessage || (image ? 'Describe this image' : ''),
                sessionId,
                history,
                undefined,
                onChunk
            );
            responseText = result.response;
            if (firstTokenTimeRef.value === null && responseText) {
                firstTokenTimeRef.value = Date.now();
            }
        } else {
            const result = await runSingleAgent(cleanMessage, sessionId, history);
            responseText = result.response;
            if (firstTokenTimeRef.value === null && responseText) {
                firstTokenTimeRef.value = Date.now();
            }
            if (stream) {
                sendSSE(res, 'chunk', { content: responseText });
            }
        }

        const agentLatency = Date.now() - agentStartTime;
        const firstTokenLatency = firstTokenTimeRef.value ? firstTokenTimeRef.value - agentStartTime : agentLatency;

        // Save assistant response
        await saveMessage(sessionId, 'assistant', responseText);

        if (agentMode === 'auto') {
            await saveABTestRecord({
                sessionId,
                variant,
                message: cleanMessage || '[Image]',
                messageLength: (cleanMessage || '[Image]').length,
                responseLength: responseText.length,
                latency: firstTokenLatency,
                success: true
            });
        }

        if (!image && stream) {
            sendSSE(res, 'end', { sessionId, variant, latency: agentLatency, firstTokenLatency, responseLength: responseText.length });
            res.end();
        } else {
            success(res, { sessionId, response: responseText, variant, latency: agentLatency, firstTokenLatency, elapsedMs: timer.elapsed() });
        }

    } catch (err: any) {
        if (err.message === 'GRAPH_INTERRUPTED') {
            if (stream) {
                sendSSE(res, 'interrupt', {
                    interrupted: true,
                    sessionId,
                    message: err.interruptValue[0].value.message
                });
                res.end();
                return;
            }
            // graph interrupted, likely waiting for user confirmation
            return success(res, {
                interrupted: true,
                sessionId,
                message: 'Operation requires confirmation. Please confirm via /resume endpoint.'
            });
        } else {
            logger.error('AB Chat error:', err);
            if (stream) {
                sendSSE(res, 'error', { message: err.message });
                res.end();
            } else {
                internalError(res, err.message);
            }
        }
    }
});

router.post('/chat/resume', async (req: Request, res: Response) => {
    try {
        const { sessionId, confirmed } = req.body;
        if (!sessionId || typeof confirmed !== 'boolean') {
            return badRequest(res, 'sessionId and confirmed are required');
        }

        const resumeValue = confirmed ? 'confirm' : 'cancel';
        logger.info(`Resuming session ${sessionId} with user confirm: ${confirmed}`);
        const result = await multiAgentGraph.invoke(
            new Command({ resume: resumeValue }),
            {
                configurable: { thread_id: sessionId }
            } as any
        );
        let responseText = 'Operation completed.';
        if (result?.messages && Array.isArray(result.messages) && result.messages.length > 0) {
            const lastMessage = result.messages[result.messages.length - 1];
            responseText = typeof lastMessage.content === 'string'
                ? lastMessage.content
                : JSON.stringify(lastMessage.content);
        }

        success(res, {
            sessionId,
            response: responseText,
            resumed: true
        });
    } catch (error: any) {
        logger.error('Resume error:', error);
        internalError(res, error.message);
    }
});

// Statistics endpoint
router.get('/ab-test/stats', async (req: Request, res: Response) => {
    const stats = await getABTestStats();
    success(res, stats);
});

// Clear data endpoint (for testing)
router.delete('/ab-test/clear', async (req: Request, res: Response) => {
    await clearABTestRecords();
    success(res, null, 'AB test data cleared');
});

export default router;