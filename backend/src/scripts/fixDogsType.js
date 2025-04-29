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

// Check and fix dog types
const fixDogTypes = async () => {
  try {
    console.log('Checking dog pet types...');
    
    // First, check all pets with dog IDs
    const dogIdPattern = { petId: /^#\d+/ };
    const petsWithDogIds = await ShopPet.find(dogIdPattern);
    
    console.log(`Found ${petsWithDogIds.length} pets with dog IDs (#XXX format):`);
    for (const pet of petsWithDogIds) {
      console.log(`ID: ${pet.petId}, Name: ${pet.name}, Type: ${pet.type}, Breed: ${pet.breed}, Gender: ${pet.gender}`);
      
      // If the pet has a dog ID but wrong type, fix it
      if (pet.type !== 'dog') {
        console.log(`  - Fixing ${pet.name}'s type from '${pet.type}' to 'dog'`);
        await ShopPet.updateOne(
          { _id: pet._id },
          { $set: { type: 'dog' } }
        );
      }
    }
    
    // Fix specific dog pets
    const dogPets = [
      { petId: '#001', name: 'Milo', breed: 'Pomeranian', gender: 'Male', isForSale: false },
      { petId: '#002', name: 'Lucky', breed: 'Golden Retriever', gender: 'Male', isForSale: true },
      { petId: '#003', name: 'Storm', breed: 'Husky', gender: 'Male', isForSale: true },
      { petId: '#004', name: 'Coco', breed: 'Shih Tzu', gender: 'Female', isForSale: true },
      { petId: '#005', name: 'Cookie', breed: 'Corgi', gender: 'Female', isForSale: true },
      { petId: '#006', name: 'Bella', breed: 'Pomeranian', gender: 'Female', isForSale: true },
      { petId: '#007', name: 'Max', breed: 'Chihuahua', gender: 'Male', isForSale: true },
      { petId: '#008', name: 'Charlie', breed: 'Pomeranian', gender: 'Male', isForSale: true }
    ];
    
    console.log('\nUpdating dog info for all dogs...');
    for (const dogInfo of dogPets) {
      const existingDog = await ShopPet.findOne({ petId: dogInfo.petId });
      
      if (existingDog) {
        console.log(`Updating ${dogInfo.name} (${dogInfo.petId})...`);
        await ShopPet.updateOne(
          { petId: dogInfo.petId },
          { 
            $set: { 
              name: dogInfo.name,
              breed: dogInfo.breed,
              gender: dogInfo.gender,
              type: 'dog',
              isForSale: dogInfo.isForSale
            } 
          }
        );
      } else {
        console.log(`${dogInfo.name} (${dogInfo.petId}) not found!`);
      }
    }
    
    // Verify fixed dogs
    const fixedDogs = await ShopPet.find({ type: 'dog' }).sort({ petId: 1 });
    console.log('\nVerified dogs after fixing:');
    for (const dog of fixedDogs) {
      console.log(`ID: ${dog.petId}, Name: ${dog.name}, Type: ${dog.type}, Breed: ${dog.breed}, Gender: ${dog.gender}, For Sale: ${dog.isForSale ? 'Yes' : 'No'}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error fixing dog types:', error);
    return false;
  }
};

// Run the fix
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await fixDogTypes();
      console.log('\nDog type fix operation completed successfully');
    }
  } catch (error) {
    console.error('Error running dog type fix operation:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

run(); 