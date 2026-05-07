export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    success: boolean;
    data: {
        sessionId: string;
        response: string;
        elapsedMs?: number;
    };
    error?: string;
}