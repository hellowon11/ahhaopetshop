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

// Final verification of pets
const finalVerifyPets = async () => {
  try {
    console.log('Performing final verification of all pets...');
    
    // Direct string match for dog type
    const dogsWithType = await ShopPet.find({ type: "dog" }).sort({ petId: 1 });
    // Regex match for dog IDs
    const dogsWithId = await ShopPet.find({ petId: /^#\d+/ }).sort({ petId: 1 });
    
    console.log(`Found ${dogsWithType.length} dogs with type 'dog' and ${dogsWithId.length} pets with dog ID pattern`);
    
    // Cats with type
    const catsWithType = await ShopPet.find({ type: "cat" }).sort({ petId: 1 });
    // Cats with ID
    const catsWithId = await ShopPet.find({ petId: /^C\d+/ }).sort({ petId: 1 });
    
    console.log(`Found ${catsWithType.length} cats with type 'cat' and ${catsWithId.length} pets with cat ID pattern`);
    
    // Direct database queries for dogs and cats
    console.log('\nAll Dog and Cat IDs in database:');
    const allPets = await ShopPet.find({});
    for (const pet of allPets) {
      console.log(`  - ID: ${pet.petId}, Name: ${pet.name}, Type: ${pet.type}, Breed: ${pet.breed}`);
    }
    
    // Print all dogs
    console.log('\nDOGS:');
    console.log('-----');
    // Combine both queries to ensure we get all dogs
    const allDogs = await ShopPet.find({
      $or: [
        { type: "dog" },
        { petId: /^#\d+/ }
      ]
    }).sort({ petId: 1 });
    
    for (const dog of allDogs) {
      const petId = dog.petId.padEnd(6);
      const name = dog.name.padEnd(12);
      const breed = dog.breed.padEnd(20);
      const gender = dog.gender.padEnd(8);
      console.log(`ID: ${petId} | Name: ${name} | Breed: ${breed} | Gender: ${gender} | Type: ${dog.type} | For Sale: ${dog.isForSale ? 'Yes' : 'No'}`);
    }
    
    // Print all cats
    console.log('\nCATS:');
    console.log('-----');
    // Combine both queries to ensure we get all cats
    const allCats = await ShopPet.find({
      $or: [
        { type: "cat" },
        { petId: /^C\d+/ }
      ]
    }).sort({ petId: 1 });
    
    for (const cat of allCats) {
      const petId = cat.petId.padEnd(6);
      const name = cat.name.padEnd(12);
      const breed = cat.breed.padEnd(20);
      const gender = cat.gender.padEnd(8);
      console.log(`ID: ${petId} | Name: ${name} | Breed: ${breed} | Gender: ${gender} | Type: ${cat.type} | For Sale: ${cat.isForSale ? 'Yes' : 'No'}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error during final verification:', error);
    return false;
  }
};

// Run the verification
const run = async () => {
  try {
    const connected = await connectDB();
    if (connected) {
      await finalVerifyPets();
    }
  } catch (error) {
    console.error('Error running final verification:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

run(); 