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

// Reset all pet IDs and reorder them
const resetPetOrdering = async () => {
  try {
    console.log('Starting complete pet ID reset and reordering...');
    
    // Step 1: First set all pets to temporary IDs to avoid conflicts
    console.log('Setting temporary IDs for all pets...');
    
    // Get all pets
    const allPets = await ShopPet.find({});
    console.log(`Found ${allPets.length} total pets to reorder`);
    
    // Set temporary IDs based on pet type and MongoDB _id
    for (let i = 0; i < allPets.length; i++) {
      const pet = allPets[i];
      const tempId = `TEMP_${pet.type}_${i}`;
      console.log(`Setting temporary ID for ${pet.name}: ${tempId} (was ${pet.petId})`);
      
      // Update directly with updateOne to avoid validation issues
      await ShopPet.updateOne(
        { _id: pet._id },
        { $set: { petId: tempId } }
      );
    }
    
    console.log('All pets have temporary IDs. Now setting final IDs...');
    
    // Step 2: Find Milo and set as #001
    const milo = await ShopPet.findOne({ name: 'Milo', type: 'dog' });
    if (!milo) {
      console.log('Milo not found! Will proceed with other pets...');
    } else {
      // Set Milo as #001 and mark as not for sale
      await ShopPet.updateOne(
        { _id: milo._id },
        { $set: { petId: '#001', isForSale: false } }
      );
      console.log(`Set Milo as #001 and marked as not for sale`);
    }
    
    // Step 3: Get all other dogs except Milo
    const otherDogs = await ShopPet.find({ 
      type: 'dog', 
      name: { $ne: 'Milo' } 
    }).sort({ name: 1 });
    console.log(`Found ${otherDogs.length} other dogs to number from #002`);
    
    // Renumber other dogs starting from #002
    let dogCounter = 2;
    for (const dog of otherDogs) {
      const paddedNum = dogCounter.toString().padStart(3, '0');
      const newPetId = `#${paddedNum}`;
      console.log(`Setting dog ${dog.name} to ${newPetId}`);
      
      await ShopPet.updateOne(
        { _id: dog._id },
        { $set: { petId: newPetId } }
      );
      dogCounter++;
    }
    
    // Step 4: Renumber all cats
    const cats = await ShopPet.find({ type: 'cat' }).sort({ name: 1 });
    console.log(`Found ${cats.length} cats to number from C001`);
    
    // Renumber cats starting from C001
    let catCounter = 1;
    for (const cat of cats) {
      const paddedNum = catCounter.toString().padStart(3, '0');
      const newPetId = `C${paddedNum}`;
      console.log(`Setting cat ${cat.name} to ${newPetId}`);
      
      await ShopPet.updateOne(
        { _id: cat._id },
        { $set: { petId: newPetId } }
      );
      catCounter++;
    }
    
    console.log('Pet ID reset and reordering completed successfully!');
    return true;
  } catch (error) {
    console.error('Error resetting pet IDs:', error);
    return false;
  }
};

// Run the update
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await resetPetOrdering();
      console.log('Pet ID reset completed successfully');
    }
  } catch (error) {
    console.error('Error running reset:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

run(); 