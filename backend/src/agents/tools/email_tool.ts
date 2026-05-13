import { DynamicTool } from '@langchain/core/tools';
import { logger } from '../../utils/logger';

export const sendEmailTool = new DynamicTool({
    name: 'send_email',
    description: `CRITICAL: You MUST use this tool when user asks to send an email. 
        This is a mock tool for testing. 
        Input should be JSON: {"to": "email", "subject": "...", "body": "..."}`,
    func: async (input: string) => {
        logger.info(`Sending email with: ${input}`);

        try {
            const { to, subject, body } = JSON.parse(input);
            // simulate send email
            await new Promise(resolve => setTimeout(resolve, 1000));
            return `Email sent successfully to ${to}. Subject: ${subject}`;
        } catch (error) {
            return `Failed to send email: ${error}`;
        }
    }
});