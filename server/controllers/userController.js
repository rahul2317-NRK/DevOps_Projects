const UserProperty = require('../models/UserProperty');
const logger = require('../utils/logger');

class UserController {
  async saveProperty(userId, propertyId, options = {}) {
    try {
      const userProperty = new UserProperty({
        userId,
        propertyId,
        ...options
      });
      
      await userProperty.save();
      return userProperty;
    } catch (error) {
      if (error.code === 11000) {
        // Property already saved, update it
        const existingProperty = await UserProperty.findOne({ userId, propertyId });
        if (existingProperty) {
          await existingProperty.incrementViewCount();
          return existingProperty;
        }
      }
      logger.error('Error saving property:', error);
      throw error;
    }
  }

  async getUserSavedProperties(userId, options = {}) {
    try {
      const savedProperties = await UserProperty.getUserSavedProperties(userId, options);
      return savedProperties;
    } catch (error) {
      logger.error('Error getting user saved properties:', error);
      throw error;
    }
  }

  async removeProperty(userId, propertyId) {
    try {
      const result = await UserProperty.deleteOne({ userId, propertyId });
      return result;
    } catch (error) {
      logger.error('Error removing property:', error);
      throw error;
    }
  }

  async getUserAnalytics(userId) {
    try {
      const analytics = await UserProperty.getUserPropertyAnalytics(userId);
      return analytics[0] || {};
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw error;
    }
  }
}

module.exports = UserController;