import fs from 'fs';
import path from 'path';

// ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });

const write = (level: string, message: string, meta?: any) => {
    const timestamp = new Date().toLocaleString();
    const log = `[${level}] ${timestamp} - ${message}${meta ? ' ' + JSON.stringify(meta) : ''}\n`;
    logFile.write(log);
    console.log(log.trim());
};

export const logger = {
    info: (message: string, meta?: any) => write('INFO', message, meta),
    error: (message: string, meta?: any) => write('ERROR', message, meta),
    warn: (message: string, meta?: any) => write('WARN', message, meta),
    debug: (message: string, meta?: any) => process.env.DEBUG === 'true' && write('DEBUG', message, meta),
    request: (req: any, elapsedMs?: number) => {
        const ip = req.ip || req.connection?.remoteAddress;
        logger.info(`${req.method} ${req.url} - ${ip}${elapsedMs ? ` (${elapsedMs}ms)` : ''}`);
    },
    response: (status: number, elapsedMs: number) => {
        logger.info(`${status} - ${elapsedMs}ms`);
    }
};