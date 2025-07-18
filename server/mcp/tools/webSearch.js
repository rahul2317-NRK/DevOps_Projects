const logger = require('../../utils/logger');
const axios = require('axios');

class WebSearchTool {
  constructor() {
    this.name = 'webSearch';
    this.description = 'Performs web searches for real estate information and market data';
    this.parameters = {
      query: { type: 'string', required: true, description: 'Search query' },
      propertyContext: { type: 'boolean', required: false, description: 'Whether to focus on property-related results' },
      location: { type: 'string', required: false, description: 'Location to focus search on' },
      searchType: { type: 'string', required: false, description: 'Type of search (news, trends, data, etc.)' }
    };
  }

  async execute(params) {
    const { query, propertyContext = true, location, searchType = 'general' } = params;
    
    try {
      // Build enhanced search query
      const enhancedQuery = this.buildSearchQuery(query, propertyContext, location, searchType);
      
      // Perform search using available APIs
      const searchResults = await this.performSearch(enhancedQuery, searchType);
      
      // Filter and rank results for real estate relevance
      const filteredResults = this.filterRealEstateResults(searchResults, propertyContext);
      
      // Extract key information
      const extractedInfo = this.extractKeyInformation(filteredResults, searchType);
      
      const result = {
        success: true,
        query: enhancedQuery,
        results: filteredResults,
        extractedInfo,
        totalResults: filteredResults.length,
        searchType,
        timestamp: new Date().toISOString()
      };

      logger.info(`Web search completed for query: "${query}" - ${filteredResults.length} results`);
      return result;

    } catch (error) {
      logger.error('Error performing web search:', error);
      return {
        success: false,
        error: 'Failed to perform web search',
        query,
        results: [],
        extractedInfo: {},
        totalResults: 0
      };
    }
  }

  buildSearchQuery(query, propertyContext, location, searchType) {
    let enhancedQuery = query;
    
    // Add real estate context if needed
    if (propertyContext && !this.hasRealEstateKeywords(query)) {
      enhancedQuery += ' real estate property';
    }
    
    // Add location context
    if (location) {
      enhancedQuery += ` ${location}`;
    }
    
    // Add search type specific terms
    switch (searchType) {
      case 'news':
        enhancedQuery += ' news recent';
        break;
      case 'trends':
        enhancedQuery += ' market trends 2024';
        break;
      case 'data':
        enhancedQuery += ' statistics data market analysis';
        break;
      case 'prices':
        enhancedQuery += ' home prices market value';
        break;
    }
    
    return enhancedQuery;
  }

  hasRealEstateKeywords(query) {
    const keywords = [
      'property', 'house', 'home', 'apartment', 'condo', 'real estate',
      'mortgage', 'rent', 'buy', 'sell', 'market', 'price', 'listing'
    ];
    
    const lowerQuery = query.toLowerCase();
    return keywords.some(keyword => lowerQuery.includes(keyword));
  }

  async performSearch(query, searchType) {
    try {
      // Try multiple search approaches
      const results = [];
      
      // 1. Try Google Custom Search API if available
      if (process.env.GOOGLE_SEARCH_API_KEY) {
        const googleResults = await this.searchGoogle(query);
        results.push(...googleResults);
      }
      
      // 2. Try Bing Search API if available
      if (process.env.BING_SEARCH_API_KEY) {
        const bingResults = await this.searchBing(query);
        results.push(...bingResults);
      }
      
      // 3. Fallback to mock data for demonstration
      if (results.length === 0) {
        results.push(...this.getMockSearchResults(query, searchType));
      }
      
      return results;
    } catch (error) {
      logger.error('Error in search APIs:', error);
      return this.getMockSearchResults(query, searchType);
    }
  }

  async searchGoogle(query) {
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: process.env.GOOGLE_SEARCH_API_KEY,
          cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
          q: query,
          num: 10
        }
      });
      
      return response.data.items?.map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: 'google'
      })) || [];
    } catch (error) {
      logger.error('Google search error:', error);
      return [];
    }
  }

  async searchBing(query) {
    try {
      const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_API_KEY
        },
        params: {
          q: query,
          count: 10
        }
      });
      
      return response.data.webPages?.value?.map(item => ({
        title: item.name,
        url: item.url,
        snippet: item.snippet,
        source: 'bing'
      })) || [];
    } catch (error) {
      logger.error('Bing search error:', error);
      return [];
    }
  }

  getMockSearchResults(query, searchType) {
    const mockResults = [
      {
        title: 'Real Estate Market Trends 2024 - National Association of Realtors',
        url: 'https://www.nar.realtor/research-and-statistics/housing-statistics',
        snippet: 'Latest housing market trends, home prices, and sales data. Median home prices increased 3.2% year-over-year in major metropolitan areas.',
        source: 'mock'
      },
      {
        title: 'Current Mortgage Rates and Housing Market Analysis',
        url: 'https://www.freddiemac.com/primary-mortgage-market-survey',
        snippet: 'Weekly mortgage rate updates and market analysis. 30-year fixed rates averaging 7.2% with regional variations.',
        source: 'mock'
      },
      {
        title: 'Local Housing Market Report - City Planning Department',
        url: 'https://example.com/housing-report',
        snippet: 'Comprehensive analysis of local housing market conditions, including inventory levels, price trends, and market forecasts.',
        source: 'mock'
      }
    ];
    
    // Customize results based on search type
    if (searchType === 'news') {
      mockResults.push({
        title: 'Housing Market News: Interest Rate Changes Impact Home Sales',
        url: 'https://example.com/news/housing-market',
        snippet: 'Recent Federal Reserve decisions affecting mortgage rates and housing affordability across different market segments.',
        source: 'mock'
      });
    }
    
    if (searchType === 'trends') {
      mockResults.push({
        title: 'Housing Market Forecast: What to Expect in 2024',
        url: 'https://example.com/forecast',
        snippet: 'Expert predictions for housing market trends, including price projections and inventory expectations.',
        source: 'mock'
      });
    }
    
    return mockResults;
  }

  filterRealEstateResults(results, propertyContext) {
    if (!propertyContext) {
      return results;
    }
    
    const realEstateKeywords = [
      'real estate', 'property', 'house', 'home', 'apartment', 'condo',
      'mortgage', 'rent', 'buy', 'sell', 'market', 'price', 'listing',
      'housing', 'realtor', 'mls', 'zillow', 'redfin'
    ];
    
    return results.filter(result => {
      const text = (result.title + ' ' + result.snippet).toLowerCase();
      return realEstateKeywords.some(keyword => text.includes(keyword));
    });
  }

  extractKeyInformation(results, searchType) {
    const extractedInfo = {
      keyPoints: [],
      statistics: {},
      trends: [],
      sources: []
    };
    
    // Extract key information from search results
    results.forEach(result => {
      // Extract statistics (numbers, percentages, etc.)
      const stats = this.extractStatistics(result.snippet);
      if (stats.length > 0) {
        extractedInfo.statistics[result.title] = stats;
      }
      
      // Extract key points
      const keyPoints = this.extractKeyPoints(result.snippet);
      extractedInfo.keyPoints.push(...keyPoints);
      
      // Track sources
      extractedInfo.sources.push({
        title: result.title,
        url: result.url,
        domain: this.extractDomain(result.url)
      });
    });
    
    // Remove duplicates and limit results
    extractedInfo.keyPoints = [...new Set(extractedInfo.keyPoints)].slice(0, 10);
    
    return extractedInfo;
  }

  extractStatistics(text) {
    const stats = [];
    
    // Look for percentages
    const percentageMatches = text.match(/\d+\.?\d*%/g);
    if (percentageMatches) {
      stats.push(...percentageMatches);
    }
    
    // Look for dollar amounts
    const dollarMatches = text.match(/\$[\d,]+/g);
    if (dollarMatches) {
      stats.push(...dollarMatches);
    }
    
    // Look for rates
    const rateMatches = text.match(/\d+\.?\d*\s*(?:rate|percent)/gi);
    if (rateMatches) {
      stats.push(...rateMatches);
    }
    
    return stats;
  }

  extractKeyPoints(text) {
    const keyPoints = [];
    
    // Split into sentences and look for key information
    const sentences = text.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 200) {
        // Look for sentences with key indicators
        const keyIndicators = [
          'increased', 'decreased', 'trend', 'forecast', 'expect',
          'rate', 'price', 'market', 'analysis', 'report'
        ];
        
        if (keyIndicators.some(indicator => 
          trimmed.toLowerCase().includes(indicator)
        )) {
          keyPoints.push(trimmed);
        }
      }
    });
    
    return keyPoints;
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return 'unknown';
    }
  }
}

module.exports = WebSearchTool;