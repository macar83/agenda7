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

  // 🔧 FIX: Metodo migliorato per ricaricare lista specifica con task
  const loadListWithTasks = async (listId) => {
    if (!listId) {
      console.warn('⚠️ loadListWithTasks called without listId');
      return;
    }

    console.log('📋 Loading list with tasks:', listId);
    
    try {
      const listData = await realApiClient.getListWithTasks(listId);
      
      console.log('📥 Received list data from API:', {
        listId: listData.list?.id,
        tasksCount: listData.list?.tasks?.length || 0,
        listName: listData.list?.name
      });
      
      // 🔧 FIX: Aggiorna sia l'array lists che selectedList con dati completi
      setAppData(prev => {
        const updatedLists = prev.lists.map(list => 
          list.id === parseInt(listId) 
            ? { 
                ...list,
                ...listData.list, 
                tasks: listData.list.tasks || [],
                totalTasks: listData.list.totalTasks || (listData.list.tasks || []).length,
                incompleteTasks: listData.list.incompleteTasks || (listData.list.tasks || []).filter(t => !t.completed).length
              }
            : list
        );

        // 🔧 FIX: Se è la lista selezionata, aggiornala SEMPRE
        const updatedSelectedList = prev.selectedList && prev.selectedList.id === parseInt(listId) 
          ? { 
              ...prev.selectedList,
              ...listData.list, 
              tasks: listData.list.tasks || [],
              totalTasks: listData.list.totalTasks || (listData.list.tasks || []).length,
              incompleteTasks: listData.list.incompleteTasks || (listData.list.tasks || []).filter(t => !t.completed).length
            }
          : prev.selectedList;

        console.log('🔄 UI State updated:', {
          listsUpdated: updatedLists.find(l => l.id === parseInt(listId))?.tasks?.length || 0,
          selectedListUpdated: updatedSelectedList?.tasks?.length || 0,
          selectedListId: updatedSelectedList?.id,
          isSelectedListMatching: prev.selectedList?.id === parseInt(listId)
        });

        return {
          ...prev,
          lists: updatedLists,
          selectedList: updatedSelectedList
        };
      });

      console.log('✅ List with tasks loaded successfully for ID:', listId);
      
    } catch (error) {
      console.error('❌ Error loading list with tasks:', error);
      setAppData(prev => ({
        ...prev,
        error: `Errore caricamento lista: ${error.message}`
      }));
    }
  };

  const updateAppData = (updates) => {
    console.log('📊 Updating app data:', updates);
    setAppData(prev => ({ ...prev, ...updates }));
    
    // Se vengono aggiornate le impostazioni, salva nel backend
    const settingsKeys = ['theme', 'soundEnabled', 'selectedRssSource'];
    const settingsUpdates = {};
    let hasSettingsUpdates = false;
    
    settingsKeys.forEach(key => {
      if (updates.hasOwnProperty(key)) {
        settingsUpdates[key] = updates[key];
        hasSettingsUpdates = true;
      }
    });
    
    if (hasSettingsUpdates && isAuthenticated) {
      console.log('💾 Saving settings to backend:', settingsUpdates);
      try {
        realApiClient.updateSettings(settingsUpdates);
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
        console.log('🔍 DEBUG createTask - Input received:', taskData);
        console.log('🔍 DEBUG createTask - Type:', typeof taskData);
        console.log('🔍 DEBUG createTask - Keys:', Object.keys(taskData || {}));
        
        // Verifica che taskData abbia listId
        if (!taskData.listId) {
          console.error('❌ ERROR: listId missing in taskData!');
          console.error('❌ Received taskData:', taskData);
          throw new Error('listId è richiesto nel taskData');
        }
        
        setAppData(prev => ({ ...prev, isLoading: true }));
        
        // Passa il taskData completo al realApiClient
        console.log('📤 Calling realApiClient.createTask with:', taskData);
        const response = await realApiClient.createTask(taskData);
        
        console.log('📥 Response from realApiClient:', response);
        
        // 🔧 FIX: Invece di ricaricare tutto, ricarica solo la lista interessata
        if (taskData.listId) {
          console.log('🔄 Reloading list with tasks for listId:', taskData.listId);
          await loadListWithTasks(taskData.listId);
        } else {
          // Fallback: ricarica tutto se non abbiamo il listId
          await loadUserData();
        }
        
        setAppData(prev => ({ ...prev, isLoading: false }));
        
        return { success: true, data: response };
      } catch (error) {
        console.error('❌ Error in createTask:', error);
        setAppData(prev => ({ 
          ...prev, 
          isLoading: false,
          error: `Errore creazione task: ${error.message}` 
        }));
        return { success: false, error: error.message };
      }
    },

    // ✅ FIX: updateTask con aggiornamento UI immediato
    async updateTask(taskId, taskData) {
      try {
        console.log('🔍 DEBUG updateTask - Input received:', { taskId, taskData });
        
        // Validazione input
        if (!taskId || isNaN(parseInt(taskId))) {
          throw new Error('taskId non valido per updateTask');
        }
        
        if (!taskData || typeof taskData !== 'object') {
          throw new Error('taskData deve essere un oggetto per updateTask');
        }
        
        setAppData(prev => ({ ...prev, isLoading: true, error: null }));
        
        // 🔧 FIX: Aggiorna UI immediatamente in modo ottimistico
        const optimisticUpdate = () => {
          setAppData(prev => {
            const updateTaskInArray = (tasks) => 
              tasks.map(task => 
                task.id === parseInt(taskId) 
                  ? { ...task, ...taskData, updatedAt: new Date().toISOString() }
                  : task
              );

            const updatedLists = prev.lists.map(list => ({
              ...list,
              tasks: list.tasks ? updateTaskInArray(list.tasks) : []
            }));

            const updatedSelectedList = prev.selectedList
              ? {
                  ...prev.selectedList,
                  tasks: prev.selectedList.tasks ? updateTaskInArray(prev.selectedList.tasks) : []
                }
              : prev.selectedList;

            console.log('🎯 Optimistic UI update applied');
            
            return {
              ...prev,
              lists: updatedLists,
              selectedList: updatedSelectedList
            };
          });
        };

        // Applica aggiornamento ottimistico
        optimisticUpdate();
        
        // Chiama l'API
        console.log('📤 Calling realApiClient.updateTask with:', { taskId, taskData });
        const response = await realApiClient.updateTask(taskId, taskData);
        console.log('📥 updateTask response:', response);
        
        // 🔧 FIX: Ricarica solo se taskData contiene listId, altrimenti usa selectedList
        const listIdToReload = taskData.listId || appData.selectedList?.id;
        
        if (listIdToReload) {
          console.log('🔄 Reloading list with tasks for listId:', listIdToReload);
          
          // Ricarica la lista dal server per avere dati freschi
          try {
            const listData = await realApiClient.getListWithTasks(listIdToReload);
            
            setAppData(prev => {
              const updatedLists = prev.lists.map(list => 
                list.id === parseInt(listIdToReload) 
                  ? { 
                      ...list,
                      ...listData.list, 
                      tasks: listData.list.tasks || [],
                      totalTasks: listData.list.totalTasks || (listData.list.tasks || []).length,
                      incompleteTasks: listData.list.incompleteTasks || (listData.list.tasks || []).filter(t => !t.completed).length
                    }
                  : list
              );

              const updatedSelectedList = prev.selectedList && prev.selectedList.id === parseInt(listIdToReload) 
                ? { 
                    ...prev.selectedList,
                    ...listData.list, 
                    tasks: listData.list.tasks || [],
                    totalTasks: listData.list.totalTasks || (listData.list.tasks || []).length,
                    incompleteTasks: listData.list.incompleteTasks || (listData.list.tasks || []).filter(t => !t.completed).length
                  }
                : prev.selectedList;

              console.log('✅ Server data reloaded and UI updated');

              return {
                ...prev,
                lists: updatedLists,
                selectedList: updatedSelectedList,
                isLoading: false
              };
            });
            
          } catch (reloadError) {
            console.error('❌ Error reloading list after update:', reloadError);
            // Mantieni l'aggiornamento ottimistico se il reload fallisce
            setAppData(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          console.log('🔄 Fallback: reloading all data');
          await loadUserData();
        }
        
        return { success: true, data: response };
      } catch (error) {
        console.error('❌ Error in updateTask:', error);
        
        // 🔧 FIX: In caso di errore, ripristina stato precedente
        setAppData(prev => ({ 
          ...prev, 
          isLoading: false,
          error: `Errore aggiornamento task: ${error.message}` 
        }));
        
        // Ricarica dati dal server per annullare l'aggiornamento ottimistico
        const listIdToReload = taskData.listId || appData.selectedList?.id;
        if (listIdToReload) {
          try {
            await loadListWithTasks(listIdToReload);
          } catch (reloadError) {
            console.error('❌ Error reloading after failed update:', reloadError);
          }
        }
        
        return { success: false, error: error.message };
      }
    },

    async deleteTask(taskId) {
      try {
        console.log('🔍 DEBUG deleteTask - Input received:', { taskId });
        
        // Validazione input
        if (!taskId || isNaN(parseInt(taskId))) {
          throw new Error('taskId non valido per deleteTask');
        }
        
        setAppData(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Trova la lista del task prima di eliminarlo
        const currentLists = appData.lists || [];
        let taskListId = null;
        
        for (const list of currentLists) {
          if (list.tasks && list.tasks.some(task => task.id === parseInt(taskId))) {
            taskListId = list.id;
            break;
          }
        }
        
        // Chiama l'API
        console.log('📤 Calling realApiClient.deleteTask with taskId:', taskId);
        const response = await realApiClient.deleteTask(taskId);
        console.log('📥 deleteTask response:', response);
        
        // Ricarica la lista appropriata
        if (taskListId) {
          console.log('🔄 Reloading list', taskListId, 'after task deletion');
          await loadListWithTasks(taskListId);
        } else {
          console.log('🔄 Could not find task list, reloading all data');
          await loadUserData();
        }
        
        setAppData(prev => ({ ...prev, isLoading: false }));
        
        return { success: true, data: response };
      } catch (error) {
        console.error('❌ Error in deleteTask:', error);
        setAppData(prev => ({ 
          ...prev, 
          isLoading: false,
          error: `Errore eliminazione task: ${error.message}` 
        }));
        return { success: false, error: error.message };
      }
    },

    // ✅ FIX: toggleTask con reload ottimizzato
    async toggleTask(taskId) {
      try {
        console.log('🔍 DEBUG toggleTask - Input received:', { taskId });
        
        // Validazione input
        if (!taskId || isNaN(parseInt(taskId))) {
          throw new Error('taskId non valido per toggleTask');
        }
        
        setAppData(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Chiama l'API
        console.log('📤 Calling realApiClient.toggleTaskCompletion with taskId:', taskId);
        const response = await realApiClient.toggleTaskCompletion(taskId);
        console.log('📥 toggleTask response:', response);
        
        // 🔧 FIX: Trova la lista del task e ricaricala
        const currentLists = appData.lists || [];
        let taskListId = null;
        
        // Cerca il task nelle liste correnti per trovare la sua lista
        for (const list of currentLists) {
          if (list.tasks && list.tasks.some(task => task.id === parseInt(taskId))) {
            taskListId = list.id;
            break;
          }
        }
        
        if (taskListId) {
          console.log('🔄 Found task in list', taskListId, ', reloading list with tasks');
          await loadListWithTasks(taskListId);
        } else {
          console.log('🔄 Could not find task list, reloading all data');
          await loadUserData();
        }
        
        setAppData(prev => ({ ...prev, isLoading: false }));
        
        return { success: true, data: response };
      } catch (error) {
        console.error('❌ Error in toggleTask:', error);
        setAppData(prev => ({ 
          ...prev, 
          isLoading: false,
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
    loadListWithTasks, // 🔧 FIX: Esponi il nuovo metodo
    
    // API functions
    api
  };
};