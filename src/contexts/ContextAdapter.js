// src/contexts/ContextAdapter.jsx
import React, { createContext, useContext } from 'react';
import { useAuthIntegration } from '../hooks/useAuthIntegration';

// Context originale che i componenti esistenti si aspettano
const AppContext = createContext();

// Provider che adatta il nuovo sistema al vecchio formato
export const ContextAdapter = ({ children }) => {
  const authIntegration = useAuthIntegration();

  // Adatta la struttura dati al formato che si aspettano i componenti esistenti
  const adaptedValue = {
    // Stato dell'app nel formato originale
    data: {
      isAuthenticated: authIntegration.isAuthenticated,
      currentView: authIntegration.data.currentView || 'overview',
      lists: authIntegration.data.lists || [],
      selectedList: authIntegration.data.selectedList,
      user: authIntegration.user || { name: 'Guest User' },
      error: authIntegration.data.error,
      isLoading: authIntegration.data.isLoading,
      theme: authIntegration.data.theme || 'light',
      soundEnabled: authIntegration.data.soundEnabled !== undefined ? authIntegration.data.soundEnabled : true,
      showSettings: authIntegration.data.showSettings || false,
      selectedRssSource: authIntegration.data.selectedRssSource || 'techcrunch'
    },

    // Funzioni nel formato originale
    updateData: authIntegration.updateData,
    
    // Funzioni di autenticazione adattate
    login: authIntegration.login,
    register: authIntegration.register,
    logout: authIntegration.logout,

    // API functions nel formato che si aspettano i componenti
    createList: authIntegration.api.createList,
    updateList: authIntegration.api.updateList,
    deleteList: authIntegration.api.deleteList,
    createTask: authIntegration.api.createTask,
    updateTask: authIntegration.api.updateTask,
    deleteTask: authIntegration.api.deleteTask,
    toggleTask: authIntegration.api.toggleTask,

    // Funzioni di navigazione
    setCurrentView: (view) => authIntegration.updateData({ currentView: view }),
    setSelectedList: (list) => authIntegration.updateData({ selectedList: list }),
    
    // Funzioni per le impostazioni
    toggleTheme: () => {
      const newTheme = authIntegration.data.theme === 'light' ? 'dark' : 'light';
      authIntegration.updateData({ theme: newTheme });
    },
    
    toggleSound: () => {
      authIntegration.updateData({ soundEnabled: !authIntegration.data.soundEnabled });
    },
    
    toggleSettings: () => {
      authIntegration.updateData({ showSettings: !authIntegration.data.showSettings });
    },

    setRssSource: (source) => {
      authIntegration.updateData({ selectedRssSource: source });
    },

    // Funzione per pulire errori
    clearError: () => {
      authIntegration.updateData({ error: null });
    }
  };

  return (
    <AppContext.Provider value={adaptedValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook per usare il context adattato
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within a ContextAdapter');
  }
  return context;
};

export default AppContext;