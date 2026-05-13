import { DynamicTool } from '@langchain/core/tools';
import { logger } from '../../utils/logger';

export const deleteFileTool = new DynamicTool({
    name: 'delete_file',
    description: 'Delete a file from the system. Use this when user asks to delete a file. Input should be the file path.',
    func: async (input: string) => {
        logger.info(`Delete file tool called with: ${input}`);
        // mock delete
        return `File would be deleted: ${input}`;
    }
});