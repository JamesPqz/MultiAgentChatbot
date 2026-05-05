import { constants } from '../config/constants';

export const retry = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = constants.MAX_RETRIES,
    delayMs: number = constants.RETRY_DELAY_MS
): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const waitTime = delayMs * Math.pow(constants.RETRY_BACKOFF_FACTOR, i);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    throw lastError;
};