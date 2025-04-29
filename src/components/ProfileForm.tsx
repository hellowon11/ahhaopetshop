import React, { useState } from 'react';
import { User } from '../types';

interface ProfileFormProps {
  user: User | null;
  onUpdate: (userData: Partial<User>) => Promise<void>;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await onUpdate({
        name: formData.name,
        phone: formData.phone
      });
      setIsEditing(false);
    } catch (error) {
      setError('更新个人资料失败，请重试');
    }
  };

  if (!user) {
    return <div>未登录</div>;
  }

  return (
    <div className="profile-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">邮箱</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            disabled
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">姓名</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={!isEditing}
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">电话</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={!isEditing}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="edit-button"
            >
              编辑资料
            </button>
          ) : (
            <>
              <button type="submit" className="save-button">
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user.name || '',
                    phone: user.phone || '',
                    email: user.email
                  });
                }}
                className="cancel-button"
              >
                取消
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProfileForm; 