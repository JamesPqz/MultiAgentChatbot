export const isValidBase64Image = (str: string): boolean => {
    return /^data:image\/(jpeg|png|jpg|gif|webp);base64,/.test(str);
};

export const extractBase64Data = (base64Str: string): { mimeType: string; data: string } => {
    const matches = base64Str.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) throw new Error('Invalid base64 image format');
    return { mimeType: `image/${matches[1]}`, data: matches[2] };
};