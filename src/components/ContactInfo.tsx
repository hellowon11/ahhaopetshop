import React from 'react';
import { useShopInfo } from '../hooks/useShopInfo';

export const ContactInfo = () => {
  const { shopInfo, loading, error } = useShopInfo();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading shop information</div>;
  }

  if (!shopInfo) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Phone</h2>
        <p className="text-gray-600">+{shopInfo.phone}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Email</h2>
        <p className="text-gray-600">{shopInfo.email}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Hours</h2>
        <p className="text-gray-600">Mon-Sun {shopInfo.businessHours.monday.open}-{shopInfo.businessHours.monday.close}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Follow Us</h2>
        <div className="flex space-x-4">
          {shopInfo.socialMedia.facebook && (
            <a href={shopInfo.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
              Facebook
            </a>
          )}
          {shopInfo.socialMedia.instagram && (
            <a href={shopInfo.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800">
              Instagram
            </a>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Address</h2>
        <p className="text-gray-600">
          {shopInfo.address.street}<br />
          {shopInfo.address.city}, {shopInfo.address.state} {shopInfo.address.postalCode}<br />
          {shopInfo.address.country}
        </p>
      </div>
    </div>
  );
}; 