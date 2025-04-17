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
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Function to update Cici's image URL
const updatePetImage = async () => {
  try {
    console.log('Starting to update Cici\'s image URL...');
    
    // Find and update Cici's record
    const updatedPet = await ShopPet.findOneAndUpdate(
      { name: 'Cici' },
      { $set: { imageUrl: '/imgs/Cici.jpg' } },
      { new: true }
    );

    if (updatedPet) {
      console.log('Successfully updated Cici\'s image URL:', updatedPet);
    } else {
      console.log('Could not find a pet named Cici');
    }
    
  } catch (error) {
    console.error('Error during update:', error);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Run the update
connectDB().then(() => {
  updatePetImage();
}); 