import { SystemMessage, AIMessage } from '@langchain/core/messages';
import { MultiAgentState } from './m_state';
import { createModel, createQwenModel } from '../model';
import { logger } from '../../utils/logger';
import { withTimeout } from '../../utils/timeout';
import { constants } from '../../config/constants';
import { CHAT_AGENT_PROMPT } from '../../config/m_prompt';

async function invokeWithTimeout(messages: any[], timeoutMs: number = constants.MODEL_TIMEOUT_MS) {
    const model = createQwenModel()
    // logger.info(`Using model: ${model.model}`);
    try {
        logger.info(`Invoking model with ${messages}`)
        const response = await withTimeout(
            model.invoke(messages),
            timeoutMs,
            `ChatAgent timeout after ${timeoutMs}ms`
        );
        return response;
    } catch (error: any) {
        if (error.message?.toLowerCase().includes('timeout')) {
            logger.warn(`ChatAgent timeout, returning fallback`);
            return new AIMessage({
                content: "I'm having trouble processing that request. Please try again in a moment."
            });
        }
        throw error;
    }
}

export async function m_chatAgentNode(state: MultiAgentState): Promise<Partial<MultiAgentState>> {
    const messagesWithSystem = [
        new SystemMessage(CHAT_AGENT_PROMPT),
        ...state.messages
    ];

    logger.info(`ChatAgent: processing with ${messagesWithSystem.length} messages`);

    const response = await invokeWithTimeout(messagesWithSystem);

    logger.info(`ChatAgent: response generated (${response.content?.length || 0} chars)`);

    return {
        messages: [response],
        next: 'END'
    };
}