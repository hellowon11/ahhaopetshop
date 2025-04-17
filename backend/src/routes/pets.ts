import express, { Request, Response } from 'express';
import { Pet } from '../models/Pet';
import { auth } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const router = express.Router();

// Get all pets
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const pets = await Pet.find({ owner: req.user?.id });
    res.json(pets);
  } catch (error) {
    console.error('Get pets error:', error);
    res.status(500).json({ message: 'Failed to get pets' });
  }
});

// Add pet
router.post('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { name, breed, age, gender, specialNeeds, imageUrl } = req.body;

    // Validate required fields
    if (!name || !gender) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        details: {
          name: !name ? 'Name is required' : null,
          gender: !gender ? 'Gender is required' : null
        }
      });
    }

    // Validate gender value
    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({ 
        message: 'Invalid gender value. Must be either "male" or "female"' 
      });
    }

    const pet = new Pet({
      owner: req.user.id,
      name,
      breed: breed || '',
      age: age || 0,
      gender,
      specialNeeds: specialNeeds || '',
      imageUrl: imageUrl || ''
    });

    console.log('Creating pet:', pet);
    await pet.save();
    console.log('Pet created successfully:', pet);
    
    res.status(201).json(pet);
  } catch (error) {
    console.error('Add pet error:', error);
    res.status(500).json({ 
      message: 'Failed to add pet',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update pet
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, breed, age, gender, specialNeeds, imageUrl } = req.body;
    const pet = await Pet.findOneAndUpdate(
      { _id: req.params.id, owner: req.user?.id },
      { name, breed, age, gender, specialNeeds, imageUrl },
      { new: true }
    );
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    res.json(pet);
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({ message: 'Failed to update pet' });
  }
});

// Delete pet
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const pet = await Pet.findOneAndDelete({ _id: req.params.id, owner: req.user?.id });
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    res.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({ message: 'Failed to delete pet' });
  }
});

export default router; 