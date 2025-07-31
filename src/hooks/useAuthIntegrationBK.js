// src/hooks/useAuthIntegration.js
import { useState, useEffect } from 'react';
import { useRealAuthContext } from '../contexts/RealAuthContext';
import { realApiClient } from '../services/realApiClient';

/**
 * Hook che integra l'autenticazione reale con il sistema esistente
 * Questo hook fa da ponte tra il nuovo sistema di auth e il sistema esistente
 */
export const useAuthIntegration = () => {
  const { isAuthenticated, user, token, login, register, logout } = useRealAuthContext();
  const [appData, setAppData] = useState({
    lists: [],
    selectedList: null,
    error: null,
    isLoading: false,
    theme: 'light',
    soundEnabled: true,
    showSettings: false,
    selectedRssSource: 'techcrunch',
    currentView: 'overview'
  });

  // Carica dati iniziali quando l'utente si autentica
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    } else {
      // Reset dati quando l'utente si disconnette
      setAppData(prev => ({
        ...prev,
        lists: [],
        selectedList: null,
        error: null
      }));
    }
  }, [isAuthenticated, user]);

  const loadUserData = async () => {
    console.log('📊 Loading user data after authentication...');
    setAppData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Carica liste
      const listsResponse = await realApiClient.getLists();
      const lists = listsResponse.lists || [];

      // Carica impostazioni utente
      let settings = {};
      try {
        const settingsResponse = await realApiClient.getSettings();
        settings = settingsResponse.settings || {};
      } catch (settingsError) {
        console.warn('⚠️ Could not load user settings:', settingsError);
      }

      setAppData(prev => ({
        ...prev,
        lists,
        theme: settings.theme || prev.theme,
        soundEnabled: settings.soundEnabled !== undefined ? settings.soundEnabled : prev.soundEnabled,
        selectedRssSource: settings.selectedRssSource || prev.selectedRssSource,
        isLoading: false,
        error: null
      }));

      console.log('✅ User data loaded successfully:', {
        listsCount: lists.length,
        settings
      });

    } catch (error) {
      console.error('❌ Error loading user data:', error);
      setAppData(prev => ({
        ...prev,
        isLoading: false,
        error: `Errore caricamento dati: ${error.message}`
      }));
    }
  };

  // Funzione per aggiornare dati dell'app
  const updateAppData = async (updates) => {
    console.log('📊 Updating app data:', updates);

    // Aggiorna stato locale immediatamente
    setAppData(prev => ({ ...prev, ...updates }));

    // Se sono impostazioni che devono essere salvate nel backend
    const persistentSettings = ['theme', 'soundEnabled', 'selectedRssSource'];
    const settingsToSave = {};
    let hasSettingsToSave = false;

    persistentSettings.forEach(key => {
      if (updates.hasOwnProperty(key)) {
        settingsToSave[key] = updates[key];
        hasSettingsToSave = true;
      }
    });

    // Salva le impostazioni nel backend se necessario
    if (hasSettingsToSave && isAuthenticated) {
      try {
        await realApiClient.updateSettings(settingsToSave);
        console.log('✅ Settings saved to backend:', settingsToSave);
      } catch (error) {
        console.error('❌ Error saving settings:', error);
        setAppData(prev => ({
          ...prev,
          error: `Errore salvataggio impostazioni: ${error.message}`
        }));
      }
    }
  };

  // Wrapper per login che integra con il sistema esistente
  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    if (result.success) {
      console.log('✅ Login successful, user data will be loaded automatically');
    }
    return result;
  };

  // Wrapper per register che integra con il sistema esistente
  const handleRegister = async (userData) => {
    const result = await register(userData);
    if (result.success) {
      console.log('✅ Registration successful, user data will be loaded automatically');
    }
    return result;
  };

  // Wrapper per logout che pulisce i dati
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log('✅ Logout successful, app data cleared');
    }
    return result;
  };

  // API functions che utilizzano il client autenticato
  const api = {
    // Lists
    async createList(listData) {
      try {
        setAppData(prev => ({ ...prev, isLoading: true }));
        const response = await realApiClient.createList(listData);
        
        // Ricarica le liste
        await loadUserData();
        
        return { success: true, data: response };
      } catch (error) {
        setAppData(prev => ({ 
          ...prev, 
          isLoading: false,
          error: `Errore creazione lista: ${error.message}` 
        }));
        return { success: false, error: error.message };
      }
    },

    async updateList(listId, listData) {
      try {
        setAppData(prev => ({ ...prev, isLoading: true }));
        const response = await realApiClient.updateList(listId, listData);
        
        // Ricarica le liste
        await loadUserData();
        
        return { success: true, data: response };
      } catch (error) {
        setAppData(prev => ({ 
          ...prev, 
          isLoading: false,
          error: `Errore aggiornamento lista: ${error.message}` 
        }));
        return { success: false, error: error.message };
      }
    },

    async deleteList(listId) {
      try {
        setAppData(prev => ({ ...prev, isLoading: true }));
        await realApiClient.deleteList(listId);
        
        // Ricarica le liste
        await loadUserData();
        
        return { success: true };
      } catch (error) {
        setAppData(prev => ({ 
          ...prev, 
          isLoading: false,
          error: `Errore eliminazione lista: ${error.message}` 
        }));
        return { success: false, error: error.message };
      }
    },

    // Tasks
    async createTask(taskData) {
      try {
        setAppData(prev => ({ ...prev, isLoading: true }));
        const response = await realApiClient.createTask(taskData);
        
        // Ricarica le liste per aggiornare i contatori
        await loadUserData();
        
        return { success: true, data: response };
      } catch (error) {
        setAppData(prev => ({ 
          ...prev, 
          isLoading: false,
          error: `Errore creazione task: ${error.message}` 
        }));
        return { success: false, error: error.message };
      }
    },

    async updateTask(taskId, taskData) {
      try {
        const response = await realApiClient.updateTask(taskId, taskData);
        
        // Ricarica le liste per aggiornare i contatori
        await loadUserData();
        
        return { success: true, data: response };
      } catch (error) {
        setAppData(prev => ({ 
          ...prev,
          error: `Errore aggiornamento task: ${error.message}` 
        }));
        return { success: false, error: error.message };
      }
    },

    async deleteTask(taskId) {
      try {
        await realApiClient.deleteTask(taskId);
        
        // Ricarica le liste per aggiornare i contatori
        await loadUserData();
        
        return { success: true };
      } catch (error) {
        setAppData(prev => ({ 
          ...prev,
          error: `Errore eliminazione task: ${error.message}` 
        }));
        return { success: false, error: error.message };
      }
    },

    async toggleTask(taskId) {
      try {
        const response = await realApiClient.toggleTaskCompletion(taskId);
        
        // Ricarica le liste per aggiornare i contatori
        await loadUserData();
        
        return { success: true, data: response };
      } catch (error) {
        setAppData(prev => ({ 
          ...prev,
          error: `Errore toggle task: ${error.message}` 
        }));
        return { success: false, error: error.message };
      }
    },

    // Stats
    async getDashboardStats() {
      try {
        return await realApiClient.getDashboardStats();
      } catch (error) {
        console.error('❌ Error loading dashboard stats:', error);
        return null;
      }
    }
  };

  return {
    // Stato di autenticazione
    isAuthenticated,
    user,
    token,
    
    // Dati dell'app
    data: appData,
    
    // Funzioni di autenticazione
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    
    // Funzioni dell'app
    updateData: updateAppData,
    loadUserData,
    
    // API functions
    api
  };
};