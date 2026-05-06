import { DynamicTool } from '@langchain/core/tools';
import { WEATHER_MOCK_DATA, DEFAULT_WEATHER_MOCK } from '../../config/fallback/weather_mock';
import { constants } from '../../config/constants';
import { logger } from '../../utils/logger';

async function fetchRealWeather(city: string): Promise<string | null> {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
            logger.warn('OPENWEATHER_API_KEY not set, falling back to mock');
            return null;
        }

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), constants.API_TIMEOUT_MS);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.warn(`Weather API returned ${response.status} for city: ${city}`);
            return null;
        }

        const data = await response.json();
        const weatherDesc = data.weather[0].description;
        const temp = Math.round(data.main.temp);
        const humidity = data.main.humidity;

        logger.info(`Weather API success for city: ${city}`);
        return `${city}: ${weatherDesc}, ${temp}°C, humidity ${humidity}%.`;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            logger.warn(`Weather API timeout after ${constants.API_TIMEOUT_MS}ms for city: ${city}`);
        } else {
            logger.warn(`Weather API error for city ${city}: ${error.message}`);
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