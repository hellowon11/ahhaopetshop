const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Need to load the ShopPet model directly since it's a TS file
require('ts-node/register');
const { ShopPet } = require('../models/ShopPet');

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-shop';
    console.log('Connecting to MongoDB:', mongoURI);
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    return false;
  }
};

// Verify pets
const verifyPets = async () => {
  try {
    console.log('Verifying all pets...');
    
    // Get dogs and cats separately to ensure proper filtering
    const dogs = await ShopPet.find({ type: 'dog' }).sort({ petId: 1 });
    const cats = await ShopPet.find({ type: 'cat' }).sort({ petId: 1 });
    
    console.log(`\nTotal pets: ${dogs.length + cats.length}\n`);
    
    console.log('DOGS:');
    console.log('-----');
    for (const dog of dogs) {
      const petId = dog.petId.padEnd(6);
      const name = dog.name.padEnd(12);
      const breed = dog.breed.padEnd(20);
      const gender = dog.gender.padEnd(8);
      console.log(`ID: ${petId} | Name: ${name} | Breed: ${breed} | Gender: ${gender} | For Sale: ${dog.isForSale ? 'Yes' : 'No'}`);
    }
    
    console.log('\nCATS:');
    console.log('-----');
    for (const cat of cats) {
      const petId = cat.petId.padEnd(6);
      const name = cat.name.padEnd(12);
      const breed = cat.breed.padEnd(20);
      const gender = cat.gender.padEnd(8);
      console.log(`ID: ${petId} | Name: ${name} | Breed: ${breed} | Gender: ${gender} | For Sale: ${cat.isForSale ? 'Yes' : 'No'}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying pets:', error);
    return false;
  }
};

// Run the verification
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await verifyPets();
    }
  } catch (error) {
    console.error('Error running verification:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

run(); 