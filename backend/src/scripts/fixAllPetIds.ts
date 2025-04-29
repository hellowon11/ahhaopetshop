import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ShopPet, IShopPet } from '../models/ShopPet';

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

// Fix all pet IDs
const fixAllPetIds = async () => {
  try {
    console.log('Starting to fix all pet IDs...');
    
    // Get all pets
    const allPets = await ShopPet.find({});
    console.log(`Found ${allPets.length} total pets to update`);
    
    // First set all IDs to temporary values to avoid conflicts
    console.log('Setting temporary IDs...');
    for (const pet of allPets) {
      const tempId = `TEMP_${pet.type}_${String(pet._id)}`;
      await ShopPet.updateOne(
        { _id: pet._id },
        { $set: { petId: tempId } }
      );
    }
    
    // Find Milo to keep him as #001
    const milo = await ShopPet.findOne({ name: 'Milo', type: 'dog' });
    if (milo) {
      await ShopPet.updateOne(
        { _id: milo._id },
        { $set: { petId: '#001', isForSale: false } }
      );
      console.log('Set Milo as #001 and not for sale');
    } else {
      console.log('Warning: Could not find Milo!');
    }
    
    // Get all dogs except Milo for ID assignment
    const otherDogs = await ShopPet.find({ 
      type: 'dog',
      name: { $ne: 'Milo' }
    });
    
    // Define the desired ID mapping for dogs
    const dogNameToIdMap: { [key: string]: string } = {
      'Lucky': '#002',    // Was #006, now set to #002
      'Bella': '#006',    // Was #002, now set to #006
      'Charlie': '#008',  // Was #003, now set to #008
      'Storm': '#003',    // Was #008, now set to #003
      'Coco': '#004',
      'Cookie': '#005',
      'Max': '#007'
    };
    
    // Apply the dog ID mapping
    console.log('Setting dog IDs according to the mapping...');
    for (const dog of otherDogs) {
      const desiredId = dogNameToIdMap[dog.name];
      if (desiredId) {
        await ShopPet.updateOne(
          { _id: dog._id },
          { $set: { petId: desiredId } }
        );
        console.log(`Set ${dog.name} to ID ${desiredId}`);
      } else {
        // If no mapping is defined, use a fallback ID
        const fallbackId = `#999_${String(dog._id).slice(-4)}`;
        await ShopPet.updateOne(
          { _id: dog._id },
          { $set: { petId: fallbackId } }
        );
        console.log(`Warning: No ID mapping for dog ${dog.name}, using fallback ID ${fallbackId}`);
      }
    }
    
    // Get all cats
    const cats = await ShopPet.find({ type: 'cat' }).sort({ name: 1 });
    console.log(`Found ${cats.length} cats to renumber`);
    
    // Define the non-sequential IDs for cats
    const catIds = ['C001', 'C003', 'C005', 'C007', 'C009', 'C011', 'C013', 'C015', 'C017', 'C019'];
    
    // Apply the cat IDs
    console.log('Setting cat IDs with non-sequential numbers...');
    for (let i = 0; i < cats.length; i++) {
      if (i < catIds.length) {
        const cat = cats[i];
        const newId = catIds[i];
        await ShopPet.updateOne(
          { _id: cat._id },
          { $set: { petId: newId } }
        );
        console.log(`Set ${cat.name} to ID ${newId}`);
      } else {
        console.log(`Warning: Not enough IDs defined for ${cats.length} cats!`);
        break;
      }
    }
    
    // Verify all pets have IDs
    const petsWithoutIds = await ShopPet.find({ 
      $or: [
        { petId: { $exists: false } },
        { petId: null },
        { petId: '' }
      ]
    });
    
    if (petsWithoutIds.length > 0) {
      console.log(`Warning: Found ${petsWithoutIds.length} pets without proper IDs!`);
      for (const pet of petsWithoutIds) {
        const fallbackId = `${pet.type === 'dog' ? '#' : 'C'}999_${String(pet._id).slice(-4)}`;
        await ShopPet.updateOne(
          { _id: pet._id },
          { $set: { petId: fallbackId } }
        );
        console.log(`Set fallback ID ${fallbackId} for ${pet.name || 'unnamed pet'}`);
      }
    }
    
    // Final verification of all pets
    const finalPets = await ShopPet.find({}).sort({ type: 1, petId: 1 });
    console.log('\nFinal pet IDs:');
    
    console.log('\nDOGS:');
    console.log('-----');
    for (const pet of finalPets.filter(p => p.type === 'dog')) {
      console.log(`ID: ${pet.petId.padEnd(6)} | Name: ${pet.name.padEnd(12)} | Breed: ${pet.breed.padEnd(20)} | For Sale: ${pet.isForSale ? 'Yes' : 'No'}`);
    }
    
    console.log('\nCATS:');
    console.log('-----');
    for (const pet of finalPets.filter(p => p.type === 'cat')) {
      console.log(`ID: ${pet.petId.padEnd(6)} | Name: ${pet.name.padEnd(12)} | Breed: ${pet.breed.padEnd(20)} | For Sale: ${pet.isForSale ? 'Yes' : 'No'}`);
    }
    
    console.log('\nAll pet IDs have been fixed successfully!');
    return true;
  } catch (error) {
    console.error('Error fixing pet IDs:', error);
    return false;
  }
};

// Run the update
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await fixAllPetIds();
      console.log('Pet ID fix operation completed');
    }
  } catch (error) {
    console.error('Error running pet ID fix operation:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

run(); 