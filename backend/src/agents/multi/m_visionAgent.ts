import { AIMessage } from '@langchain/core/messages';
import { MultiAgentState } from './m_state';
import { getQwenVisionModel } from '../model';
import { logger } from '../../utils/logger';
import { VISION_AGENT_PROMPT } from '../../config/m_prompt';

export async function m_visionAgentNode(state: MultiAgentState): Promise<Partial<MultiAgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const userPrompt = lastMessage.content.toString();
    
    const visionModel = getQwenVisionModel();
    
    if (!state.imageData) {
        logger.warn('VisionAgent: No image data provided');
        const errorResponse = new AIMessage({
            content: "I couldn't process the image. Please make sure the image is valid and try again."
        });
        return {
            messages: [errorResponse],
            next: 'END'
        };
    }
    
    logger.info(`VisionAgent: Processing image with prompt: "${userPrompt.substring(0, 50)}..."`);
    
    try {
        // const result = await visionModel.generateContent([
        //     VISION_AGENT_PROMPT + '\n\n' + userPrompt,
        //     {
        //         inlineData: {
        //             data: state.imageData,
        //             mimeType: state.imageMimeType || 'image/jpeg'
        //         }
        //     }
        // ]);
        
        // const responseText = result.response.text();       
        // const response = new AIMessage({ content: responseText });

        const response = await visionModel.invoke([
            {
                role: 'user',
                content: [
                    { type: 'text', text: VISION_AGENT_PROMPT + '\n\n' + userPrompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${state.imageMimeType || 'image/jpeg'};base64,${state.imageData}`
                        }
                    }
                ]
            }
        ]);

        const responseText = response.content.toString();
        
        return {
            messages: [response],
            visionResult: responseText,
            next: 'END'
        };
    } catch (error: any) {
        logger.error(`VisionAgent error: ${error.message}`);
        const errorResponse = new AIMessage({
            content: "Sorry, I couldn't analyze this image. Please try again."
        });
        return {
            messages: [errorResponse],
            next: 'END'
        };
    }
}