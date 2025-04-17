import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-12">
      {/* Cute Pets Card */}
      <Link to="/all-pets" className="group relative h-[200px] sm:h-[280px] rounded-2xl overflow-hidden shadow-lg">
        <img 
          src="/imgs/cute-pets@cute-pets.jpg" 
          alt="Cute Pets" 
          className="w-full h-full object-contain sm:object-cover transform group-hover:scale-105 transition-transform duration-300 bg-white p-2 sm:p-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white text-xl font-semibold mb-2">Cute Pets</h3>
            <p className="text-white/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Find your perfect companion from our selection of lovely pets
            </p>
          </div>
        </div>
      </Link>

      {/* Grooming Card */}
      <Link to="/grooming-appointment" className="group relative h-[200px] sm:h-[280px] rounded-2xl overflow-hidden shadow-lg">
        <img 
          src="/imgs/grooming.jpg" 
          alt="Grooming" 
          className="w-full h-full object-contain sm:object-cover transform group-hover:scale-105 transition-transform duration-300 bg-white p-2 sm:p-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white text-xl font-semibold mb-2">Grooming</h3>
            <p className="text-white/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Professional pet care services for your furry friends
            </p>
          </div>
        </div>
      </Link>

      {/* Pet Supplies Card */}
      <Link to="/pet-supplies" className="group relative h-[200px] sm:h-[280px] rounded-2xl overflow-hidden shadow-lg">
        <img 
          src="/imgs/pet supplies.jpg" 
          alt="Pet Supplies" 
          className="w-full h-full object-contain sm:object-cover transform group-hover:scale-105 transition-transform duration-300 bg-white p-2 sm:p-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white text-xl font-semibold mb-2">Pet Supplies</h3>
            <p className="text-white/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Quality products for your pets
            </p>
          </div>
        </div>
      </Link>

      {/* Pet Daycare Card */}
      <Link to="/pet-daycare" className="group relative h-[200px] sm:h-[280px] rounded-2xl overflow-hidden shadow-lg">
        <img 
          src="/imgs/pet daycare.jpg" 
          alt="Pet Daycare" 
          className="w-full h-full object-contain sm:object-cover transform group-hover:scale-105 transition-transform duration-300 bg-white p-2 sm:p-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white text-xl font-semibold mb-2">Pet Daycare</h3>
            <p className="text-white/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Safe and comfortable environment for your pets
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default Home; 