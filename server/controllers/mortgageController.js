const logger = require('../utils/logger');

class MortgageController {
  calculateMortgage(principal, rate, years) {
    try {
      const monthlyRate = rate / 100 / 12;
      const numPayments = years * 12;
      
      if (monthlyRate === 0) {
        return principal / numPayments;
      }
      
      const monthlyPayment = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      
      return Math.round(monthlyPayment * 100) / 100;
    } catch (error) {
      logger.error('Error calculating mortgage:', error);
      throw error;
    }
  }

  calculateAffordability(monthlyPayment, income) {
    try {
      const debtToIncomeRatio = (monthlyPayment * 12) / income;
      const recommendation = debtToIncomeRatio <= 0.28 ? 'Affordable' : 
                           debtToIncomeRatio <= 0.36 ? 'Manageable' : 'Stretching';
      
      return {
        debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
        recommendation,
        monthlyPayment,
        annualIncome: income
      };
    } catch (error) {
      logger.error('Error calculating affordability:', error);
      throw error;
    }
  }
}

module.exports = MortgageController;