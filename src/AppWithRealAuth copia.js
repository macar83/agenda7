// src/AppWithRealAuth.jsx
import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { RealAuthProvider } from './contexts/RealAuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppContextProvider, useAppContext } from './contexts/AppContext';

// Import dei componenti esistenti
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Overview } from './components/views/Overview';
import { ListsView } from './components/views/ListsView';
import { StatsView } from './components/views/StatsView';

// Main App Component content (usa il context adattato)
const AppWithRealAuthContent = () => {
  const { data, clearError } = useAppContext();

  const renderContent = () => {
    switch (data.currentView) {
      case 'overview':
        return <Overview />;
      case 'lists':
        return <ListsView />;
      case 'stats':
        return <StatsView />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      {/* Error Banner */}
      {data.error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{data.error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={clearError}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative">
          {/* Loading Overlay */}
          {data.isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-40">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Caricamento...</p>
              </div>
            </div>
          )}
          
          {/* Content */}
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// App principale con tutti i provider necessari
const AppWithRealAuth = () => {
  return (
    <RealAuthProvider>
      <ProtectedRoute>
        <AppContextProvider>
          <AppWithRealAuthContent />
        </AppContextProvider>
      </ProtectedRoute>
    </RealAuthProvider>
  );
};

export default AppWithRealAuth;