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

// Swap pet IDs
const swapPetIds = async () => {
  try {
    console.log('Starting pet ID swap operation...');
    
    // Find pets with IDs #002 and #006
    const pet002 = await ShopPet.findOne({ petId: '#002' });
    const pet006 = await ShopPet.findOne({ petId: '#006' });
    
    // Find pets with IDs #003 and #008
    const pet003 = await ShopPet.findOne({ petId: '#003' });
    const pet008 = await ShopPet.findOne({ petId: '#008' });
    
    if (!pet002 || !pet006) {
      console.log('Could not find both pets with IDs #002 and #006');
      if (pet002) console.log(`Found pet #002: ${pet002.name}`);
      if (pet006) console.log(`Found pet #006: ${pet006.name}`);
      if (!pet002 && !pet006) console.log('Neither pet was found');
    } else {
      // Set temporary IDs to avoid unique constraint conflicts
      await ShopPet.updateOne({ _id: pet002._id }, { $set: { petId: '#TEMP002' } });
      await ShopPet.updateOne({ _id: pet006._id }, { $set: { petId: '#TEMP006' } });
      
      console.log(`Temporarily set ${pet002.name}'s ID to #TEMP002`);
      console.log(`Temporarily set ${pet006.name}'s ID to #TEMP006`);
      
      // Swap the IDs
      await ShopPet.updateOne({ _id: pet002._id }, { $set: { petId: '#006' } });
      await ShopPet.updateOne({ _id: pet006._id }, { $set: { petId: '#002' } });
      
      console.log(`Swapped ${pet002.name}'s ID to #006`);
      console.log(`Swapped ${pet006.name}'s ID to #002`);
    }
    
    if (!pet003 || !pet008) {
      console.log('Could not find both pets with IDs #003 and #008');
      if (pet003) console.log(`Found pet #003: ${pet003.name}`);
      if (pet008) console.log(`Found pet #008: ${pet008.name}`);
      if (!pet003 && !pet008) console.log('Neither pet was found');
    } else {
      // Set temporary IDs to avoid unique constraint conflicts
      await ShopPet.updateOne({ _id: pet003._id }, { $set: { petId: '#TEMP003' } });
      await ShopPet.updateOne({ _id: pet008._id }, { $set: { petId: '#TEMP008' } });
      
      console.log(`Temporarily set ${pet003.name}'s ID to #TEMP003`);
      console.log(`Temporarily set ${pet008.name}'s ID to #TEMP008`);
      
      // Swap the IDs
      await ShopPet.updateOne({ _id: pet003._id }, { $set: { petId: '#008' } });
      await ShopPet.updateOne({ _id: pet008._id }, { $set: { petId: '#003' } });
      
      console.log(`Swapped ${pet003.name}'s ID to #008`);
      console.log(`Swapped ${pet008.name}'s ID to #003`);
    }
    
    // Now redistribute cats to have non-sequential IDs
    console.log('Redistributing cat IDs to have non-sequential numbers...');
    
    const cats = await ShopPet.find({ type: 'cat' }).sort({ name: 1 });
    
    if (cats.length > 0) {
      // Set new IDs with gaps (use odd numbers)
      const newCatIds = [
        'C001', 'C003', 'C005', 'C007', 'C009', 
        'C011', 'C013', 'C015', 'C017', 'C019'
      ];
      
      for (let i = 0; i < cats.length; i++) {
        if (i < newCatIds.length) {
          const cat = cats[i];
          const oldId = cat.petId;
          const newId = newCatIds[i];
          
          await ShopPet.updateOne({ _id: cat._id }, { $set: { petId: newId } });
          console.log(`Changed cat ${cat.name}'s ID from ${oldId} to ${newId}`);
        }
      }
    } else {
      console.log('No cats found to redistribution');
    }
    
    console.log('Pet ID swap and redistribution completed successfully!');
    return true;
  } catch (error) {
    console.error('Error swapping pet IDs:', error);
    return false;
  }
};

// Run the update
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await swapPetIds();
      console.log('Pet ID swap completed successfully');
    }
  } catch (error) {
    console.error('Error running swap operation:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

run(); 