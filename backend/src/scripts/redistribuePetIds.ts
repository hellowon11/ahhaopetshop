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

// Redistribute pet IDs to ensure non-sequential numbers
const redistributePetIds = async () => {
  try {
    console.log('Starting pet ID redistribution operation...');
    
    // First verify the dog swaps
    console.log('Verifying dog ID swaps...');
    
    // Confirm #002 and #006 are swapped
    const pet002 = await ShopPet.findOne({ petId: '#002' });
    const pet006 = await ShopPet.findOne({ petId: '#006' });
    console.log(`Pet with ID #002: ${pet002?.name || 'Not found'}`);
    console.log(`Pet with ID #006: ${pet006?.name || 'Not found'}`);
    
    // Confirm #003 and #008 are swapped
    const pet003 = await ShopPet.findOne({ petId: '#003' });
    const pet008 = await ShopPet.findOne({ petId: '#008' });
    console.log(`Pet with ID #003: ${pet003?.name || 'Not found'}`);
    console.log(`Pet with ID #008: ${pet008?.name || 'Not found'}`);
    
    // Now fix all cat IDs
    console.log('Redistributing cat IDs to have non-sequential numbers...');
    
    // First, get all cats
    const cats = await ShopPet.find({ type: 'cat' }).sort({ name: 1 });
    console.log(`Found ${cats.length} cats to renumber`);
    
    // First, give all cats temporary IDs
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      const tempId = `TEMP_CAT_${i}`;
      
      await ShopPet.updateOne(
        { _id: cat._id },
        { $set: { petId: tempId } }
      );
      console.log(`Set temporary ID for ${cat.name}: ${tempId}`);
    }
    
    // Set new non-sequential IDs with gaps
    const newCatIds = [
      'C001', 'C003', 'C005', 'C007', 'C009',
      'C011', 'C013', 'C015', 'C017', 'C019'
    ];
    
    // Apply the new IDs
    for (let i = 0; i < cats.length; i++) {
      if (i < newCatIds.length) {
        const cat = cats[i];
        const newId = newCatIds[i];
        
        await ShopPet.updateOne(
          { _id: cat._id },
          { $set: { petId: newId } }
        );
        console.log(`Assigned cat ${cat.name} new ID: ${newId}`);
      }
    }
    
    // Verify final cat IDs
    const updatedCats = await ShopPet.find({ type: 'cat' }).sort({ petId: 1 });
    console.log('Final cat IDs:');
    for (const cat of updatedCats) {
      console.log(`- ${cat.name}: ${cat.petId}`);
    }
    
    console.log('Pet ID redistribution completed successfully!');
    return true;
  } catch (error) {
    console.error('Error redistributing pet IDs:', error);
    return false;
  }
};

// Run the update
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await redistributePetIds();
      console.log('Pet ID redistribution completed successfully');
    }
  } catch (error) {
    console.error('Error running redistribution operation:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

run(); 