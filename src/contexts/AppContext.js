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

  // Function to clear error
  const clearError = () => {
    console.log('🧹 AppContext clearError called');
    authIntegration.updateData({ error: null });
  };

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
    
    // Clear error function
    clearError,
    
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

    // ✅ FIX: createTask con combinazione corretta dei parametri
    createTask: async (listId, taskData) => {
      console.log('📝 AppContext createTask called:', listId, taskData);
      
      // Combina listId con taskData prima di passare all'authIntegration
      const combinedTaskData = {
        listId: parseInt(listId), // Assicurati che sia un numero
        title: taskData.title,
        details: taskData.details || '',
        priority: taskData.priority || 'medium'
      };
      
      // Aggiungi reminder solo se presente e valido
      if (taskData.reminder && taskData.reminder !== null && taskData.reminder !== '') {
        combinedTaskData.reminder = taskData.reminder;
      }
      
      // Aggiungi dueDate solo se presente e valido
      if (taskData.dueDate && taskData.dueDate !== null && taskData.dueDate !== '') {
        combinedTaskData.dueDate = taskData.dueDate;
      }
      
      console.log('📤 AppContext sending combined data:', combinedTaskData);
      
      // Ora chiama l'authIntegration con i dati combinati
      return authIntegration.api?.createTask ? 
        authIntegration.api.createTask(combinedTaskData) : 
        Promise.resolve({ success: false, error: 'createTask not available' });
    },

    // 🔧 FIX: Metodo per caricare i task di una lista specifica
    loadTasksForList: async (listId) => {
      console.log('📋 AppContext loadTasksForList called:', listId);
      
      if (!listId) {
        console.warn('⚠️ loadTasksForList called without listId');
        return { success: false, error: 'listId richiesto' };
      }

      try {
        if (authIntegration.loadListWithTasks) {
          await authIntegration.loadListWithTasks(listId);
          return { success: true };
        } else {
          console.warn('⚠️ loadListWithTasks not available, falling back to loadUserData');
          await authIntegration.loadUserData();
          return { success: true };
        }
      } catch (error) {
        console.error('❌ Error in loadTasksForList:', error);
        return { success: false, error: error.message };
      }
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

    updateTask: (taskId, taskData) => {
      console.log('✏️ AppContext updateTask called:', taskId, taskData);
      return authIntegration.api?.updateTask ? authIntegration.api.updateTask(taskId, taskData) : Promise.resolve({ success: false });
    },

    deleteTask: (taskId) => {
      console.log('🗑️ AppContext deleteTask called:', taskId);
      return authIntegration.api?.deleteTask ? authIntegration.api.deleteTask(taskId) : Promise.resolve({ success: false });
    },

    toggleTask: (taskId) => {
      console.log('🔄 AppContext toggleTask called:', taskId);
      return authIntegration.api?.toggleTask ? authIntegration.api.toggleTask(taskId) : Promise.resolve({ success: false });
    },

    // Funzioni di navigazione e UI
    setCurrentView: (view) => {
      console.log('🔀 AppContext setCurrentView called:', view);
      return authIntegration.updateData ? authIntegration.updateData({ currentView: view }) : Promise.resolve();
    },

    setSelectedList: (list) => {
      console.log('📋 AppContext setSelectedList called:', list?.id || 'null');
      return authIntegration.updateData ? authIntegration.updateData({ selectedList: list }) : Promise.resolve();
    },
    
    // Funzioni per le impostazioni
    toggleTheme: () => {
      console.log('🎨 AppContext toggleTheme called');
      const currentTheme = authIntegration.data?.theme || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      return authIntegration.updateData ? authIntegration.updateData({ theme: newTheme }) : Promise.resolve();
    },

    toggleSound: () => {
      console.log('🔊 AppContext toggleSound called');
      const currentSound = authIntegration.data?.soundEnabled !== undefined ? authIntegration.data.soundEnabled : true;
      return authIntegration.updateData ? authIntegration.updateData({ soundEnabled: !currentSound }) : Promise.resolve();
    },

    setRssSource: (source) => {
      console.log('📰 AppContext setRssSource called:', source);
      return authIntegration.updateData ? authIntegration.updateData({ selectedRssSource: source }) : Promise.resolve();
    },

    // Stats functions
    getDashboardStats: () => {
      console.log('📊 AppContext getDashboardStats called');
      return authIntegration.api?.getDashboardStats ? authIntegration.api.getDashboardStats() : Promise.resolve(null);
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook per usare il context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext deve essere usato all\'interno di AppContextProvider');
  }
  return context;
};

// Export default del context per retrocompatibilità
export default AppContext;