import { AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';
import { MultiAgentState } from './m_state';
import { createModel, createQwenModel } from '../model';
import { weatherTool, searchTool } from '../tools/index';
import { logger } from '../../utils/logger';
import { withTimeout } from '../../utils/timeout';
import { constants } from '../../config/constants';
import { TOOL_AGENT_PROMPT } from '../../config/m_prompt';

const tools = [weatherTool, searchTool];
const toolsByName = {
    [weatherTool.name]: weatherTool,
    [searchTool.name]: searchTool
};

const model = createQwenModel().bindTools(tools);

async function invokeToolWithTimeout(tool: any, args: any, timeoutMs: number = constants.API_TIMEOUT_MS) {
    try {
        const result = await withTimeout(
            tool.invoke(args) as Promise<string>,
            timeoutMs,
            `Tool ${tool.name} timeout`
        );
        return result;
    } catch (error: any) {
        if (error.message?.toLowerCase().includes('timeout')) {
            logger.warn(`Tool ${tool.name} timeout, returning fallback`);
            return `${tool.name} service temporarily unavailable. Please try again later.`;
        }
        throw error;
    }
}

export async function m_toolAgentNode(state: MultiAgentState): Promise<Partial<MultiAgentState>> {
    const messagesWithSystem = [new SystemMessage(TOOL_AGENT_PROMPT), ...state.messages];
    
    logger.info(`ToolAgent: calling model with ${messagesWithSystem.length} messages`);
    
    const response = await model.invoke(messagesWithSystem);
    const lastMessage = response as AIMessage;
    
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        logger.info(`ToolAgent calling tools: ${lastMessage.tool_calls.map((t: any) => t.name).join(', ')}`);
        
        const toolMessages: ToolMessage[] = [];
        const toolResults: string[] = [];
        
        for (const toolCall of lastMessage.tool_calls) {
            const tool = toolsByName[toolCall.name];
            if (!tool) {
                logger.warn(`Tool not found: ${toolCall.name}`);
                continue;
            }
            
            const result = await invokeToolWithTimeout(tool, toolCall.args);
            toolMessages.push(new ToolMessage({
                content: result,
                tool_call_id: toolCall.id
            }));
            toolResults.push(result);
        }
        
        return {
            messages: [lastMessage, ...toolMessages],
            toolResults,
            next: 'tool_agent'  
        };
    }
    
    // No tool calls, return final response
    logger.info(`ToolAgent returning final response`);
    return {
        messages: [lastMessage],
        next: 'END'
    };
}