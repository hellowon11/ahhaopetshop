import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import MainApp from './components/MainApp';
import Login from './pages/Login';
import MemberDashboard from './pages/MemberDashboard';
import GroomingAppointment from './pages/GroomingAppointment';
import AppointmentManagement from './pages/AppointmentManagement';
import ResetPassword from './pages/ResetPassword';
import AllPets from './pages/AllPets';
import AdminPortal from './pages/AdminPortal';
import FavouritePets from './pages/FavouritePets';
import ShopPage from './pages/ShopPage';
import { PrivateRoute } from './components/PrivateRoute';
import { AdminRoute } from './components/AdminRoute';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <NavigationProvider>
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/member-dashboard"
              element={
                <PrivateRoute>
                  <MemberDashboard />
                </PrivateRoute>
              }
            />
            <Route path="/grooming-appointment" element={<GroomingAppointment />} />
            <Route
              path="/appointments"
              element={
                <PrivateRoute>
                  <AppointmentManagement />
                </PrivateRoute>
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/all-pets" element={<AllPets />} />
            <Route
              path="/admin-portal"
              element={
                <AdminRoute>
                  <AdminPortal />
                </AdminRoute>
              }
            />
            <Route path="/shop" element={<ShopPage />} />
            <Route
              path="/favourites"
              element={
                <PrivateRoute>
                  <FavouritePets />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<MainApp />} />
          </Routes>
        </NavigationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App; 