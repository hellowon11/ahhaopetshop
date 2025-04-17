import React, { useState } from 'react';
import { Pet } from '../types';

interface PetListProps {
  pets: Pet[];
  onAdd: (pet: Omit<Pet, '_id'>) => Promise<void>;
  onUpdate: (id: string, petData: Partial<Pet>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const PetList: React.FC<PetListProps> = ({ pets, onAdd, onUpdate, onDelete }) => {
  const [newPet, setNewPet] = useState<Omit<Pet, '_id'>>({
    name: '',
    breed: '',
    age: 0,
    gender: 'male',
    specialNeeds: '',
    imageUrl: ''
  });
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPet) {
      await onUpdate(editingPet._id!, newPet);
      setEditingPet(null);
    } else {
      await onAdd(newPet);
    }
    setNewPet({
      name: '',
      breed: '',
      age: 0,
      gender: 'male',
      specialNeeds: '',
      imageUrl: ''
    });
  };

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    setNewPet({
      name: pet.name,
      breed: pet.breed,
      age: pet.age,
      gender: pet.gender,
      specialNeeds: pet.specialNeeds || '',
      imageUrl: pet.imageUrl || ''
    });
  };

  return (
    <div className="pet-list">
      <form onSubmit={handleSubmit} className="pet-form">
        <input
          type="text"
          placeholder="宠物名称"
          value={newPet.name}
          onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="品种"
          value={newPet.breed}
          onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="年龄"
          value={newPet.age}
          onChange={(e) => setNewPet({ ...newPet, age: parseInt(e.target.value) })}
          required
        />
        <select
          value={newPet.gender}
          onChange={(e) => setNewPet({ ...newPet, gender: e.target.value as 'male' | 'female' })}
          required
        >
          <option value="male">雄性</option>
          <option value="female">雌性</option>
        </select>
        <input
          type="text"
          placeholder="特殊需求"
          value={newPet.specialNeeds}
          onChange={(e) => setNewPet({ ...newPet, specialNeeds: e.target.value })}
        />
        <input
          type="text"
          placeholder="图片URL"
          value={newPet.imageUrl}
          onChange={(e) => setNewPet({ ...newPet, imageUrl: e.target.value })}
        />
        <button type="submit">{editingPet ? '更新' : '添加'}</button>
        {editingPet && (
          <button type="button" onClick={() => setEditingPet(null)}>
            取消
          </button>
        )}
      </form>

      <div className="pets-grid">
        {pets.map((pet) => (
          <div key={pet._id} className="pet-card">
            {pet.imageUrl && <img src={pet.imageUrl} alt={pet.name} />}
            <h3>{pet.name}</h3>
            <p>品种: {pet.breed}</p>
            <p>年龄: {pet.age}</p>
            <p>性别: {pet.gender === 'male' ? '雄性' : '雌性'}</p>
            {pet.specialNeeds && <p>特殊需求: {pet.specialNeeds}</p>}
            <div className="pet-actions">
              <button onClick={() => handleEdit(pet)}>编辑</button>
              <button onClick={() => onDelete(pet._id!)}>删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PetList; 