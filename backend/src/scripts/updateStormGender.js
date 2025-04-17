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

// Update Storm's gender
const updateStormGender = async () => {
  try {
    console.log('Starting to update pet #003 (Storm) gender...');
    
    // Find pet with ID #003
    const pet003 = await ShopPet.findOne({ petId: '#003' });
    
    if (!pet003) {
      console.log('Pet with ID #003 not found!');
      return false;
    }
    
    console.log(`Found pet #003: ${pet003.name}, current gender: ${pet003.gender}`);
    
    // Update gender to Male
    await ShopPet.updateOne(
      { petId: '#003' },
      { $set: { gender: 'Male' } }
    );
    
    // Verify the update
    const updatedPet = await ShopPet.findOne({ petId: '#003' });
    console.log(`Updated ${updatedPet.name}'s gender to: ${updatedPet.gender}`);
    
    return true;
  } catch (error) {
    console.error('Error updating pet gender:', error);
    return false;
  }
};

// Run the update
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await updateStormGender();
      console.log('Gender update operation completed successfully');
    }
  } catch (error) {
    console.error('Error running gender update operation:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

run(); 