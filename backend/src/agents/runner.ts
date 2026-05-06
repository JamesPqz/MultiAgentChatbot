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

    let nodeCount = 0;
    let firstTokenTime: number | null = null;
    logger.info(`Calling agentGraph.stream...`);
    const streamStart = Date.now();

    const stream = await agentGraph.stream(initialState);
    logger.info(`agentGraph.stream ready, took ${Date.now() - streamStart}ms`);

    let lastSentLength = 0;
    let chunkCount = 0;
    for await (const chunk of stream) {
        chunkCount++;

        let parsedChunk: any = chunk;

        if (chunk instanceof Uint8Array) {
            try {
                const text = new TextDecoder().decode(chunk);
                parsedChunk = JSON.parse(text);
                logger.debug(`Chunk ${chunkCount} parsed, size: ${text.length} bytes`);
            } catch (e) {
                logger.warn('Failed to parse chunk as JSON', e);
                continue;
            }
        }

        if (parsedChunk && typeof parsedChunk === 'object') {
            //check node execution
            if (parsedChunk.agent) {
                nodeCount++;
                logger.info(`Node executed: agent (node ${nodeCount}), elapsed: ${timer.elapsed()}ms`);
            }
            if (parsedChunk.tools) {
                nodeCount++;
                logger.info(`Node executed: tools (node ${nodeCount}), elapsed: ${timer.elapsed()}ms`);
            }

            // update messages
            if (parsedChunk.messages && Array.isArray(parsedChunk.messages)) {
                finalMessages = parsedChunk.messages;
                // check for first token
                const lastMsg = finalMessages[finalMessages.length - 1];
                if (lastMsg && typeof lastMsg.content === 'string') {
                    if (firstTokenTime === null && lastMsg.content.length > 0) {
                        firstTokenTime = Date.now();
                        logger.info(`First token received at ${firstTokenTime - streamStart}ms after stream start`);
                    }
                }
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
                logger.info(`Tool calls detected: ${finalToolCalls.map((t: any) => t.name).join(', ')}`);
            }
        }
    }

    const elapsedMs = timer.elapsed();
    // const totalStreamTime = Date.now() - streamStart;

    if (!finalResponse && finalMessages.length > 0) {
        const lastMsg = finalMessages[finalMessages.length - 1];
        if (lastMsg && typeof lastMsg.content === 'string') {
            finalResponse = lastMsg.content;
            logger.warn(`Response extracted from finalMessages, length: ${finalResponse.length}`);
        }
    }

    // logger.info(`Summary:
    // - Total elapsed: ${elapsedMs}ms
    // - Stream processing: ${totalStreamTime}ms
    // - Nodes executed: ${nodeCount}
    // - Chunks received: ${chunkCount}
    // - First token delay: ${firstTokenTime ? firstTokenTime - streamStart : 'N/A'}ms
    // - Response length: ${finalResponse.length} chars
    // - Has tool calls: ${!!finalToolCalls}`);

    logger.info(`Agent completed`, {
        hasToolCalls: !!finalToolCalls,
        responseLength: finalResponse.length,
        elapsedMs,
        nodeCount,
        chunkCount
    });

    return { response: finalResponse, toolCalls: finalToolCalls, elapsedMs };
}