import { logger } from '../utils/logger';
import { getQwenVisionModel } from '../agents/model';

export interface ImageAnalysisResult {
    responseText: string;
    mimeType: string;
    data: string;
}

export async function analyzeImage(
    imageBase64: string,
    userPrompt?: string | null
): Promise<ImageAnalysisResult> {
    const { mimeType, data } = extractBase64Data(imageBase64);
    const visionModel = getQwenVisionModel();
    
    const fullPrompt = `${userPrompt || 'Describe this image'}\n\nPlease keep your response concise. Limit to 2-3 sentences.`;
    const visionResult = await visionModel.invoke([
        {
            role: 'user',
            content: [
                { type: 'text', text: fullPrompt },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType || 'image/jpeg'};base64,${data}`
                    }
                }
            ]
        }
    ]);
    logger.info(`Vision model response: ${visionResult.content.toString()}`);
    return {
        responseText: visionResult.content.toString(),
        mimeType,
        data
    };
}

function extractBase64Data(base64String: string): { mimeType: string; data: string } {
    const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
        return {
            mimeType: matches[1],
            data: matches[2]
        };
    }
    return {
        mimeType: 'image/jpeg',
        data: base64String
    };
}