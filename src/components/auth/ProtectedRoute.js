// src/components/auth/ProtectedRoute.jsx
import React from 'react';
import { useRealAuthContext } from '../../contexts/RealAuthContext';
import { RealAuthScreen } from './RealAuthScreen';
import { Loader } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useRealAuthContext();

  // Mostra loading durante la verifica iniziale
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Loader className="animate-spin" size={20} />
            <span className="text-lg">Caricamento...</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Verifica autenticazione in corso</p>
        </div>
      </div>
    );
  }

  // Se non autenticato, mostra schermata di login
  if (!isAuthenticated) {
    return <RealAuthScreen />;
  }

  // Se autenticato, mostra il contenuto protetto
  return children;
};