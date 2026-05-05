import { HumanMessage, BaseMessage } from '@langchain/core/messages';
import { agentGraph } from './agent';
import { logger } from '../utils/logger';
import { Timer } from '../utils/performance';

export async function runAgent(
    userMessage: string,
    sessionId: string,
    history: { role: string; content: string }[] = [],
    onChunk?: (chunk: string) => void
): Promise<{ response: string; toolCalls?: any[]; elapsedMs: number }> {
    const timer = new Timer();

    const initialState = {
        messages: [new HumanMessage(userMessage)],
        sessionId: sessionId,
        next: ''
    };

    logger.info(`Running agent for session: ${sessionId}`, { message: userMessage.substring(0, 50) });

    let finalResponse = '';
    let finalToolCalls: any[] | undefined;
    let finalMessages: BaseMessage[] = [];

    const stream = await agentGraph.stream(initialState);

    let lastSentLength = 0;
    for await (const chunk of stream) {
        let parsedChunk: any = chunk;

        if (chunk instanceof Uint8Array) {
            try {
                const text = new TextDecoder().decode(chunk);
                parsedChunk = JSON.parse(text);
            } catch (e) {
                logger.warn('Failed to parse chunk as JSON', e);
                continue;
            }
        }

        if (parsedChunk && typeof parsedChunk === 'object') {
            // update messages
            if (parsedChunk.messages && Array.isArray(parsedChunk.messages)) {
                finalMessages = parsedChunk.messages;
            }

            let messages = parsedChunk.messages;
            if (!messages && parsedChunk.agent?.messages) {
                messages = parsedChunk.agent.messages;
            }

            if (messages && Array.isArray(messages) && messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg && typeof lastMsg.content === 'string') {
                    // update finalResponse
                    if (lastMsg.content !== finalResponse) {
                        finalResponse = lastMsg.content;
                        if (onChunk) {
                            const delta = finalResponse.substring(lastSentLength);
                            if (delta) {
                                onChunk(delta);
                                lastSentLength = finalResponse.length;
                            }
                        }
                    }
                }
            }

            // extract tool_calls
            const lastMsg = finalMessages[finalMessages.length - 1];
            if ((lastMsg as any)?.tool_calls && (lastMsg as any).tool_calls.length > 0) {
                finalToolCalls = (lastMsg as any).tool_calls;
            }
        }
    }
    if (!finalResponse && finalMessages.length > 0) {
        const lastMsg = finalMessages[finalMessages.length - 1];
        if (lastMsg && typeof lastMsg.content === 'string') {
            finalResponse = lastMsg.content;
        }
    }

    const elapsedMs = timer.elapsed();
    logger.info(`Agent completed in ${elapsedMs}ms`, {
        hasToolCalls: !!finalToolCalls,
        responseLength: finalResponse.length
    });

    return { response: finalResponse, toolCalls: finalToolCalls, elapsedMs };
}