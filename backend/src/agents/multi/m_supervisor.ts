import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { MultiAgentState } from './m_state';
import { createFastModel, createQwenModel } from '../model';
import { logger } from '../../utils/logger';
import { SUPERVISOR_PROMPT } from '../../config/m_prompt';

export async function m_supervisorNode(state: MultiAgentState): Promise<Partial<MultiAgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const userInput = lastMessage.content.toString();
    
    logger.info(`Supervisor analyzing: "${userInput.substring(0, 50)}..."`);
    
    const model = createQwenModel();
    logger.info(`Using model: ${model.model}`);
    const response = await model.invoke([
        new SystemMessage(SUPERVISOR_PROMPT),
        new HumanMessage(userInput)
    ]);
    
    const output = response.content.toString().toLowerCase().trim();
    
    let taskType: 'tool' | 'vision' | 'chat' = 'chat';
    let next = '';
    
    if (output.includes('tool')) {
        taskType = 'tool';
        next = 'tool_agent';
    } else if (output.includes('vision')) {
        taskType = 'vision';
        next = 'vision_agent';
    } else {
        taskType = 'chat';
        next = 'chat_agent';
    }
    
    logger.info(`Supervisor decision: ${taskType} -> ${next}`);
    
    return {
        taskType,
        next
    };
}