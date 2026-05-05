import { DynamicTool } from '@langchain/core/tools';
import { SEARCH_MOCK_DATA, DEFAULT_SEARCH_MOCK } from '../../config/fallback/search_mock';
import { constants } from '../../config/constants';
import { logger } from '../../utils/logger';

async function fetchRealSearch(query: string): Promise<string | null> {
    try {
        const apiKey = process.env.BRAVE_API_KEY;
        if (!apiKey) {
            logger.warn('BRAVE_API_KEY not set, falling back to mock');
            return null;
        }

        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), constants.API_TIMEOUT_MS);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': apiKey
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.warn(`Search API returned ${response.status} for query: ${query}`);
            return null;
        }

        const data = await response.json();
        const results = data.web?.results || [];
        
        if (results.length === 0) {
            logger.info(`No search results for query: ${query}`);
            return null;
        }

        logger.info(`Search API success for query: ${query}, returned ${results.length} results`);
        
        return results.map((r: any, i: number) => 
            `${i + 1}. ${r.title}\n   ${r.description}\n`
        ).join('\n');
    } catch (error: any) {
        if (error.name === 'AbortError') {
            logger.warn(`Search API timeout after ${constants.API_TIMEOUT_MS}ms for query: ${query}`);
        } else {
            logger.warn(`Search API error for query ${query}: ${error.message}`);
        }
        return null;
    }
}

function getMockSearch(query: string): string {
    // 模糊匹配
    for (const [key, value] of Object.entries(SEARCH_MOCK_DATA)) {
        if (query.toLowerCase().includes(key.toLowerCase()) || 
            key.toLowerCase().includes(query.toLowerCase())) {
            logger.debug(`Search mock fuzzy match: ${query} -> ${key}`);
            return value;
        }
    }
    
    logger.debug(`Search mock using default for: ${query}`);
    return DEFAULT_SEARCH_MOCK;
}

export const searchTool = new DynamicTool({
    name: 'web_search',
    description: 'Search the web for real-time information. Use this when users ask about latest news, current events, or need external information. Input should be the search query.',
    func: async (input: string) => {
        const query = input.trim();
        if (!query) {
            logger.warn('Search tool called with empty query');
            return 'Please provide a search query.';
        }
        
        logger.info(`Search tool called for query: ${query}`);
        
        const realResult = await fetchRealSearch(query);
        if (realResult) {
            logger.info(`Search tool returning real data for: ${query}`);
            return realResult;
        }
        
        logger.info(`Search tool falling back to mock for: ${query}`);
        return getMockSearch(query);
    }
});