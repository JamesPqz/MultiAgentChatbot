import { BaseMessage } from '@langchain/core/messages';

export interface AgentState {
    messages: BaseMessage[];
    sessionId: string;
    next: string; 
}