import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-shop';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

// Create admin user function
const createAdminUser = async () => {
  try {
    await connectDB();

    // Check if admin user already exists
    const existingUser = await User.findOne({ email: 'ahhaopetshop@gmail.com' });
    
    if (existingUser) {
      console.log('Admin user already exists');
      
      // Update role to admin if not already
      if (existingUser.role !== 'admin') {
        await User.findByIdAndUpdate(existingUser._id, { role: 'admin' });
        console.log('Updated existing user to admin role');
      }
    } else {
      // Create new admin user
      const adminUser = new User({
        email: 'ahhaopetshop@gmail.com',
        password: '12345',
        name: 'Admin',
        phone: '12345678',
        role: 'admin'
      });

      await adminUser.save();
      console.log('Admin user created successfully');
    }

    // Disconnect from database
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the function
createAdminUser(); 