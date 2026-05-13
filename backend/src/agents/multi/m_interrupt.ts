import { interrupt } from '@langchain/langgraph';
import { logger } from '../../utils/logger';

export interface InterruptConfig {
    type: 'confirmation' | 'selection' | 'input';
    message: string;
    options?: string[];
    toolCall: {
        name: string;
        args: any;
        id: string;
    };
}

export interface InterruptResult {
    confirmed: boolean;
    userInput?: string;
    cancelled?: boolean;
}

export async function handleInterrupt(config: InterruptConfig): Promise<InterruptResult> {
    logger.info(`Triggering: ${config.type} - ${config.message}`);
    
    // try {
        const userResponse = await interrupt(config);
        logger.info(`User response: ${userResponse}`);
        
        switch (config.type) {
            case 'confirmation':
                return {
                    confirmed: userResponse === 'confirm' || userResponse === 'yes' || userResponse === 'y',
                    cancelled: userResponse === 'cancel' || userResponse === 'no'
                };
            
            case 'selection':
                const idx = parseInt(userResponse) - 1;
                if (isNaN(idx) || idx < 0 || idx >= (config.options?.length || 0)) {
                    return { confirmed: false, cancelled: true };
                }
                return {
                    confirmed: true,
                    userInput: config.options?.[idx]
                };
            
            case 'input':
                return {
                    confirmed: true,
                    userInput: userResponse
                };
            
            default:
                return { confirmed: false };
        }
    // } catch (error) {
    //     logger.error(`Triggering: ${config.type} - Error: ${error}`);
    //     return { confirmed: false, cancelled: true };
    // }
}