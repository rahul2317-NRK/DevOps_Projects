// MongoDB initialization script for Blue Pixel AI Chatbot
print('Starting MongoDB initialization...');

// Switch to the application database
db = db.getSiblingDB('blue-pixel-chatbot');

// Create application user
db.createUser({
  user: 'app-user',
  pwd: 'blue-pixel-app-2024',
  roles: [
    {
      role: 'readWrite',
      db: 'blue-pixel-chatbot'
    }
  ]
});

print('Created application user');

// Create collections with indexes
db.createCollection('properties');
db.createCollection('chatsessions');
db.createCollection('userproperties');
db.createCollection('users');

print('Created collections');

// Create indexes for better performance
db.properties.createIndex({ city: 1, state: 1 });
db.properties.createIndex({ propertyType: 1 });
db.properties.createIndex({ price: 1 });
db.properties.createIndex({ bedrooms: 1, bathrooms: 1 });
db.properties.createIndex({ status: 1 });
db.properties.createIndex({ 
  address: 'text', 
  description: 'text', 
  neighborhood: 'text', 
  city: 'text' 
});

db.chatsessions.createIndex({ userId: 1, sessionId: 1 });
db.chatsessions.createIndex({ userId: 1, createdAt: -1 });
db.chatsessions.createIndex({ intent: 1 });

db.userproperties.createIndex({ userId: 1, propertyId: 1 }, { unique: true });
db.userproperties.createIndex({ userId: 1, createdAt: -1 });

print('Created indexes');

// Insert sample properties
db.properties.insertMany([
  {
    address: '123 Oak Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    price: 850000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    propertyType: 'house',
    description: 'Beautiful Victorian home in the heart of San Francisco with modern updates and original charm.',
    neighborhood: 'Castro',
    features: ['hardwood floors', 'updated kitchen', 'garden', 'parking'],
    yearBuilt: 1925,
    status: 'active',
    images: ['https://example.com/house1.jpg'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    address: '456 Pine Avenue',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    price: 450000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    propertyType: 'condo',
    description: 'Modern downtown condo with city views and luxury amenities.',
    neighborhood: 'Downtown',
    features: ['city views', 'gym', 'pool', 'concierge'],
    yearBuilt: 2020,
    status: 'active',
    images: ['https://example.com/condo1.jpg'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    address: '789 Maple Drive',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    price: 650000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2200,
    propertyType: 'house',
    description: 'Spacious family home with mountain views and large backyard.',
    neighborhood: 'Capitol Hill',
    features: ['mountain views', 'large yard', 'garage', 'fireplace'],
    yearBuilt: 1995,
    status: 'active',
    images: ['https://example.com/house2.jpg'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    address: '321 Beach Boulevard',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    price: 750000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1400,
    propertyType: 'apartment',
    description: 'Luxury beachfront apartment with ocean views and resort-style amenities.',
    neighborhood: 'South Beach',
    features: ['ocean views', 'beach access', 'pool', 'spa'],
    yearBuilt: 2018,
    status: 'active',
    images: ['https://example.com/apartment1.jpg'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    address: '555 Highland Road',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    price: 520000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1600,
    propertyType: 'townhouse',
    description: 'Modern townhouse with mountain access and energy-efficient features.',
    neighborhood: 'Highland',
    features: ['mountain access', 'solar panels', 'garage', 'patio'],
    yearBuilt: 2019,
    status: 'active',
    images: ['https://example.com/townhouse1.jpg'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('Inserted sample properties');

// Create a sample user
db.users.insertOne({
  userId: 'demo-user-123',
  email: 'demo@bluepixel.ai',
  name: 'Demo User',
  preferences: {
    maxPrice: 600000,
    preferredLocations: ['San Francisco', 'Austin'],
    propertyTypes: ['house', 'condo'],
    minBedrooms: 2
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Created sample user');

print('MongoDB initialization completed successfully!');
print('Sample data inserted:');
print('- 5 properties in different cities');
print('- 1 demo user');
print('- All necessary indexes created');