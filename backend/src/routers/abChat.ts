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

// Single agent
import { runAgent as runSingleAgent } from '../agents/runner';

// Multi-agent
import { runMultiAgent } from '../agents/multi/m_runner';
import { getQwenVisionModel } from '../agents/model';

const router = Router();

// Routing logic: deterministic hash based on sessionId
// Same session always gets same variant
function determineVariant(sessionId: string): 'A' | 'B' {
    const hash = sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const useMulti = hash % 2 === 0;
    return useMulti ? 'B' : 'A';
}

router.post('/chat', async (req: Request, res: Response) => {
    const timer = new Timer();

    const { message, sessionId: inputSessionId, image, agentMode = 'auto' } = req.body;

    if (!message && !image) {
        return badRequest(res, 'message or image required');
    }

    const sessionId = inputSessionId || generateSessionId();
    const cleanMessage = message ? sanitizeInput(message) : null;
    try {

        await saveMessage(sessionId, 'user', cleanMessage || '[Image]');
        const history = await getHistory(sessionId);

        let variant: 'A' | 'B';

        if (agentMode === 'single') {
            variant = 'A';
        } else if (agentMode === 'multi') {
            variant = 'B';
        } else {
            variant = determineVariant(sessionId);
        }

        logger.info(`session: ${sessionId}, variant: ${variant}`);

        let imageData: { imageData?: string; imageMimeType?: string } | undefined;
        if (image) {
            const { mimeType, data } = extractBase64Data(image);
            imageData = { imageData: data, imageMimeType: mimeType };
        }

        // Execute agent
        const agentStartTime = Date.now();
        let responseText: string;

        if (variant === 'B') {
            const result = await runMultiAgent(
                cleanMessage || (image ? 'Describe this image' : ''),
                sessionId,
                history,
                imageData
            );
            responseText = result.response;
        } else {
            if (image) {
                const { mimeType, data } = extractBase64Data(image);
                const visionModel = getQwenVisionModel();
                // const visionResult = await visionModel.generateContent([
                //     cleanMessage || 'Describe this image',
                //     { inlineData: { data, mimeType: mimeType || 'image/jpeg' } }
                // ]);
                // responseText = visionResult.response.text();
                const visionResult = await visionModel.invoke([
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: cleanMessage || 'Describe this image' },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType || 'image/jpeg'};base64,${data}`
                                }
                            }
                        ]
                    }
                ]);
                responseText = visionResult.content.toString();
            } else {
                const result = await runSingleAgent(cleanMessage, sessionId, history);
                responseText = result.response;
            }
        }

        const agentLatency = Date.now() - agentStartTime;

        // Save assistant response
        await saveMessage(sessionId, 'assistant', responseText);

        if (agentMode === 'auto') {
            await saveABTestRecord({
                sessionId,
                variant,
                message: cleanMessage || '[Image]',
                messageLength: (cleanMessage || '[Image]').length,
                responseLength: responseText.length,
                latency: agentLatency,
                success: true
            });
        }

        success(res, {
            sessionId,
            response: responseText,
            variant,
            latency: agentLatency,
            elapsedMs: timer.elapsed()
        });

    } catch (err: any) {
        if (err.message === 'GRAPH_INTERRUPTED') {
            // graph interrupted, likely waiting for user confirmation
            return success(res, {
                interrupted: true,
                sessionId,
                message: 'Operation requires confirmation. Please confirm via /resume endpoint.'
            });
        }else {
            logger.error('AB Chat error:', err);
            internalError(res, err.message);
        }
    }
});

router.post('/chat/resume', async (req: Request, res: Response) => {
    try {
        const { sessionId, userResponse } = req.body;
        if (!sessionId) {
            return badRequest(res, 'sessionId required');
        }
        if (!userResponse) {
            return badRequest(res, 'userResponse required');
        }

        logger.info(`Resuming session ${sessionId} with user response: ${userResponse}`);
        const resumeValue = userResponse === 'confirm' ? 'confirm' : 'cancel';
        const result = await multiAgentGraph.invoke(
            new Command({ resume: resumeValue }), 
            { configurable: { thread_id: sessionId } 
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
    }catch (error: any) {
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