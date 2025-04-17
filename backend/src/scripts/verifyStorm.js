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

// Verify Storm's info
const verifyStorm = async () => {
  try {
    console.log('Verifying Storm (#003) details...');
    
    // Find pet with ID #003
    const storm = await ShopPet.findOne({ petId: '#003' });
    
    if (!storm) {
      console.log('Storm (#003) not found in the database!');
      return false;
    }
    
    console.log('\nSTORM DETAILS:');
    console.log('-------------');
    console.log(`ID: ${storm.petId}`);
    console.log(`Name: ${storm.name}`);
    console.log(`Type: ${storm.type}`);
    console.log(`Breed: ${storm.breed}`);
    console.log(`Gender: ${storm.gender}`);
    console.log(`For Sale: ${storm.isForSale ? 'Yes' : 'No'}`);
    
    // Double-check if the gender is Male
    if (storm.gender === 'Male') {
      console.log('\n✅ Storm\'s gender is correctly set to Male');
    } else {
      console.log('\n❌ Storm\'s gender is NOT set to Male! Current value:', storm.gender);
      
      // Fix it if needed
      console.log('Fixing Storm\'s gender to Male...');
      await ShopPet.updateOne(
        { petId: '#003' },
        { $set: { gender: 'Male' } }
      );
      
      // Verify the fix
      const fixedStorm = await ShopPet.findOne({ petId: '#003' });
      if (fixedStorm.gender === 'Male') {
        console.log('✅ Successfully fixed Storm\'s gender to Male');
      } else {
        console.log('❌ Failed to fix Storm\'s gender!');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying Storm:', error);
    return false;
  }
};

// Run the verification
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await verifyStorm();
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