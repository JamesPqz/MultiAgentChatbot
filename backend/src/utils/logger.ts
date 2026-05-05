export const logger = {
    info: (message: string, ...meta: any[]) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...meta);
    },
    
    error: (message: string, ...meta: any[]) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...meta);
    },
    
    warn: (message: string, ...meta: any[]) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...meta);
    },
    
    debug: (message: string, ...meta: any[]) => {
        if (process.env.DEBUG === 'true') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...meta);
        }
    },

    request: (req: any, elapsedMs?: number) => {
        const ip = req.ip || req.connection?.remoteAddress;
        const logMsg = `${req.method} ${req.url} - ${ip}`;
        if (elapsedMs) {
            console.log(`[REQUEST] ${logMsg} - ${elapsedMs}ms`);
        } else {
            console.log(`[REQUEST] ${logMsg}`);
        }
    },

    response: (status: number, elapsedMs: number) => {
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
        console.log(`[RESPONSE] ${status} - ${elapsedMs}ms`);
    }
};