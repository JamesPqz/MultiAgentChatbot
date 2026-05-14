import { AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';
import { MultiAgentState } from './m_state';
import { createQwenModel } from '../model';
import { weatherTool, searchTool, sendEmailTool, timeTool, deleteFileTool,
    confirmTransferTool,confirmRiskAcknowledgmentTool,confirmIdentityChangeTool } from '../tools/index';
import { logger } from '../../utils/logger';
import { withTimeout } from '../../utils/timeout';
import { constants } from '../../config/constants';
import { TOOL_AGENT_PROMPT } from '../../config/m_prompt';
import { handleInterrupt } from './m_interrupt';
import { model } from 'mongoose';

const tools = [weatherTool, searchTool, sendEmailTool, timeTool, deleteFileTool,
    confirmTransferTool,confirmRiskAcknowledgmentTool,confirmIdentityChangeTool];
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

const SENSITIVE_TOOLS = ['send_email', 'delete_file', 
    'confirm_transfer','confirm_risk_acknowledgment','confirm_identity_change'];

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

    const model = createQwenModel().bindTools(tools);
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

            if (SENSITIVE_TOOLS.includes(toolCall.name)) {
                logger.info(`User detected sensitive tool: ${toolCall.name}, requesting confirmation`);

                const interruptResult = await handleInterrupt({
                    type: 'confirmation',
                    message: `sensitive operation confirmation\n\n
                        Are you sure you want to execute ${toolCall.name}?\n
                        Arguments: ${JSON.stringify(toolCall.args, null, 2)}\n\n
                        Please reply "confirm" to proceed or "cancel" to abort.`,
                    toolCall: {
                        name: toolCall.name,
                        args: toolCall.args,
                        id: toolCall.id
                    }
                });

                if (!interruptResult.confirmed || interruptResult.cancelled) {
                    logger.info(`User cancelled tool: ${toolCall.name}`);
                    toolMessages.push(new ToolMessage({
                        content: `operation cancelled. User cancelled the ${toolCall.name} operation.`,
                        tool_call_id: toolCall.id
                    }));
                    continue;
                }

                logger.info(`User confirmed tool: ${toolCall.name}`);
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