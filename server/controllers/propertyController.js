const Property = require('../models/Property');
const logger = require('../utils/logger');

class PropertyController {
  async searchProperties(criteria) {
    try {
      const properties = await Property.find(criteria)
        .limit(20)
        .sort({ createdAt: -1 });
      
      return properties;
    } catch (error) {
      logger.error('Error searching properties:', error);
      throw error;
    }
  }

  async getPropertyById(id) {
    try {
      const property = await Property.findById(id);
      return property;
    } catch (error) {
      logger.error('Error getting property by ID:', error);
      throw error;
    }
  }

  async createProperty(propertyData) {
    try {
      const property = new Property(propertyData);
      await property.save();
      return property;
    } catch (error) {
      logger.error('Error creating property:', error);
      throw error;
    }
  }

  async updateProperty(id, updateData) {
    try {
      const property = await Property.findByIdAndUpdate(id, updateData, { new: true });
      return property;
    } catch (error) {
      logger.error('Error updating property:', error);
      throw error;
    }
  }
}

module.exports = PropertyController;