import { DynamicTool } from '@langchain/core/tools';
import { WEATHER_MOCK_DATA, DEFAULT_WEATHER_MOCK } from '../../config/fallback/weather_mock';
import { constants } from '../../config/constants';
import { logger } from '../../utils/logger';

async function fetchRealWeather(city: string): Promise<string | null> {
    try {
        const url = `https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+%w`;
        
        // 可以设置一个短一点的超时，比如 3 秒
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const weatherText = await response.text();
            const result = weatherText.trim().split('\n')[0];
            return `${city} weather: ${result}`;
        } else {
            console.warn(`Weather API (wttr.in) returned ${response.status} for city: ${city}`);
            return null;
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.warn(`Weather API (wttr.in) timeout for city: ${city}`);
        } else {
            console.warn(`Weather API (wttr.in) error for city ${city}: ${error.message}`);
        }
        return null;
    }
}

function getMockWeather(city: string): string {
    if (WEATHER_MOCK_DATA[city]) {
        logger.debug(`Weather mock exact match for: ${city}`);
        return WEATHER_MOCK_DATA[city];
    }

    for (const [key, value] of Object.entries(WEATHER_MOCK_DATA)) {
        if (city.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(city.toLowerCase())) {
            logger.debug(`Weather mock fuzzy match: ${city} -> ${key}`);
            return value;
        }
    }

    logger.debug(`Weather mock using default for: ${city}`);
    return DEFAULT_WEATHER_MOCK;
}

export const weatherTool = new DynamicTool({
    name: 'get_weather',
    description: 'Get current weather for a city. Use this when user asks about weather, temperature, or climate in a specific location like Hong Kong, Beijing, Shanghai, etc.',
    func: async (input: string) => {
        const city = input.trim();
        if (!city) {
            logger.warn('Weather tool called with empty city');
            return 'Please provide a city name.';
        }

        logger.info(`Weather tool called for city: ${city}`);

        try {
            const realResult = await fetchRealWeather(city);
            if (realResult) return realResult;
        } catch (error) {
            logger.warn(`Weather API failed, using mock for ${city}`);
        }

        logger.info(`Weather tool falling back to mock for: ${city}`);
        return getMockWeather(city);
    }
});