//solve uuid v4 duplication issue
import { v4 as uuidv4 } from 'uuid';

const coreUuidPath = require.resolve('@langchain/core/utils/uuid');
const originalModule = require(coreUuidPath);

const patchedModule = {
    ...originalModule,
    v4: uuidv4,
    default: { v4: uuidv4 }
};

require.cache[coreUuidPath]!.exports = patchedModule;
//solve uuid v4 duplication issue end

import { StateGraph, END, START } from '@langchain/langgraph';
import { SystemMessage, AIMessage, ToolMessage, HumanMessage } from '@langchain/core/messages';
import { AgentState } from './state';
import { createModel } from './model';
import { weatherTool, searchTool, timeTool, deleteFileTool, confirmIdentityChangeTool, confirmRiskAcknowledgmentTool, confirmTransferTool } from './tools/index';
import { logger } from '../utils/logger';
import { constants } from '../config/constants';
import { withTimeout } from '../utils/timeout';
import { SYSTEM_PROMPT, FALLBACK_RESPONSE, TOOL_TIMEOUT_RESPONSE } from '../config/prompt';
import { sendEmailTool } from './tools/email_tool';

const tools = [weatherTool, searchTool, sendEmailTool, timeTool, deleteFileTool, 
    confirmTransferTool, confirmRiskAcknowledgmentTool, confirmIdentityChangeTool];
const toolsByName = {
    [weatherTool.name]: weatherTool,
    [searchTool.name]: searchTool,
    [sendEmailTool.name]: sendEmailTool,
    [timeTool.name]: timeTool,
    [deleteFileTool.name]: deleteFileTool,
    [confirmTransferTool.name]: confirmTransferTool,
    [confirmRiskAcknowledgmentTool.name]: confirmRiskAcknowledgmentTool,
    [confirmIdentityChangeTool.name]: confirmIdentityChangeTool
};

async function invokeModelWithTimeout(messages: any[], timeoutMs: number = constants.MODEL_TIMEOUT_MS) {
    try {
        const model = createModel().bindTools(tools);
        logger.info(`Using model: ${model.name}`);
        const response = await withTimeout(
            model.invoke(messages),
            timeoutMs,
            `Model invocation timeout after ${timeoutMs}ms`
        );
        return response;
    } catch (error: any) {
        if (error.message?.toLowerCase().includes('timeout')) {
            logger.warn(`Model invoke timeout after ${timeoutMs}ms, returning fallback response`);
            return new AIMessage({ content: FALLBACK_RESPONSE });
        }
        throw error;
    }
}

async function invokeToolWithTimeout(tool: any, args: any, timeoutMs: number = constants.API_TIMEOUT_MS) {
    try {
        const result = await withTimeout(
            tool.invoke(args) as Promise<string>,
            timeoutMs,
            `Tool ${tool.name} timeout after ${timeoutMs}ms`
        );
        return result;
    } catch (error: any) {
        if (error.message?.toLowerCase().includes('timeout')) {
            logger.warn(`Tool ${tool.name} timeout after ${timeoutMs}ms, returning fallback`);
            // return TOOL_TIMEOUT_RESPONSE;
        }
        throw error;
    }
}

async function agentNode(state: AgentState) {
    const messagesWithSystem = [new SystemMessage(SYSTEM_PROMPT), ...state.messages];
    logger.info(`Agent node: calling model with ${messagesWithSystem.length} messages`);
    const response = await invokeModelWithTimeout(messagesWithSystem);
    logger.info(`Agent node: model responded with ${response.content?.length || 0} chars`);
    const lastMessage = response;
    
    const next = (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) ? 'tools' : END;
    
    if (next === 'tools') {
        logger.info(`Agent decided to use tools: ${lastMessage.tool_calls.map((t: any) => t.name).join(', ')}`);
    } else {
        logger.info('Agent decided to respond with built-in knowledge');
    }
    
    return {
        messages: [response],
        next
    };
}

async function toolsNode(state: AgentState) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMessage.tool_calls || [];
    
    const toolMessages = [];
    
    for (const toolCall of toolCalls) {
        const tool = toolsByName[toolCall.name];
        if (!tool) {
            logger.warn(`Tool not found: ${toolCall.name}`);
            continue;
        }
        
        logger.info(`Executing tool: ${toolCall.name}`, { args: toolCall.args });
        
        try {
            const result = await invokeToolWithTimeout(tool, toolCall.args);
            toolMessages.push(new ToolMessage({
                content: result,
                tool_call_id: toolCall.id
            }));
            logger.info(`Tool executed successfully: ${toolCall.name}`);
        } catch (error: any) {
            logger.error(`Tool execution failed: ${toolCall.name}`, error);
            toolMessages.push(new ToolMessage({
                content: `Tool execution failed: ${error.message}`,
                tool_call_id: toolCall.id
            }));
        }
    }
    logger.info(`Tools node returning ${toolMessages.length} tool messages`);
    
    return {
        messages: toolMessages,
        next: 'agent'
    };
}

// build the state graph
const workflow = new StateGraph<AgentState>({
    channels: {
        messages: { value: (a, b) => [...a, ...b].slice(-constants.DEFAULT_HISTORY_LIMIT), default: () => [] },
        sessionId: { value: (a, b) => b || a, default: () => '' },
        next: { value: (a, b) => b || a, default: () => END }
    }
});

workflow.addNode('agent', agentNode);
workflow.addNode('tools', toolsNode);

workflow.addEdge(START as any, 'agent' as any);
workflow.addConditionalEdges('agent' as any, (state: AgentState) => state.next);
workflow.addEdge('tools' as any, 'agent' as any);

export const agentGraph = workflow.compile();