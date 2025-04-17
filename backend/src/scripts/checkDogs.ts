import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ShopPet } from '../models/ShopPet';

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

// Check all dogs
const checkDogs = async () => {
  try {
    // Find all dogs
    const allDogs = await ShopPet.find({ type: 'dog' });
    
    console.log(`\nFound ${allDogs.length} dogs in the database:\n`);
    
    // Log all dog details
    for (const dog of allDogs) {
      console.log(`ID: ${dog.petId || 'No ID'}`);
      console.log(`Name: ${dog.name}`);
      console.log(`Breed: ${dog.breed}`);
      console.log(`For Sale: ${dog.isForSale ? 'Yes' : 'No'}`);
      console.log('--------------------------');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking dogs:', error);
    return false;
  }
};

// Run the check
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await checkDogs();
    }
  } catch (error) {
    console.error('Error running dog check:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

run(); 