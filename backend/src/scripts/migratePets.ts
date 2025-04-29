import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ShopPet } from '../models/ShopPet';

dotenv.config();

// Frontend pet data from PetList.tsx
const frontendPets = [
  {
    id: 1,
    name: "Lucky",
    breed: "Golden Retriever",
    age: "2 months",
    gender: "Male",
    image: "/imgs/Golden Retriever_2 months.jpeg",
    type: "dog"
  },
  {
    id: 2,
    name: "Cookie",
    breed: "Corgi",
    age: "1 month",
    gender: "Female",
    image: "/imgs/Corgi_Age_1 months.jpg",
    type: "dog"
  },
  {
    id: 3,
    name: "Milo",
    breed: "Pomeranian",
    age: "12 years",
    gender: "Male",
    image: "/imgs/Pomeranian_12 Years Old.jpg",
    type: "dog"
  },
  {
    id: 4,
    name: "Luna",
    breed: "Persian Cat",
    age: "1 year",
    gender: "Female",
    image: "/imgs/Persian cat_1 years old.jpg",
    type: "cat"
  },
  {
    id: 5,
    name: "Snow",
    breed: "British Shorthair",
    age: "2 months",
    gender: "Female",
    image: "/imgs/British Shorthair_2 Months.jpg",
    type: "cat"
  },
  {
    id: 6,
    name: "Oliver",
    breed: "Scottish Fold",
    age: "3 months",
    gender: "Male",
    image: "/imgs/Scottish Fold.jpg",
    type: "cat"
  },
  {
    id: 7,
    name: "Max",
    breed: "Chihuahua",
    age: "2 months",
    gender: "Male",
    image: "/imgs/Chihuahua male.jpg",
    type: "dog"
  },
  {
    id: 8,
    name: "Storm",
    breed: "Husky",
    age: "2 months",
    gender: "Female",
    image: "/imgs/Husky_2 Months.jpg",
    type: "dog"
  },
  {
    id: 9,
    name: "Bella",
    breed: "Pomeranian",
    age: "2 months",
    gender: "Female",
    image: "/imgs/Pomeranian_2 Months.jpg",
    type: "dog"
  },
  {
    id: 10,
    name: "Charlie",
    breed: "Pomeranian",
    age: "3 months",
    gender: "Male",
    image: "/imgs/Pomeranian_3 Months.jpg",
    type: "dog"
  },
  {
    id: 11,
    name: "Coco",
    breed: "Shih Tzu",
    age: "3 months",
    gender: "Female",
    image: "/imgs/Shih Tzu_3 Months.jpg",
    type: "dog"
  },
  {
    id: 12,
    name: "Lily",
    breed: "Abyssinian",
    age: "2 years",
    gender: "Female",
    image: "/imgs/Abyssinian_2 Years old_Female.jpg",
    type: "cat"
  },
  {
    id: 13,
    name: "Daisy",
    breed: "British Shorthair",
    age: "1 month",
    gender: "Female",
    image: "/imgs/golden British Shorthair_1 Months_Female.jpg",
    type: "cat"
  }
];

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

// Function to migrate pets data
const migratePets = async () => {
  try {
    console.log('Starting pet data migration...');
    
    // Clear existing data (optional)
    await ShopPet.deleteMany({});
    console.log('Removed existing shop pets data');
    
    // Convert frontend pet data to our backend model format
    const shopPets = frontendPets.map(pet => {
      // Generate petId with proper format based on pet type
      const prefix = pet.type === 'dog' ? '#' : 'C';
      const paddedId = pet.id.toString().padStart(3, '0');
      const petId = `${prefix}${paddedId}`;
      
      return {
        petId,
        name: pet.name,
        breed: pet.breed,
        age: pet.age,
        gender: pet.gender,
        imageUrl: pet.image,
        type: pet.type,
        description: `A lovely ${pet.breed} ${pet.type}, ${pet.age} old.`
      };
    });
    
    // Insert data into the database
    const result = await ShopPet.insertMany(shopPets);
    console.log(`Successfully migrated ${result.length} pets to the database`);
    
    // List all migrated pets
    console.log('Migrated pets:');
    result.forEach(pet => {
      console.log(`${pet.petId}: ${pet.name} (${pet.breed})`);
    });
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close database connection
    mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Run the migration
const runMigration = async () => {
  try {
    await connectDB();
    await migratePets();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration(); 