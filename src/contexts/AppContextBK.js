// src/contexts/AppContext.js
// QUESTO FILE SOSTITUISCE COMPLETAMENTE IL PRECEDENTE AppContext.js
import React, { createContext, useContext } from 'react';
import { useAuthIntegration } from '../hooks/useAuthIntegration';

// Context che i componenti esistenti si aspettano
const AppContext = createContext();

// Provider che integra il nuovo sistema di autenticazione
// mantenendo la stessa API che usano i componenti esistenti
export const AppContextProvider = ({ children }) => {
  const authIntegration = useAuthIntegration();

  // Verifica che authIntegration sia disponibile
  if (!authIntegration) {
    console.error('❌ AuthIntegration not available in AppContext');
    return null;
  }

  // Adatta la struttura dati al formato che si aspettano i componenti esistenti
  const contextValue = {
    // Stato dell'app nel formato originale
    data: {
      isAuthenticated: authIntegration.isAuthenticated || false,
      currentView: authIntegration.data?.currentView || 'overview',
      lists: authIntegration.data?.lists || [],
      selectedList: authIntegration.data?.selectedList || null,
      user: authIntegration.user || { name: 'Guest User' },
      error: authIntegration.data?.error || null,
      isLoading: authIntegration.data?.isLoading || false,
      theme: authIntegration.data?.theme || 'light',
      soundEnabled: authIntegration.data?.soundEnabled !== undefined ? authIntegration.data.soundEnabled : true,
      showSettings: authIntegration.data?.showSettings || false,
      selectedRssSource: authIntegration.data?.selectedRssSource || 'techcrunch'
    },

    // Funzioni nel formato originale che i componenti esistenti si aspettano
    updateData: (updates) => {
      console.log('📊 AppContext updateData called:', updates);
      return authIntegration.updateData ? authIntegration.updateData(updates) : Promise.resolve();
    },
    
    // Funzioni di autenticazione
    login: (credentials) => {
      console.log('🔐 AppContext login called');
      return authIntegration.login ? authIntegration.login(credentials) : Promise.resolve({ success: false });
    },
    
    register: (userData) => {
      console.log('📝 AppContext register called');
      return authIntegration.register ? authIntegration.register(userData) : Promise.resolve({ success: false });
    },
    
    logout: () => {
      console.log('🚪 AppContext logout called');
      return authIntegration.logout ? authIntegration.logout() : Promise.resolve({ success: true });
    },

    // API functions che i componenti esistenti potrebbero usare
    createList: (listData) => {
      console.log('📝 AppContext createList called:', listData);
      return authIntegration.api?.createList ? authIntegration.api.createList(listData) : Promise.resolve({ success: false });
    },

    updateList: (listId, listData) => {
      console.log('✏️ AppContext updateList called:', listId, listData);
      return authIntegration.api?.updateList ? authIntegration.api.updateList(listId, listData) : Promise.resolve({ success: false });
    },

    deleteList: (listId) => {
      console.log('🗑️ AppContext deleteList called:', listId);
      return authIntegration.api?.deleteList ? authIntegration.api.deleteList(listId) : Promise.resolve({ success: false });
    },

    createTask: (taskData) => {
      console.log('📝 AppContext createTask called:', taskData);
      return authIntegration.api?.createTask ? authIntegration.api.createTask(taskData) : Promise.resolve({ success: false });
    },

    updateTask: (taskId, taskData) => {
      console.log('✏️ AppContext updateTask called:', taskId, taskData);
      return authIntegration.api?.updateTask ? authIntegration.api.updateTask(taskId, taskData) : Promise.resolve({ success: false });
    },

    deleteTask: (taskId) => {
      console.log('🗑️ AppContext deleteTask called:', taskId);
      return authIntegration.api?.deleteTask ? authIntegration.api.deleteTask(taskId) : Promise.resolve({ success: false });
    },

    toggleTask: (taskId) => {
      console.log('✅ AppContext toggleTask called:', taskId);
      return authIntegration.api?.toggleTask ? authIntegration.api.toggleTask(taskId) : Promise.resolve({ success: false });
    },

    // Funzioni specifiche per i task che alcuni componenti potrebbero usare
    loadTasksForList: async (listId) => {
      console.log('📋 AppContext loadTasksForList called:', listId);
      // Questa funzione può essere implementata se necessaria
      return [];
    },

    // Funzioni per i commenti (se usate dai componenti)
    addComment: async (listId, taskId, comment) => {
      console.log('💬 AppContext addComment called:', listId, taskId, comment);
      // Implementa se necessario
      return { success: false };
    },

    deleteComment: async (commentId) => {
      console.log('🗑️ AppContext deleteComment called:', commentId);
      // Implementa se necessario
      return { success: false };
    },

    // Funzioni di navigazione/UI che potrebbero essere usate
    setCurrentView: (view) => {
      console.log('🔘 AppContext setCurrentView called:', view);
      return authIntegration.updateData ? authIntegration.updateData({ currentView: view }) : Promise.resolve();
    },
    
    setSelectedList: (list) => {
      console.log('📋 AppContext setSelectedList called:', list);
      return authIntegration.updateData ? authIntegration.updateData({ selectedList: list }) : Promise.resolve();
    },
    
    // Funzioni per le impostazioni
    toggleTheme: () => {
      console.log('🎨 AppContext toggleTheme called');
      const newTheme = (authIntegration.data?.theme || 'light') === 'light' ? 'dark' : 'light';
      return authIntegration.updateData ? authIntegration.updateData({ theme: newTheme }) : Promise.resolve();
    },
    
    toggleSound: () => {
      console.log('🔊 AppContext toggleSound called');
      const currentSound = authIntegration.data?.soundEnabled !== undefined ? authIntegration.data.soundEnabled : true;
      return authIntegration.updateData ? authIntegration.updateData({ soundEnabled: !currentSound }) : Promise.resolve();
    },
    
    toggleSettings: () => {
      console.log('⚙️ AppContext toggleSettings called');
      const currentShow = authIntegration.data?.showSettings || false;
      return authIntegration.updateData ? authIntegration.updateData({ showSettings: !currentShow }) : Promise.resolve();
    },

    setRssSource: (source) => {
      console.log('📰 AppContext setRssSource called:', source);
      return authIntegration.updateData ? authIntegration.updateData({ selectedRssSource: source }) : Promise.resolve();
    },

    // Funzione per pulire errori
    clearError: () => {
      console.log('🧹 AppContext clearError called');
      return authIntegration.updateData ? authIntegration.updateData({ error: null }) : Promise.resolve();
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook per usare il context (mantiene compatibilità)
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

// Export di default del context (per compatibilità con import esistenti)
export default AppContext;