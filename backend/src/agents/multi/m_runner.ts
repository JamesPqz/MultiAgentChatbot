import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { multiAgentGraph } from './m_agent';
import { logger } from '../../utils/logger';

export interface MultiAgentResult {
    response: string;
    elapsedMs: number;
    agentUsed?: string;
}

export async function runMultiAgent(
    userMessage: string,
    sessionId: string,
    history: { role: string; content: string }[] = [],
    image?: { imageData?: string; imageMimeType?: string }
): Promise<MultiAgentResult> {
    const startTime = Date.now();

    // Build message history (last 10 messages for context)
    const messages: (HumanMessage | AIMessage)[] = [];
    for (const h of history.slice(-10)) {
        if (h.role === 'user') {
            messages.push(new HumanMessage(h.content));
        } else {
            messages.push(new AIMessage(h.content));
        }
    }
    messages.push(new HumanMessage(userMessage));

    const initialState = {
        messages,
        sessionId,
        next: '',
        imageData: image?.imageData,
        imageMimeType: image?.imageMimeType
    };

    let finalResponse = '';
    let agentUsed = '';

    const stream = await multiAgentGraph.stream(initialState);

    for await (const chunk of stream) {
        let parsedChunk: any = chunk;

        if (chunk instanceof Uint8Array) {
            try {
                const text = new TextDecoder().decode(chunk);
                parsedChunk = JSON.parse(text);
            } catch (e) {
                continue;
            }
        }

        if (parsedChunk && typeof parsedChunk === 'object') {
            if (parsedChunk.tool_agent) {
                agentUsed = 'ToolAgent';
                logger.info(`Executed: ToolAgent`);
            }
            if (parsedChunk.vision_agent) {
                agentUsed = 'VisionAgent';
                logger.info(`Executed: VisionAgent`);
            }
            if (parsedChunk.chat_agent) {
                agentUsed = 'ChatAgent';
                logger.info(`Executed: ChatAgent`);
            }

            // Extract response content
            let messagesList = parsedChunk.messages;
            if (!messagesList && parsedChunk.tool_agent?.messages) {
                messagesList = parsedChunk.tool_agent.messages;
            }
            if (!messagesList && parsedChunk.vision_agent?.messages) {
                messagesList = parsedChunk.vision_agent.messages;
            }
            if (!messagesList && parsedChunk.chat_agent?.messages) {
                messagesList = parsedChunk.chat_agent.messages;
            }

            if (messagesList && Array.isArray(messagesList) && messagesList.length > 0) {
                const lastMsg = messagesList[messagesList.length - 1];
                if (lastMsg && typeof lastMsg.content === 'string') {
                    finalResponse = lastMsg.content;
                }
            }
        }
    }

    const elapsedMs = Date.now() - startTime;
    logger.info(`Completed: ${agentUsed}, elapsed: ${elapsedMs}ms`);

    return {
        response: finalResponse,
        elapsedMs,
        agentUsed
    };
}