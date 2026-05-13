const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

export interface SendMessageParams {
    message: string;
    sessionId?: string | null;
    image?: string | null;
    agentMode?: 'single' | 'multi' | 'auto';
    resume?: boolean;
    resumeValue?: string;
}

export const sendMessage = async (params: SendMessageParams): Promise<any> => {
    const body: any = {
        message: params.message,
        sessionId: params.sessionId,
        agentMode: params.agentMode || 'auto'
    };
    if (params.image) body.image = params.image;
    if (params.resume) {
        body.resume = true;
        body.resumeValue = params.resumeValue;
    }

    const response = await fetch(`${API_URL}/ab-chat/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Request failed');
    }
    console.log('API response data:', data); // Debug log
    return data.data;
};

export async function getABStats(): Promise<any> {
    const response = await fetch('/api/ab-chat/ab-test/stats');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to get stats');
    return result.data;
}

export async function clearABStats(): Promise<void> {
    const response = await fetch('/api/ab-chat/ab-test/clear', { method: 'DELETE' });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to clear stats');
}

export async function getChatHistory(sessionId: string): Promise<any[]> {
    const response = await fetch(`/api/history/${sessionId}`);
    const result = await response.json();
    if (!result.success) return [];
    return result.data.history;
}

export async function clearChatHistory(sessionId: string): Promise<void> {
    const response = await fetch(`/api/history/${sessionId}`, {
        method: 'DELETE'
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to clear history');
}

export async function resumeInterrupt(sessionId: string, confirmed: boolean): Promise<string> {
    const response = await fetch(`${API_URL}/ab-chat/chat/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, confirmed })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Resume failed');
    return data.data.response;
}
