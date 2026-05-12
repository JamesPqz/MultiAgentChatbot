import { BaseMessage } from '@langchain/core/messages';

export interface MultiAgentState {
    messages: BaseMessage[];
    sessionId: string;
    next: string;           // 'supervisor' | 'tool_agent' | 'vision_agent' | 'chat_agent' | END
    taskType?: 'tool' | 'vision' | 'chat' | null;
    imageData?: string;     // base64 image data for vision agent
    imageMimeType?: string; // mime type of the image
    toolResults?: string[]; // results from tool calls
    visionResult?: string;  // result from vision agent
}