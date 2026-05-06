export const constants = {

    // API 超时配置
    API_TIMEOUT_MS: 5000,
    MODEL_TIMEOUT_MS: 30000,

    // 会话
    SESSION_ID_LENGTH: 64,
    DEFAULT_SESSION_LIMIT: 20,
    DEFAULT_HISTORY_LIMIT: 10,
    
    // 消息
    MAX_MESSAGE_LENGTH: 5000,
    MAX_HISTORY_MESSAGES: 50,
    
    // 图片
    MAX_IMAGE_SIZE_MB: 5,
    SUPPORTED_IMAGE_TYPES: ['jpeg', 'png', 'jpg', 'gif', 'webp'],
    
    // 超时
    DEFAULT_TIMEOUT_MS: 30000,
    STREAM_TIMEOUT_MS: 60000,
    
    // 重试
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    RETRY_BACKOFF_FACTOR: 2,  // 指数退避倍数
    
    // 模型
    DEFAULT_MODEL: 'gemini-2.5-flash',
    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_MAX_TOKENS: 2048

};