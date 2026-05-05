
export const generateSessionId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};