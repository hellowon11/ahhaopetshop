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

// Verify pet IDs
const verifyPetIds = async () => {
  try {
    console.log('Verifying all pet IDs...');
    
    // Get all pets
    const allPets = await ShopPet.find({}).sort({ type: 1, petId: 1 });
    
    console.log(`\nTotal pets: ${allPets.length}\n`);
    
    console.log('DOGS:');
    console.log('-----');
    const dogs = allPets.filter(pet => pet.type === 'dog');
    for (const dog of dogs) {
      console.log(`ID: ${dog.petId.padEnd(6)} | Name: ${dog.name.padEnd(12)} | Breed: ${dog.breed.padEnd(20)} | For Sale: ${dog.isForSale ? 'Yes' : 'No'}`);
    }
    
    console.log('\nCATS:');
    console.log('-----');
    const cats = allPets.filter(pet => pet.type === 'cat');
    for (const cat of cats) {
      console.log(`ID: ${cat.petId.padEnd(6)} | Name: ${cat.name.padEnd(12)} | Breed: ${cat.breed.padEnd(20)} | For Sale: ${cat.isForSale ? 'Yes' : 'No'}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying pet IDs:', error);
    return false;
  }
};

// Run the verification
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await verifyPetIds();
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