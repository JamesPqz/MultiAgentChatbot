export const truncate = (str: string, length: number = 100): string => {
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
};

export const toBase64 = (str: string): string => {
    return Buffer.from(str).toString('base64');
};

export const fromBase64 = (base64: string): string => {
    return Buffer.from(base64, 'base64').toString('utf-8');
};

export const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const generateSessionId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};