import { DynamicTool } from '@langchain/core/tools';
import { logger } from '../../utils/logger';

export const timeTool = new DynamicTool({
    name: 'get_current_time',
    description: 'Get current time and date. Use this when user asks for current time, date, or what time it is.',
    func: async (input: string) => {
        logger.info(`Time tool called with: ${input}`);
        
        const now = new Date();
        const formatted = now.toLocaleString('en-HK', {
            timeZone: 'Asia/Hong_Kong',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        return `Current time in Hong Kong: ${formatted}`;
    }
});