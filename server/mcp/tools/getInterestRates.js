const logger = require('../../utils/logger');
const axios = require('axios');

class GetInterestRatesTool {
  constructor() {
    this.name = 'getInterestRates';
    this.description = 'Retrieves current mortgage interest rates from various lenders';
    this.parameters = {
      location: { type: 'string', required: false, description: 'Location for localized rates' },
      loanType: { type: 'string', required: false, description: 'Type of loan (conventional, FHA, VA, etc.)' },
      creditScore: { type: 'number', required: false, description: 'Credit score for personalized rates' },
      downPayment: { type: 'number', required: false, description: 'Down payment percentage' }
    };
  }

  async execute(params) {
    const { location, loanType, creditScore, downPayment } = params;
    
    try {
      // Get rates from multiple sources
      const rateData = await this.fetchInterestRates(params);
      
      // Calculate personalized rates based on credit score and down payment
      const personalizedRates = this.calculatePersonalizedRates(rateData, creditScore, downPayment);
      
      // Get rate trends
      const rateTrends = await this.getRateTrends();
      
      // Get lender comparison
      const lenderComparison = await this.getLenderComparison(location);
      
      const result = {
        success: true,
        rates: {
          current: personalizedRates,
          trends: rateTrends,
          lenderComparison,
          lastUpdated: new Date().toISOString(),
          location: location || 'National Average'
        },
        recommendations: this.generateRateRecommendations(personalizedRates, rateTrends, params)
      };

      logger.info(`Interest rates retrieved for location: ${location || 'National'}`);
      return result;

    } catch (error) {
      logger.error('Error retrieving interest rates:', error);
      return {
        success: false,
        error: 'Failed to retrieve interest rates',
        rates: this.getFallbackRates()
      };
    }
  }

  async fetchInterestRates(params) {
    try {
      // In a real implementation, this would fetch from multiple APIs
      // For now, we'll use mock data with realistic rates
      
      const baseRates = {
        conventional30: 7.25,
        conventional15: 6.75,
        fha30: 7.15,
        va30: 7.05,
        jumbo30: 7.35,
        arm51: 6.85
      };

      // Adjust rates based on location (mock adjustment)
      if (params.location) {
        const locationFactor = this.getLocationFactor(params.location);
        Object.keys(baseRates).forEach(key => {
          baseRates[key] += locationFactor;
        });
      }

      return baseRates;
    } catch (error) {
      logger.error('Error fetching rates from external sources:', error);
      return this.getFallbackRates();
    }
  }

  getLocationFactor(location) {
    // Mock location-based rate adjustments
    const locationFactors = {
      'california': 0.15,
      'new york': 0.10,
      'texas': -0.05,
      'florida': 0.05,
      'illinois': 0.08
    };
    
    const lowerLocation = location.toLowerCase();
    for (const [state, factor] of Object.entries(locationFactors)) {
      if (lowerLocation.includes(state)) {
        return factor;
      }
    }
    
    return 0; // No adjustment for unknown locations
  }

  calculatePersonalizedRates(baseRates, creditScore, downPayment) {
    const personalizedRates = { ...baseRates };
    
    // Adjust rates based on credit score
    if (creditScore) {
      let creditAdjustment = 0;
      
      if (creditScore >= 780) {
        creditAdjustment = -0.25; // Excellent credit
      } else if (creditScore >= 740) {
        creditAdjustment = -0.15; // Very good credit
      } else if (creditScore >= 700) {
        creditAdjustment = 0; // Good credit
      } else if (creditScore >= 660) {
        creditAdjustment = 0.25; // Fair credit
      } else if (creditScore >= 620) {
        creditAdjustment = 0.50; // Poor credit
      } else {
        creditAdjustment = 1.0; // Very poor credit
      }
      
      Object.keys(personalizedRates).forEach(key => {
        personalizedRates[key] += creditAdjustment;
      });
    }
    
    // Adjust rates based on down payment
    if (downPayment) {
      let downPaymentAdjustment = 0;
      
      if (downPayment >= 20) {
        downPaymentAdjustment = -0.125; // 20% or more
      } else if (downPayment >= 15) {
        downPaymentAdjustment = -0.05; // 15-19%
      } else if (downPayment >= 10) {
        downPaymentAdjustment = 0; // 10-14%
      } else if (downPayment >= 5) {
        downPaymentAdjustment = 0.125; // 5-9%
      } else {
        downPaymentAdjustment = 0.25; // Less than 5%
      }
      
      Object.keys(personalizedRates).forEach(key => {
        personalizedRates[key] += downPaymentAdjustment;
      });
    }
    
    // Round rates to 3 decimal places
    Object.keys(personalizedRates).forEach(key => {
      personalizedRates[key] = Math.round(personalizedRates[key] * 1000) / 1000;
    });
    
    return {
      '30-year-fixed': personalizedRates.conventional30,
      '15-year-fixed': personalizedRates.conventional15,
      'fha-30-year': personalizedRates.fha30,
      'va-30-year': personalizedRates.va30,
      'jumbo-30-year': personalizedRates.jumbo30,
      '5-1-arm': personalizedRates.arm51
    };
  }

  async getRateTrends() {
    try {
      // Mock rate trend data
      const trends = {
        daily: {
          change: -0.05,
          direction: 'down'
        },
        weekly: {
          change: 0.15,
          direction: 'up'
        },
        monthly: {
          change: 0.25,
          direction: 'up'
        },
        yearly: {
          change: 1.2,
          direction: 'up'
        },
        forecast: {
          nextMonth: 'stable',
          nextQuarter: 'slight increase',
          nextYear: 'gradual increase'
        }
      };
      
      return trends;
    } catch (error) {
      logger.error('Error getting rate trends:', error);
      return null;
    }
  }

  async getLenderComparison(location) {
    try {
      // Mock lender comparison data
      const lenders = [
        {
          name: 'Bank of America',
          rate: 7.25,
          apr: 7.35,
          points: 0.5,
          fees: 1200,
          rating: 4.2
        },
        {
          name: 'Wells Fargo',
          rate: 7.20,
          apr: 7.32,
          points: 0.75,
          fees: 1100,
          rating: 4.1
        },
        {
          name: 'Chase',
          rate: 7.28,
          apr: 7.38,
          points: 0.25,
          fees: 1300,
          rating: 4.3
        },
        {
          name: 'Quicken Loans',
          rate: 7.15,
          apr: 7.28,
          points: 1.0,
          fees: 1000,
          rating: 4.5
        },
        {
          name: 'Local Credit Union',
          rate: 7.10,
          apr: 7.22,
          points: 0.5,
          fees: 800,
          rating: 4.7
        }
      ];
      
      return lenders;
    } catch (error) {
      logger.error('Error getting lender comparison:', error);
      return [];
    }
  }

  generateRateRecommendations(rates, trends, params) {
    const recommendations = [];
    
    // Rate timing recommendations
    if (trends && trends.daily.direction === 'down') {
      recommendations.push({
        type: 'timing',
        message: 'Rates decreased today - consider locking in soon',
        impact: 'Potential savings on monthly payments'
      });
    } else if (trends && trends.forecast.nextMonth === 'increase') {
      recommendations.push({
        type: 'timing',
        message: 'Rates expected to rise next month',
        impact: 'Lock in current rates to avoid higher payments'
      });
    }
    
    // Credit score recommendations
    if (params.creditScore && params.creditScore < 740) {
      recommendations.push({
        type: 'credit',
        message: 'Improving your credit score could lower your rate',
        impact: 'Each 20-point increase could save 0.1-0.2% on your rate'
      });
    }
    
    // Down payment recommendations
    if (params.downPayment && params.downPayment < 20) {
      recommendations.push({
        type: 'down_payment',
        message: 'Consider increasing down payment to 20% for better rates',
        impact: 'Avoid PMI and potentially get 0.125% lower rate'
      });
    }
    
    // Loan type recommendations
    const lowestRate = Math.min(...Object.values(rates));
    const lowestRateType = Object.keys(rates).find(key => rates[key] === lowestRate);
    
    recommendations.push({
      type: 'loan_type',
      message: `${lowestRateType} currently offers the lowest rate at ${lowestRate}%`,
      impact: 'Consider if this loan type meets your needs'
    });
    
    return recommendations;
  }

  getFallbackRates() {
    return {
      current: {
        '30-year-fixed': 7.25,
        '15-year-fixed': 6.75,
        'fha-30-year': 7.15,
        'va-30-year': 7.05,
        'jumbo-30-year': 7.35,
        '5-1-arm': 6.85
      },
      trends: null,
      lenderComparison: [],
      lastUpdated: new Date().toISOString(),
      location: 'National Average'
    };
  }
}

module.exports = GetInterestRatesTool;