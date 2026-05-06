const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

export interface SendMessageParams {
    message: string;
    sessionId?: string | null;
    image?: string | null;
}

export const sendMessage = async (params: SendMessageParams): Promise<string> => {
    const { message, sessionId, image } = params;

    const body: Record<string, string | null | undefined> = { message };
    if (sessionId) body.sessionId = sessionId;
    if (image) body.image = image;

    const response = await fetch(`${API_URL}/chat/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Request failed');
    }

    return data.data.response;
};