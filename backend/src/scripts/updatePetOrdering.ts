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

// Update pet IDs and set Milo as not for sale
const updatePetOrdering = async () => {
  try {
    console.log('Starting pet ordering update...');
    
    // First, find if there's already a pet with ID #001 that is not Milo
    const existingPet001 = await ShopPet.findOne({ petId: '#001', name: { $ne: 'Milo' } });
    if (existingPet001) {
      console.log(`Found existing pet with ID #001: ${existingPet001.name}. Handling this conflict...`);
      // Set a temporary ID for this pet to avoid conflicts
      existingPet001.petId = '#TEMP001';
      await existingPet001.save();
      console.log(`Temporary ID set for ${existingPet001.name}: #TEMP001`);
    }
    
    // Next, find Milo
    const milo = await ShopPet.findOne({ name: 'Milo', type: 'dog' });
    if (!milo) {
      console.log('Milo not found! Cannot proceed with reordering.');
      return false;
    }
    
    // Set Milo as #001 and mark as not for sale
    milo.petId = '#001';
    milo.isForSale = false;
    await milo.save();
    console.log(`Updated Milo with ID #001 and marked as not for sale.`);
    
    // Get all other dogs except Milo
    const otherDogs = await ShopPet.find({ 
      type: 'dog', 
      name: { $ne: 'Milo' },
      petId: { $ne: '#TEMP001' } // Skip the temporarily renamed pet
    }).sort({ name: 1 });
    console.log(`Found ${otherDogs.length} other dogs to renumber`);
    
    // Renumber other dogs starting from #002
    let dogCounter = 2;
    for (const dog of otherDogs) {
      const paddedNum = dogCounter.toString().padStart(3, '0');
      const newPetId = `#${paddedNum}`;
      console.log(`Renumbering dog ${dog.name} from ${dog.petId} to ${newPetId}`);
      dog.petId = newPetId;
      await dog.save();
      dogCounter++;
    }
    
    // Handle the pet with temporary ID if it exists
    if (existingPet001) {
      const paddedNum = dogCounter.toString().padStart(3, '0');
      const newPetId = `#${paddedNum}`;
      console.log(`Renumbering previously #001 pet ${existingPet001.name} from #TEMP001 to ${newPetId}`);
      existingPet001.petId = newPetId;
      await existingPet001.save();
      dogCounter++;
    }
    
    // Get all cats
    const cats = await ShopPet.find({ type: 'cat' }).sort({ name: 1 });
    console.log(`Found ${cats.length} cats to renumber`);
    
    // Renumber cats starting from C001
    let catCounter = 1;
    for (const cat of cats) {
      const paddedNum = catCounter.toString().padStart(3, '0');
      const newPetId = `C${paddedNum}`;
      console.log(`Renumbering cat ${cat.name} from ${cat.petId} to ${newPetId}`);
      cat.petId = newPetId;
      await cat.save();
      catCounter++;
    }
    
    console.log('Pet reordering completed successfully!');
    return true;
  } catch (error) {
    console.error('Error updating pet ordering:', error);
    return false;
  }
};

// Run the update
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await updatePetOrdering();
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