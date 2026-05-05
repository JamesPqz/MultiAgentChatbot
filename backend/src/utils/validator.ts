export const isValidSessionId = (id: string): boolean => {
    return /^[a-zA-Z0-9_-]{8,64}$/.test(id);
};

export const isValidMessage = (msg: string): boolean => {
    return typeof msg === 'string' && msg.trim().length > 0 && msg.length <= 5000;
};

export const sanitizeInput = (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
};