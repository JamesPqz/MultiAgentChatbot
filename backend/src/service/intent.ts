// src/services/intent.ts
import { logger } from '../utils/logger';

export type IntentType = 'weather' | 'search' | 'greeting' | 'vision' | 'llm';
type LanguageType = 'en' | 'zh-CN' | 'zh-TW' | 'other';

export interface IntentResult {
    intent: IntentType;
    entity?: string;
    confidence: number;
    language: LanguageType;
}

function detectLanguage(text: string): LanguageType {
    if (/^[a-zA-Z\s\d\p{P}]+$/u.test(text)) {
        return 'en';
    }
    const twPattern = /[氣溫聞請問裡謝對幫關係會這裡嗎麼咁樣會發現過國寫說話後來於時間萬還報]/;
    if (twPattern.test(text)) {
        return 'zh-TW';
    }

    const cnPattern = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
    if (cnPattern.test(text)) {
        return 'zh-CN';
    }

    return 'other';
}

const cityMap: Record<string, Record<string, string>> = {
    en: {
        'hong kong': 'Hong Kong',
        'beijing': 'Beijing',
        'shanghai': 'Shanghai',
        'tokyo': 'Tokyo',
        'london': 'London',
        'new york': 'New York'
    },
    'zh-CN': {
        '香港': 'Hong Kong',
        '北京': 'Beijing',
        '上海': 'Shanghai',
        '东京': 'Tokyo',
        '伦敦': 'London',
        '纽约': 'New York'
    },
    'zh-TW': {
        '香港': 'Hong Kong',
        '北京': 'Beijing',
        '上海': 'Shanghai',
        '東京': 'Tokyo',
        '倫敦': 'London',
        '紐約': 'New York'
    }
};

const patterns: Record<IntentType, Record<string, string[]>> = {
    weather: {
        en: ['weather', 'temperature', 'temp', 'forecast', 'climate'],
        'zh-CN': ['天气', '温度', '气温', '预报', '气候'],
        'zh-TW': ['天氣', '溫度', '氣溫', '預報', '氣候']
    },
    search: {
        en: ['search', 'news', 'latest', 'find', 'google'],
        'zh-CN': ['搜索', '新闻', '最新', '查找', '资讯'],
        'zh-TW': ['搜索', '新聞', '最新', '查找', '資訊']
    },
    greeting: {
        en: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'],
        'zh-CN': ['你好', '您好', '嗨', '早上好', '下午好', '晚上好', '谢谢', '感谢', '对不起'],
        'zh-TW': ['你好', '您好', '嗨', '早上好', '下午好', '晚上好', '謝謝', '感謝', '對不起']
    },
    vision: {
        en: ['image', 'picture', 'photo', 'see', 'look'],
        'zh-CN': ['图片', '图像', '照片', '看', '识别'],
        'zh-TW': ['圖片', '圖像', '照片', '看', '識別']
    },
    llm: {
        en: [],
        'zh-CN': [],
        'zh-TW': []
    }
};

function matchKeywords(text: string, intent: IntentType, lang: LanguageType): boolean {
    const keywords = patterns[intent][lang];
    const lower = text.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
}

function extractCity(text: string, lang: LanguageType): string | undefined {
    const lower = text.toLowerCase();
    const map = cityMap[lang];
    for (const [key, value] of Object.entries(map)) {
        if (lower.includes(key.toLowerCase())) return value;
    }
    return undefined;
}

export function detectIntent(text: string): IntentResult {
    const lang = detectLanguage(text);
    const lower = text.toLowerCase();

    if (matchKeywords(text, 'greeting', lang) && text.length < 50) {
        logger.debug(`Intent: greeting, language: ${lang}`);
        return { intent: 'greeting', confidence: 0.9, language: lang };
    }

    // Weather
    if (matchKeywords(text, 'weather', lang)) {
        const city = extractCity(text, lang) || 'Hong Kong';
        logger.debug(`Intent: weather -> ${city}, language: ${lang}`);
        return { intent: 'weather', entity: city, confidence: 0.95, language: lang };
    }

    // Search
    if (matchKeywords(text, 'search', lang)) {
        logger.debug(`Intent: search, language: ${lang}`);
        return { intent: 'search', entity: text, confidence: 0.85, language: lang };
    }

    // Vision
    if (matchKeywords(text, 'vision', lang)) {
        logger.debug(`Intent: vision, language: ${lang}`);
        return { intent: 'vision', confidence: 0.8, language: lang };
    }

    // Default to LLM
    logger.debug(`Intent: llm, language: ${lang}`);
    return { intent: 'llm', confidence: 0.5, language: lang };

}