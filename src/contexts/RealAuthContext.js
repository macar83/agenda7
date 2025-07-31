// src/contexts/RealAuthContext.js
import React, { createContext, useContext } from 'react';
import { useRealAuth } from '../hooks/useRealAuth';

const RealAuthContext = createContext();

export const useRealAuthContext = () => {
  const context = useContext(RealAuthContext);
  if (!context) {
    throw new Error('useRealAuthContext must be used within a RealAuthProvider');
  }
  return context;
};

export const RealAuthProvider = ({ children }) => {
  const authData = useRealAuth();

  return (
    <RealAuthContext.Provider value={authData}>
      {children}
    </RealAuthContext.Provider>
  );
};