const logger = require('../../utils/logger');
const UserProperty = require('../../models/UserProperty');
const Property = require('../../models/Property');

class GetUserSavedPropertiesTool {
  constructor() {
    this.name = 'getUserSavedProperties';
    this.description = 'Retrieves user\'s saved/favorite properties with updates and analysis';
    this.parameters = {
      userId: { type: 'string', required: true, description: 'User ID' },
      limit: { type: 'number', required: false, description: 'Maximum number of properties to return' },
      sortBy: { type: 'string', required: false, description: 'Sort criteria (date, price, etc.)' }
    };
  }

  async execute(params) {
    const { userId, limit = 20, sortBy = 'date' } = params;
    
    try {
      // Get user's saved properties
      const savedProperties = await this.getUserSavedProperties(userId, limit, sortBy);
      
      // Get property updates (price changes, status changes)
      const propertyUpdates = await this.getPropertyUpdates(savedProperties);
      
      // Analyze saved properties
      const analysis = this.analyzeSavedProperties(savedProperties);
      
      // Get recommendations based on saved properties
      const recommendations = this.generateRecommendations(savedProperties, analysis);

      const result = {
        success: true,
        savedProperties: savedProperties.map(sp => ({
          ...sp,
          updates: propertyUpdates[sp.propertyId] || []
        })),
        analysis,
        recommendations,
        totalSaved: savedProperties.length,
        lastUpdated: new Date().toISOString()
      };

      logger.info(`Retrieved ${savedProperties.length} saved properties for user ${userId}`);
      return result;

    } catch (error) {
      logger.error('Error retrieving saved properties:', error);
      return {
        success: false,
        error: 'Failed to retrieve saved properties',
        savedProperties: [],
        analysis: {},
        recommendations: [],
        totalSaved: 0
      };
    }
  }

  async getUserSavedProperties(userId, limit, sortBy) {
    try {
      let sortCriteria = {};
      
      switch (sortBy) {
        case 'price':
          sortCriteria = { 'property.price': 1 };
          break;
        case 'price_desc':
          sortCriteria = { 'property.price': -1 };
          break;
        case 'date':
        default:
          sortCriteria = { createdAt: -1 };
          break;
      }

      const savedProperties = await UserProperty.aggregate([
        { $match: { userId: userId } },
        {
          $lookup: {
            from: 'properties',
            localField: 'propertyId',
            foreignField: '_id',
            as: 'property'
          }
        },
        { $unwind: '$property' },
        { $sort: sortCriteria },
        { $limit: limit },
        {
          $project: {
            propertyId: '$propertyId',
            savedDate: '$createdAt',
            notes: '$notes',
            alerts: '$alerts',
            viewCount: '$viewCount',
            lastViewed: '$lastViewed',
            property: {
              id: '$property._id',
              address: '$property.address',
              price: '$property.price',
              bedrooms: '$property.bedrooms',
              bathrooms: '$property.bathrooms',
              sqft: '$property.sqft',
              propertyType: '$property.propertyType',
              description: '$property.description',
              images: '$property.images',
              neighborhood: '$property.neighborhood',
              city: '$property.city',
              state: '$property.state',
              zipCode: '$property.zipCode',
              status: '$property.status',
              listingDate: '$property.createdAt',
              pricePerSqft: {
                $cond: {
                  if: { $gt: ['$property.sqft', 0] },
                  then: { $divide: ['$property.price', '$property.sqft'] },
                  else: null
                }
              }
            }
          }
        }
      ]);

      return savedProperties;
    } catch (error) {
      logger.error('Error querying saved properties:', error);
      return [];
    }
  }

  async getPropertyUpdates(savedProperties) {
    const updates = {};
    
    try {
      for (const savedProperty of savedProperties) {
        const propertyId = savedProperty.propertyId;
        const savedDate = savedProperty.savedDate;
        
        // In a real implementation, this would check for actual price history
        // For now, we'll simulate some updates
        const propertyUpdates = await this.getPropertyUpdateHistory(propertyId, savedDate);
        
        if (propertyUpdates.length > 0) {
          updates[propertyId] = propertyUpdates;
        }
      }
    } catch (error) {
      logger.error('Error getting property updates:', error);
    }
    
    return updates;
  }

  async getPropertyUpdateHistory(propertyId, savedDate) {
    try {
      // Mock property update history
      const updates = [];
      
      // Simulate some updates (in real implementation, query price history table)
      const random = Math.random();
      
      if (random > 0.7) {
        updates.push({
          type: 'price_change',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          oldValue: 350000,
          newValue: 345000,
          change: -5000,
          changePercent: -1.43
        });
      }
      
      if (random > 0.8) {
        updates.push({
          type: 'status_change',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          oldValue: 'active',
          newValue: 'pending',
          message: 'Property is now under contract'
        });
      }
      
      if (random > 0.9) {
        updates.push({
          type: 'new_photos',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          message: '5 new photos added'
        });
      }
      
      return updates;
    } catch (error) {
      logger.error('Error getting property update history:', error);
      return [];
    }
  }

  analyzeSavedProperties(savedProperties) {
    if (!savedProperties || savedProperties.length === 0) {
      return {
        totalProperties: 0,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        propertyTypes: {},
        locations: {},
        preferences: {}
      };
    }

    const prices = savedProperties.map(sp => sp.property.price).filter(p => p > 0);
    const propertyTypes = {};
    const locations = {};
    const bedrooms = savedProperties.map(sp => sp.property.bedrooms).filter(b => b > 0);
    const bathrooms = savedProperties.map(sp => sp.property.bathrooms).filter(b => b > 0);

    // Count property types
    savedProperties.forEach(sp => {
      const type = sp.property.propertyType;
      propertyTypes[type] = (propertyTypes[type] || 0) + 1;
    });

    // Count locations
    savedProperties.forEach(sp => {
      const location = `${sp.property.city}, ${sp.property.state}`;
      locations[location] = (locations[location] || 0) + 1;
    });

    // Calculate statistics
    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const averageBedrooms = bedrooms.length > 0 ? bedrooms.reduce((a, b) => a + b, 0) / bedrooms.length : 0;
    const averageBathrooms = bathrooms.length > 0 ? bathrooms.reduce((a, b) => a + b, 0) / bathrooms.length : 0;

    return {
      totalProperties: savedProperties.length,
      averagePrice: Math.round(averagePrice),
      priceRange: {
        min: minPrice,
        max: maxPrice
      },
      propertyTypes,
      locations,
      preferences: {
        averageBedrooms: Math.round(averageBedrooms * 10) / 10,
        averageBathrooms: Math.round(averageBathrooms * 10) / 10,
        preferredPropertyType: Object.keys(propertyTypes).reduce((a, b) => 
          propertyTypes[a] > propertyTypes[b] ? a : b, 'unknown'
        ),
        preferredLocation: Object.keys(locations).reduce((a, b) => 
          locations[a] > locations[b] ? a : b, 'unknown'
        )
      }
    };
  }

  generateRecommendations(savedProperties, analysis) {
    const recommendations = [];

    if (savedProperties.length === 0) {
      recommendations.push({
        type: 'getting_started',
        message: 'Start saving properties you\'re interested in to track price changes and get personalized recommendations',
        impact: 'Build your property portfolio and get market insights'
      });
      return recommendations;
    }

    // Price analysis recommendations
    if (analysis.priceRange.max - analysis.priceRange.min > 100000) {
      recommendations.push({
        type: 'price_range',
        message: 'Your saved properties have a wide price range. Consider narrowing your focus',
        impact: 'More targeted search results and better financing preparation'
      });
    }

    // Location diversity recommendations
    const locationCount = Object.keys(analysis.locations).length;
    if (locationCount > 3) {
      recommendations.push({
        type: 'location_focus',
        message: 'You\'re looking at properties in multiple areas. Consider focusing on 1-2 preferred locations',
        impact: 'Better understanding of local market conditions and faster decision making'
      });
    }

    // Property type recommendations
    if (Object.keys(analysis.propertyTypes).length > 2) {
      recommendations.push({
        type: 'property_type',
        message: 'Consider focusing on one property type for more targeted results',
        impact: 'Clearer financing options and better comparison ability'
      });
    }

    // Market activity recommendations
    const recentlyViewed = savedProperties.filter(sp => 
      sp.lastViewed && new Date(sp.lastViewed) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentlyViewed.length > 0) {
      recommendations.push({
        type: 'market_activity',
        message: 'You\'ve been actively viewing properties. Consider scheduling viewings for your top choices',
        impact: 'Move closer to making a decision'
      });
    }

    // Financing preparation recommendations
    if (analysis.averagePrice > 0) {
      recommendations.push({
        type: 'financing',
        message: `Based on your average price range ($${analysis.averagePrice.toLocaleString()}), ensure your financing is pre-approved`,
        impact: 'Faster offers and better negotiating position'
      });
    }

    return recommendations;
  }
}

module.exports = GetUserSavedPropertiesTool;