const mongoose = require('mongoose');

const userPropertySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    trim: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  alerts: {
    priceChange: {
      type: Boolean,
      default: true
    },
    statusChange: {
      type: Boolean,
      default: true
    },
    newPhotos: {
      type: Boolean,
      default: false
    }
  },
  viewCount: {
    type: Number,
    default: 1,
    min: 0
  },
  lastViewed: {
    type: Date,
    default: Date.now
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  pros: [{
    type: String,
    trim: true
  }],
  cons: [{
    type: String,
    trim: true
  }],
  personalizedData: {
    commuteTime: {
      work: Number,
      other: [{
        location: String,
        time: Number
      }]
    },
    financialNotes: {
      maxBudget: Number,
      downPayment: Number,
      monthlyPayment: Number
    }
  }
}, {
  timestamps: true
});

// Compound index to ensure unique user-property combinations
userPropertySchema.index({ userId: 1, propertyId: 1 }, { unique: true });

// Indexes for better query performance
userPropertySchema.index({ userId: 1, createdAt: -1 });
userPropertySchema.index({ userId: 1, lastViewed: -1 });
userPropertySchema.index({ userId: 1, rating: -1 });

// Middleware to update lastViewed on save
userPropertySchema.pre('save', function(next) {
  if (this.isNew) {
    this.lastViewed = new Date();
  }
  next();
});

// Static method to get user's saved properties with property details
userPropertySchema.statics.getUserSavedProperties = function(userId, options = {}) {
  const { limit = 20, sortBy = 'createdAt', sortOrder = -1 } = options;
  
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;
  
  return this.find({ userId })
    .populate('propertyId')
    .sort(sortOptions)
    .limit(limit);
};

// Static method to get user's property analytics
userPropertySchema.statics.getUserPropertyAnalytics = function(userId) {
  return this.aggregate([
    { $match: { userId } },
    {
      $lookup: {
        from: 'properties',
        localField: 'propertyId',
        foreignField: '_id',
        as: 'property'
      }
    },
    { $unwind: '$property' },
    {
      $group: {
        _id: userId,
        totalSaved: { $sum: 1 },
        averagePrice: { $avg: '$property.price' },
        priceRange: {
          $push: '$property.price'
        },
        propertyTypes: {
          $addToSet: '$property.propertyType'
        },
        locations: {
          $addToSet: {
            city: '$property.city',
            state: '$property.state'
          }
        },
        averageRating: { $avg: '$rating' },
        totalViews: { $sum: '$viewCount' }
      }
    },
    {
      $project: {
        totalSaved: 1,
        averagePrice: { $round: ['$averagePrice', 0] },
        minPrice: { $min: '$priceRange' },
        maxPrice: { $max: '$priceRange' },
        propertyTypes: 1,
        locations: 1,
        averageRating: { $round: ['$averageRating', 1] },
        totalViews: 1
      }
    }
  ]);
};

// Instance method to increment view count
userPropertySchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  this.lastViewed = new Date();
  return this.save();
};

// Instance method to update alerts
userPropertySchema.methods.updateAlerts = function(alertSettings) {
  this.alerts = { ...this.alerts, ...alertSettings };
  return this.save();
};

module.exports = mongoose.model('UserProperty', userPropertySchema);