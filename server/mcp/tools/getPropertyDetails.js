const logger = require('../../utils/logger');
const Property = require('../../models/Property');

class GetPropertyDetailsTool {
  constructor() {
    this.name = 'getPropertyDetails';
    this.description = 'Retrieves detailed information about a specific property';
    this.parameters = {
      propertyId: { type: 'string', required: true, description: 'Property ID' },
      userId: { type: 'string', required: false, description: 'User ID for personalized details' }
    };
  }

  async execute(params) {
    const { propertyId, userId } = params;
    
    try {
      // Find the property
      const property = await Property.findById(propertyId).lean();
      
      if (!property) {
        return {
          success: false,
          error: 'Property not found',
          propertyId
        };
      }

      // Get additional details
      const enhancedDetails = await this.enhancePropertyDetails(property);
      
      // Get neighborhood information
      const neighborhoodInfo = await this.getNeighborhoodInfo(property);
      
      // Get price history if available
      const priceHistory = await this.getPriceHistory(propertyId);
      
      // Get similar properties
      const similarProperties = await this.getSimilarProperties(property);
      
      // Calculate commute times to major areas
      const commuteInfo = await this.getCommuteInfo(property);
      
      // Get user-specific information
      const userInfo = userId ? await this.getUserSpecificInfo(propertyId, userId) : null;

      const result = {
        success: true,
        property: {
          id: property._id,
          address: property.address,
          price: property.price,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          sqft: property.sqft,
          propertyType: property.propertyType,
          description: property.description,
          features: property.features || [],
          images: property.images || [],
          
          // Location details
          neighborhood: property.neighborhood,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode,
          coordinates: property.coordinates,
          
          // Financial details
          pricePerSqft: property.sqft ? Math.round(property.price / property.sqft) : null,
          propertyTax: property.propertyTax,
          hoaFees: property.hoaFees,
          
          // Property details
          yearBuilt: property.yearBuilt,
          lotSize: property.lotSize,
          parkingSpaces: property.parkingSpaces,
          heating: property.heating,
          cooling: property.cooling,
          flooring: property.flooring,
          
          // Listing details
          listingDate: property.createdAt,
          listingAgent: property.listingAgent,
          mls: property.mls,
          status: property.status || 'active',
          
          // Enhanced details
          ...enhancedDetails,
          
          // Additional information
          neighborhoodInfo,
          priceHistory,
          similarProperties,
          commuteInfo,
          userInfo
        },
        recommendations: this.generateRecommendations(property, userInfo)
      };

      logger.info(`Property details retrieved for ID: ${propertyId}`);
      return result;

    } catch (error) {
      logger.error('Error retrieving property details:', error);
      return {
        success: false,
        error: 'Failed to retrieve property details',
        propertyId
      };
    }
  }

  async enhancePropertyDetails(property) {
    // Calculate additional metrics
    const pricePerSqft = property.sqft ? Math.round(property.price / property.sqft) : null;
    
    // Estimate monthly costs
    const estimatedPropertyTax = property.propertyTax || (property.price * 0.012) / 12; // 1.2% annually
    const estimatedInsurance = property.price * 0.003 / 12; // 0.3% annually
    const estimatedUtilities = this.estimateUtilities(property);
    
    return {
      pricePerSqft,
      estimatedMonthlyCosts: {
        propertyTax: Math.round(estimatedPropertyTax),
        insurance: Math.round(estimatedInsurance),
        utilities: estimatedUtilities,
        total: Math.round(estimatedPropertyTax + estimatedInsurance + estimatedUtilities)
      },
      investmentMetrics: this.calculateInvestmentMetrics(property)
    };
  }

  estimateUtilities(property) {
    // Basic utility estimation based on property size and type
    const baseUtilities = {
      'apartment': 150,
      'condo': 180,
      'house': 250,
      'townhouse': 200
    };
    
    const base = baseUtilities[property.propertyType.toLowerCase()] || 200;
    const sizeFactor = property.sqft ? Math.max(0.5, property.sqft / 2000) : 1;
    
    return Math.round(base * sizeFactor);
  }

  calculateInvestmentMetrics(property) {
    // Estimate rental income (rough calculation)
    const estimatedRent = property.price * 0.006; // 0.6% of property value monthly
    const grossRentalYield = (estimatedRent * 12) / property.price * 100;
    
    return {
      estimatedMonthlyRent: Math.round(estimatedRent),
      grossRentalYield: Math.round(grossRentalYield * 100) / 100,
      capRate: Math.round((grossRentalYield - 3) * 100) / 100 // Rough cap rate estimate
    };
  }

  async getNeighborhoodInfo(property) {
    try {
      // In a real implementation, this would call external APIs for neighborhood data
      return {
        walkScore: Math.floor(Math.random() * 40) + 60, // Mock data
        transitScore: Math.floor(Math.random() * 30) + 50,
        bikeScore: Math.floor(Math.random() * 35) + 45,
        crimeRate: 'Low', // Would be calculated from crime data
        schools: [
          { name: 'Elementary School', rating: 8, distance: 0.5 },
          { name: 'Middle School', rating: 7, distance: 1.2 },
          { name: 'High School', rating: 9, distance: 2.1 }
        ],
        amenities: [
          { type: 'grocery', name: 'Supermarket', distance: 0.8 },
          { type: 'hospital', name: 'General Hospital', distance: 3.2 },
          { type: 'park', name: 'City Park', distance: 1.5 }
        ]
      };
    } catch (error) {
      logger.error('Error getting neighborhood info:', error);
      return null;
    }
  }

  async getPriceHistory(propertyId) {
    try {
      // In a real implementation, this would query price history from database
      const mockHistory = [
        { date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), price: 345000, event: 'Listed' },
        { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), price: 340000, event: 'Price Reduced' },
        { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), price: 335000, event: 'Price Reduced' }
      ];
      
      return mockHistory;
    } catch (error) {
      logger.error('Error getting price history:', error);
      return [];
    }
  }

  async getSimilarProperties(property) {
    try {
      const similarProperties = await Property.find({
        _id: { $ne: property._id },
        propertyType: property.propertyType,
        city: property.city,
        bedrooms: { $gte: property.bedrooms - 1, $lte: property.bedrooms + 1 },
        price: { $gte: property.price * 0.8, $lte: property.price * 1.2 }
      })
      .limit(5)
      .select('address price bedrooms bathrooms sqft images')
      .lean();
      
      return similarProperties.map(p => ({
        id: p._id,
        address: p.address,
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        sqft: p.sqft,
        pricePerSqft: p.sqft ? Math.round(p.price / p.sqft) : null,
        image: p.images?.[0] || null
      }));
    } catch (error) {
      logger.error('Error getting similar properties:', error);
      return [];
    }
  }

  async getCommuteInfo(property) {
    try {
      // Mock commute data - in real implementation, use Google Maps API
      return {
        downtown: { driving: 25, transit: 45, walking: 120 },
        airport: { driving: 35, transit: 65, walking: 180 },
        majorEmployers: [
          { name: 'Tech Corp', driving: 20, transit: 35 },
          { name: 'Medical Center', driving: 15, transit: 25 }
        ]
      };
    } catch (error) {
      logger.error('Error getting commute info:', error);
      return null;
    }
  }

  async getUserSpecificInfo(propertyId, userId) {
    try {
      // Check if user has saved this property
      const UserProperty = require('../../models/UserProperty');
      const savedProperty = await UserProperty.findOne({ userId, propertyId }).lean();
      
      return {
        isSaved: !!savedProperty,
        savedDate: savedProperty?.createdAt || null,
        notes: savedProperty?.notes || null,
        viewCount: savedProperty?.viewCount || 0
      };
    } catch (error) {
      logger.error('Error getting user specific info:', error);
      return null;
    }
  }

  generateRecommendations(property, userInfo) {
    const recommendations = [];
    
    // Price recommendations
    if (property.pricePerSqft) {
      const avgPricePerSqft = 200; // Would be calculated from market data
      if (property.pricePerSqft < avgPricePerSqft * 0.9) {
        recommendations.push({
          type: 'price',
          message: 'This property is priced below market average',
          impact: 'Good value opportunity'
        });
      }
    }
    
    // Neighborhood recommendations
    recommendations.push({
      type: 'neighborhood',
      message: 'Research local market trends and future development plans',
      impact: 'Understanding area growth potential'
    });
    
    // Viewing recommendations
    if (!userInfo?.isSaved) {
      recommendations.push({
        type: 'action',
        message: 'Save this property to track price changes',
        impact: 'Get notified of updates and price changes'
      });
    }
    
    return recommendations;
  }
}

module.exports = GetPropertyDetailsTool;