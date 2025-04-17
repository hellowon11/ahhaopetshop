import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NavigationContextType {
  isReturningFromDashboard: boolean;
  setReturningFromDashboard: (value: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isReturningFromDashboard, setIsReturningFromDashboard] = useState(false);

  // Load state from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('returningFromDashboard');
    if (stored === 'true') {
      setIsReturningFromDashboard(true);
      // Clear the stored value after loading
      sessionStorage.removeItem('returningFromDashboard');
    }
  }, []);

  // Update sessionStorage when state changes
  useEffect(() => {
    if (isReturningFromDashboard) {
      sessionStorage.setItem('returningFromDashboard', 'true');
    }
  }, [isReturningFromDashboard]);

  return (
    <NavigationContext.Provider value={{
      isReturningFromDashboard,
      setReturningFromDashboard: setIsReturningFromDashboard
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}; 