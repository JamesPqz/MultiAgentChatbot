import { StateGraph, END, START } from '@langchain/langgraph';
import { MultiAgentState } from './m_state';
import { m_supervisorNode } from './m_supervisor';
import { m_toolAgentNode } from './m_toolAgent';
import { m_visionAgentNode } from './m_visionAgent';
import { m_chatAgentNode } from './m_chatAgent';
import { logger } from '../../utils/logger';

const workflow = new StateGraph<MultiAgentState>({
    channels: {
        messages: { value: (a, b) => [...a, ...b], default: () => [] },
        sessionId: { value: (a, b) => b || a, default: () => '' },
        next: { value: (a, b) => b || a, default: () => '' },
        taskType: { value: (a, b) => b || a, default: () => null },
        imageData: { value: (a, b) => b || a, default: () => undefined },
        imageMimeType: { value: (a, b) => b || a, default: () => undefined },
        toolResults: { value: (a, b) => [...(a || []), ...(b || [])], default: () => [] },
        visionResult: { value: (a, b) => b || a, default: () => undefined }
    }
});

workflow.addNode('supervisor', m_supervisorNode);
workflow.addNode('tool_agent', m_toolAgentNode);
workflow.addNode('vision_agent', m_visionAgentNode);
workflow.addNode('chat_agent', m_chatAgentNode);

workflow.addEdge(START as any, 'supervisor' as any);

// Conditional routing based on supervisor decision
workflow.addConditionalEdges('supervisor' as any, (state: MultiAgentState) => {
    logger.info(`Routing to: ${state.next}`);
    return state.next;
});

// All sub-agents go to END
workflow.addEdge('tool_agent' as any, END as any);
workflow.addEdge('vision_agent' as any, END as any);
workflow.addEdge('chat_agent' as any, END as any);

export const multiAgentGraph = workflow.compile();