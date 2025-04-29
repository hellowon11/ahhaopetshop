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

// Update Milo's status to not for sale
const updateMiloStatus = async () => {
  try {
    console.log('Updating Milo status...');
    
    // Find Milo
    const milo = await ShopPet.findOne({ name: 'Milo', type: 'dog' });
    if (!milo) {
      console.log('Milo not found! Cannot update status.');
      return false;
    }
    
    // Mark Milo as not for sale
    milo.isForSale = false;
    await milo.save();
    console.log(`Updated Milo (${milo.petId}) - isForSale set to false`);
    
    return true;
  } catch (error) {
    console.error('Error updating Milo status:', error);
    return false;
  }
};

// Run the update
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await updateMiloStatus();
      console.log('Milo status update completed successfully');
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