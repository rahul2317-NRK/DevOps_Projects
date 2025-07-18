const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Basic property information
  address: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  bedrooms: {
    type: Number,
    required: true,
    min: 0
  },
  bathrooms: {
    type: Number,
    required: true,
    min: 0
  },
  sqft: {
    type: Number,
    min: 0
  },
  propertyType: {
    type: String,
    required: true,
    enum: ['house', 'apartment', 'condo', 'townhouse', 'commercial', 'land', 'other'],
    lowercase: true
  },
  
  // Location details
  neighborhood: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  
  // Property details
  description: {
    type: String,
    trim: true
  },
  features: [{
    type: String,
    trim: true
  }],
  yearBuilt: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear() + 2
  },
  lotSize: {
    type: Number,
    min: 0
  },
  parkingSpaces: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Systems and amenities
  heating: {
    type: String,
    trim: true
  },
  cooling: {
    type: String,
    trim: true
  },
  flooring: [{
    type: String,
    trim: true
  }],
  
  // Financial information
  propertyTax: {
    type: Number,
    min: 0
  },
  hoaFees: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Listing information
  status: {
    type: String,
    enum: ['active', 'pending', 'sold', 'off-market', 'coming-soon'],
    default: 'active'
  },
  listingAgent: {
    name: String,
    email: String,
    phone: String,
    company: String
  },
  mls: {
    type: String,
    trim: true
  },
  
  // Media
  images: [{
    url: String,
    caption: String,
    order: Number
  }],
  virtualTour: {
    type: String,
    trim: true
  },
  
  // Metadata
  source: {
    type: String,
    default: 'local'
  },
  externalId: {
    type: String,
    trim: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for price per square foot
propertySchema.virtual('pricePerSqft').get(function() {
  if (this.sqft && this.sqft > 0) {
    return Math.round(this.price / this.sqft);
  }
  return null;
});

// Virtual for full address
propertySchema.virtual('fullAddress').get(function() {
  return `${this.address}, ${this.city}, ${this.state} ${this.zipCode}`;
});

// Indexes for better query performance
propertySchema.index({ city: 1, state: 1 });
propertySchema.index({ propertyType: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ bedrooms: 1, bathrooms: 1 });
propertySchema.index({ zipCode: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

// Text index for search
propertySchema.index({
  address: 'text',
  description: 'text',
  neighborhood: 'text',
  city: 'text',
  features: 'text'
});

// Middleware to update lastUpdated on save
propertySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Static method to find properties by location
propertySchema.statics.findByLocation = function(city, state, radius = 10) {
  return this.find({
    city: new RegExp(city, 'i'),
    state: new RegExp(state, 'i'),
    status: 'active'
  });
};

// Static method to find properties by price range
propertySchema.statics.findByPriceRange = function(minPrice, maxPrice) {
  const query = { status: 'active' };
  if (minPrice) query.price = { $gte: minPrice };
  if (maxPrice) query.price = { ...query.price, $lte: maxPrice };
  return this.find(query);
};

// Instance method to calculate estimated monthly costs
propertySchema.methods.getEstimatedMonthlyCosts = function() {
  const propertyTax = this.propertyTax || (this.price * 0.012) / 12;
  const insurance = this.price * 0.003 / 12;
  const maintenance = this.price * 0.01 / 12;
  
  return {
    propertyTax: Math.round(propertyTax),
    insurance: Math.round(insurance),
    maintenance: Math.round(maintenance),
    hoa: this.hoaFees || 0,
    total: Math.round(propertyTax + insurance + maintenance + (this.hoaFees || 0))
  };
};

module.exports = mongoose.model('Property', propertySchema);