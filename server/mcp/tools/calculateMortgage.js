const logger = require('../../utils/logger');

class CalculateMortgageTool {
  constructor() {
    this.name = 'calculateMortgage';
    this.description = 'Calculates mortgage payments and provides detailed financing information';
    this.parameters = {
      price: { type: 'number', required: true, description: 'Property price' },
      downPayment: { type: 'number', required: false, description: 'Down payment amount or percentage' },
      interestRate: { type: 'number', required: false, description: 'Annual interest rate' },
      loanTerm: { type: 'number', required: false, description: 'Loan term in years' },
      propertyTax: { type: 'number', required: false, description: 'Annual property tax' },
      homeInsurance: { type: 'number', required: false, description: 'Annual home insurance' },
      pmi: { type: 'number', required: false, description: 'PMI amount if applicable' },
      userId: { type: 'string', required: false, description: 'User ID for personalized rates' }
    };
  }

  async execute(params) {
    const {
      price,
      downPayment = 0,
      interestRate = 6.5, // Default current rate
      loanTerm = 30,
      propertyTax = 0,
      homeInsurance = 0,
      pmi = 0,
      userId
    } = params;

    try {
      // Validate inputs
      if (!price || price <= 0) {
        throw new Error('Valid property price is required');
      }

      // Calculate down payment
      const downPaymentAmount = this.calculateDownPayment(price, downPayment);
      const loanAmount = price - downPaymentAmount;
      
      // Calculate monthly payment components
      const monthlyPayment = this.calculateMonthlyPayment(loanAmount, interestRate, loanTerm);
      const monthlyPropertyTax = propertyTax / 12;
      const monthlyInsurance = homeInsurance / 12;
      const monthlyPMI = this.calculatePMI(loanAmount, price, pmi);
      
      // Total monthly payment
      const totalMonthlyPayment = monthlyPayment + monthlyPropertyTax + monthlyInsurance + monthlyPMI;
      
      // Calculate additional details
      const totalInterest = (monthlyPayment * loanTerm * 12) - loanAmount;
      const totalCost = price + totalInterest + (propertyTax * loanTerm) + (homeInsurance * loanTerm);
      
      // Calculate affordability metrics
      const affordabilityAnalysis = this.calculateAffordability(totalMonthlyPayment, price);
      
      // Generate amortization schedule (first year)
      const amortizationSchedule = this.generateAmortizationSchedule(loanAmount, interestRate, loanTerm, 12);
      
      // Calculate different scenarios
      const scenarios = this.calculateScenarios(price, downPaymentAmount, loanTerm);

      const result = {
        success: true,
        calculation: {
          propertyPrice: price,
          downPayment: downPaymentAmount,
          downPaymentPercentage: (downPaymentAmount / price) * 100,
          loanAmount,
          interestRate,
          loanTermYears: loanTerm,
          
          monthlyPayments: {
            principal: monthlyPayment,
            propertyTax: monthlyPropertyTax,
            homeInsurance: monthlyInsurance,
            pmi: monthlyPMI,
            total: totalMonthlyPayment
          },
          
          totals: {
            totalInterest,
            totalCost,
            totalPayments: monthlyPayment * loanTerm * 12
          },
          
          affordabilityAnalysis,
          amortizationSchedule,
          scenarios
        },
        recommendations: this.generateRecommendations(params, totalMonthlyPayment, downPaymentAmount, price)
      };

      logger.info(`Mortgage calculation completed for price: $${price}`);
      return result;

    } catch (error) {
      logger.error('Error calculating mortgage:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate mortgage',
        calculation: null
      };
    }
  }

  calculateDownPayment(price, downPayment) {
    if (downPayment <= 0) {
      return price * 0.20; // Default 20%
    }
    
    if (downPayment < 1) {
      // Treat as percentage
      return price * downPayment;
    } else if (downPayment < 100) {
      // Treat as percentage (e.g., 20 = 20%)
      return price * (downPayment / 100);
    } else {
      // Treat as dollar amount
      return Math.min(downPayment, price * 0.99); // Max 99% down payment
    }
  }

  calculateMonthlyPayment(loanAmount, annualRate, years) {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    
    if (monthlyRate === 0) {
      return loanAmount / numPayments;
    }
    
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return Math.round(monthlyPayment * 100) / 100;
  }

  calculatePMI(loanAmount, propertyPrice, pmiInput) {
    if (pmiInput > 0) {
      return pmiInput;
    }
    
    const loanToValue = loanAmount / propertyPrice;
    
    if (loanToValue > 0.8) {
      // Calculate PMI as percentage of loan amount (typically 0.3% to 1.5% annually)
      const pmiRate = 0.005; // 0.5% annually
      return (loanAmount * pmiRate) / 12;
    }
    
    return 0;
  }

  calculateAffordability(monthlyPayment, propertyPrice) {
    // Common affordability rules
    const recommended28PercentRule = monthlyPayment / 0.28; // 28% of gross income
    const recommended36PercentRule = monthlyPayment / 0.36; // 36% of gross income (more conservative)
    
    return {
      monthlyIncomeNeeded28Percent: Math.round(recommended28PercentRule),
      monthlyIncomeNeeded36Percent: Math.round(recommended36PercentRule),
      annualIncomeNeeded28Percent: Math.round(recommended28PercentRule * 12),
      annualIncomeNeeded36Percent: Math.round(recommended36PercentRule * 12),
      debtToIncomeRatio: {
        at28Percent: '28%',
        at36Percent: '36%'
      }
    };
  }

  generateAmortizationSchedule(loanAmount, annualRate, years, months = 12) {
    const schedule = [];
    const monthlyRate = annualRate / 100 / 12;
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, annualRate, years);
    
    let remainingBalance = loanAmount;
    
    for (let month = 1; month <= months; month++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      
      schedule.push({
        month,
        payment: Math.round(monthlyPayment * 100) / 100,
        principal: Math.round(principalPayment * 100) / 100,
        interest: Math.round(interestPayment * 100) / 100,
        balance: Math.round(remainingBalance * 100) / 100
      });
    }
    
    return schedule;
  }

  calculateScenarios(price, currentDownPayment, loanTerm) {
    const scenarios = [];
    
    // Different down payment scenarios
    const downPaymentOptions = [0.05, 0.10, 0.15, 0.20, 0.25];
    
    downPaymentOptions.forEach(dpPercent => {
      const downPayment = price * dpPercent;
      const loanAmount = price - downPayment;
      const monthlyPayment = this.calculateMonthlyPayment(loanAmount, 6.5, loanTerm);
      const monthlyPMI = this.calculatePMI(loanAmount, price, 0);
      
      scenarios.push({
        downPaymentPercent: dpPercent * 100,
        downPayment,
        loanAmount,
        monthlyPayment: monthlyPayment + monthlyPMI,
        pmi: monthlyPMI,
        totalInterest: (monthlyPayment * loanTerm * 12) - loanAmount
      });
    });
    
    return scenarios;
  }

  generateRecommendations(params, monthlyPayment, downPayment, price) {
    const recommendations = [];
    
    // Down payment recommendations
    if (downPayment < price * 0.20) {
      recommendations.push({
        type: 'down_payment',
        message: 'Consider saving for a 20% down payment to avoid PMI',
        impact: 'Could save you money on monthly payments'
      });
    }
    
    // Interest rate recommendations
    if (params.interestRate > 7.0) {
      recommendations.push({
        type: 'interest_rate',
        message: 'Shop around for better interest rates',
        impact: 'Even 0.5% lower rate could save thousands'
      });
    }
    
    // Loan term recommendations
    if (params.loanTerm === 30) {
      recommendations.push({
        type: 'loan_term',
        message: 'Consider a 15-year loan for significant interest savings',
        impact: 'Higher monthly payment but much less total interest'
      });
    }
    
    // Affordability recommendations
    if (monthlyPayment > 2000) {
      recommendations.push({
        type: 'affordability',
        message: 'Ensure your monthly income supports this payment',
        impact: 'Follow the 28% rule for housing expenses'
      });
    }
    
    return recommendations;
  }
}

module.exports = CalculateMortgageTool;