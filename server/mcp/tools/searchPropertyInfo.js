const logger = require('../../utils/logger');
const Property = require('../../models/Property');
const axios = require('axios');

class SearchPropertyInfoTool {
  constructor() {
    this.name = 'searchPropertyInfo';
    this.description = 'Searches for properties based on location, type, price, and other criteria';
    this.parameters = {
      query: { type: 'string', required: false, description: 'General search query' },
      location: { type: 'string', required: false, description: 'Location/area to search' },
      searchType: { type: 'string', required: false, description: 'Property type (house, apartment, condo, etc.)' },
      minPrice: { type: 'number', required: false, description: 'Minimum price' },
      maxPrice: { type: 'number', required: false, description: 'Maximum price' },
      bedrooms: { type: 'number', required: false, description: 'Number of bedrooms' },
      bathrooms: { type: 'number', required: false, description: 'Number of bathrooms' },
      userId: { type: 'string', required: false, description: 'User ID for personalized results' }
    };
  }

  async execute(params) {
    const { 
      query, 
      location, 
      searchType, 
      minPrice, 
      maxPrice, 
      bedrooms, 
      bathrooms, 
      userId 
    } = params;
    
    try {
      // Build search criteria
      const searchCriteria = this.buildSearchCriteria(params);
      
      // Search in local database first
      const localResults = await this.searchLocalDatabase(searchCriteria);
      
      // If limited results, search external APIs
      let externalResults = [];
      if (localResults.length < 5) {
        externalResults = await this.searchExternalAPIs(searchCriteria);
      }
      
      // Combine and rank results
      const allResults = [...localResults, ...externalResults];
      const rankedResults = this.rankResults(allResults, searchCriteria, userId);
      
      // Limit results to top 20
      const finalResults = rankedResults.slice(0, 20);
      
      logger.info(`Property search completed: ${finalResults.length} results found`);
      
      return {
        success: true,
        results: finalResults,
        totalFound: finalResults.length,
        searchCriteria,
        suggestions: this.generateSearchSuggestions(searchCriteria, finalResults)
      };

    } catch (error) {
      logger.error('Error searching properties:', error);
      return {
        success: false,
        error: 'Failed to search properties',
        results: [],
        totalFound: 0,
        searchCriteria: params
      };
    }
  }

  buildSearchCriteria(params) {
    const criteria = {};
    
    if (params.location) {
      criteria.location = new RegExp(params.location, 'i');
    }
    
    if (params.searchType) {
      criteria.propertyType = new RegExp(params.searchType, 'i');
    }
    
    if (params.minPrice || params.maxPrice) {
      criteria.price = {};
      if (params.minPrice) criteria.price.$gte = params.minPrice;
      if (params.maxPrice) criteria.price.$lte = params.maxPrice;
    }
    
    if (params.bedrooms) {
      criteria.bedrooms = { $gte: params.bedrooms };
    }
    
    if (params.bathrooms) {
      criteria.bathrooms = { $gte: params.bathrooms };
    }
    
    // Add general query search
    if (params.query && !params.location && !params.searchType) {
      criteria.$or = [
        { address: new RegExp(params.query, 'i') },
        { description: new RegExp(params.query, 'i') },
        { neighborhood: new RegExp(params.query, 'i') },
        { city: new RegExp(params.query, 'i') }
      ];
    }
    
    return criteria;
  }

  async searchLocalDatabase(criteria) {
    try {
      const properties = await Property.find(criteria)
        .limit(15)
        .sort({ createdAt: -1, price: 1 })
        .lean();
      
      return properties.map(property => ({
        id: property._id,
        address: property.address,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        propertyType: property.propertyType,
        description: property.description,
        images: property.images || [],
        neighborhood: property.neighborhood,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        listingDate: property.createdAt,
        source: 'local'
      }));
    } catch (error) {
      logger.error('Error searching local database:', error);
      return [];
    }
  }

  async searchExternalAPIs(criteria) {
    // Simulate external API calls (replace with actual API integrations)
    try {
      const results = [];
      
      // Example: RapidAPI Real Estate API integration
      if (process.env.RAPIDAPI_KEY) {
        const externalResults = await this.searchRapidAPI(criteria);
        results.push(...externalResults);
      }
      
      // Example: Zillow API integration (if available)
      if (process.env.ZILLOW_API_KEY) {
        const zillowResults = await this.searchZillowAPI(criteria);
        results.push(...zillowResults);
      }
      
      // Mock data for demonstration
      if (results.length === 0) {
        results.push(...this.generateMockResults(criteria));
      }
      
      return results;
    } catch (error) {
      logger.error('Error searching external APIs:', error);
      return this.generateMockResults(criteria);
    }
  }

  async searchRapidAPI(criteria) {
    // Placeholder for RapidAPI integration
    return [];
  }

  async searchZillowAPI(criteria) {
    // Placeholder for Zillow API integration
    return [];
  }

  generateMockResults(criteria) {
    const mockProperties = [
      {
        id: 'mock-1',
        address: '123 Main St, Anytown, ST 12345',
        price: 350000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        propertyType: 'house',
        description: 'Beautiful family home with modern amenities',
        images: ['https://example.com/image1.jpg'],
        neighborhood: 'Downtown',
        city: 'Anytown',
        state: 'ST',
        zipCode: '12345',
        listingDate: new Date(),
        source: 'external'
      },
      {
        id: 'mock-2',
        address: '456 Oak Ave, Somewhere, ST 67890',
        price: 275000,
        bedrooms: 2,
        bathrooms: 1,
        sqft: 1200,
        propertyType: 'apartment',
        description: 'Cozy apartment in quiet neighborhood',
        images: ['https://example.com/image2.jpg'],
        neighborhood: 'Oakwood',
        city: 'Somewhere',
        state: 'ST',
        zipCode: '67890',
        listingDate: new Date(),
        source: 'external'
      }
    ];

    // Filter mock results based on criteria
    return mockProperties.filter(property => {
      if (criteria.price) {
        if (criteria.price.$gte && property.price < criteria.price.$gte) return false;
        if (criteria.price.$lte && property.price > criteria.price.$lte) return false;
      }
      if (criteria.bedrooms && property.bedrooms < criteria.bedrooms.$gte) return false;
      if (criteria.bathrooms && property.bathrooms < criteria.bathrooms.$gte) return false;
      return true;
    });
  }

  rankResults(results, criteria, userId) {
    // Simple ranking algorithm
    return results.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      // Prefer local results
      if (a.source === 'local') scoreA += 10;
      if (b.source === 'local') scoreB += 10;
      
      // Prefer exact matches
      if (criteria.bedrooms && a.bedrooms === criteria.bedrooms) scoreA += 5;
      if (criteria.bedrooms && b.bedrooms === criteria.bedrooms) scoreB += 5;
      
      if (criteria.bathrooms && a.bathrooms === criteria.bathrooms) scoreA += 5;
      if (criteria.bathrooms && b.bathrooms === criteria.bathrooms) scoreB += 5;
      
      // Prefer newer listings
      const dateA = new Date(a.listingDate);
      const dateB = new Date(b.listingDate);
      if (dateA > dateB) scoreA += 2;
      if (dateB > dateA) scoreB += 2;
      
      return scoreB - scoreA;
    });
  }

  generateSearchSuggestions(criteria, results) {
    const suggestions = [];
    
    if (results.length === 0) {
      suggestions.push('Try expanding your search area');
      suggestions.push('Consider adjusting your price range');
      suggestions.push('Look at different property types');
    } else if (results.length < 5) {
      suggestions.push('Expand search radius');
      suggestions.push('Consider similar neighborhoods');
    } else {
      suggestions.push('Refine search with more specific criteria');
      suggestions.push('Save interesting properties to favorites');
      suggestions.push('Set up alerts for new listings');
    }
    
    return suggestions;
  }
}

module.exports = SearchPropertyInfoTool;