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

// Update pet IDs to ensure they follow the format
const updatePetIds = async () => {
  try {
    console.log('Starting pet ID update...');
    
    // Get all pets
    const pets = await ShopPet.find({});
    console.log(`Found ${pets.length} pets to check`);
    
    let updatedCount = 0;
    
    // Process each pet
    for (const pet of pets) {
      let needsUpdate = false;
      let newPetId = pet.petId;
      
      // Check if dog IDs start with # and are formatted correctly
      if (pet.type === 'dog') {
        if (!pet.petId.startsWith('D')) {
          // Create proper dog ID format: #001, #002, etc.
          const numPart = pet.petId.replace(/\D/g, '');
          const paddedNum = numPart.padStart(3, '0');
          newPetId = `#${paddedNum}`;
          needsUpdate = true;
        }
      }
      
      // Check if cat IDs start with C and are formatted correctly 
      if (pet.type === 'cat') {
        if (!pet.petId.startsWith('C')) {
          // Create proper cat ID format: C001, C002, etc.
          const numPart = pet.petId.replace(/\D/g, '');
          const paddedNum = numPart.padStart(3, '0');
          newPetId = `C${paddedNum}`;
          needsUpdate = true;
        }
      }
      
      // Update the pet if needed
      if (needsUpdate) {
        console.log(`Updating pet ID from ${pet.petId} to ${newPetId} for ${pet.name} (${pet.type})`);
        pet.petId = newPetId;
        await pet.save();
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} pet IDs successfully`);
    return true;
  } catch (error) {
    console.error('Error updating pet IDs:', error);
    return false;
  }
};

// Run the update
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await updatePetIds();
      console.log('Pet ID update completed successfully');
    }
  } catch (error) {
    console.error('Error running update:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

run(); 