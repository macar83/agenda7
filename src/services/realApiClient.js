// src/services/realApiClient.js
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api');

class RealApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Ottieni headers con token di autenticazione
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Metodo generico per fare richieste
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Se il token è scaduto/invalido, redirect al login
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.reload();
          return;
        }

        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ API Response: ${endpoint}`, data);
      return data;

    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // ========== AUTH ENDPOINTS ==========

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST'
    });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  // ========== USER ENDPOINTS ==========

  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  // ========== LISTS ENDPOINTS ==========

  async getLists() {
    return this.request('/lists');
  }

  // 🔧 FIX: Metodo per ottenere lista singola con task
  async getListWithTasks(listId) {
    return this.request(`/lists/${listId}`);
  }

  async createList(listData) {
    return this.request('/lists', {
      method: 'POST',
      body: JSON.stringify(listData)
    });
  }

  async updateList(listId, listData) {
    return this.request(`/lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify(listData)
    });
  }

  async deleteList(listId) {
    return this.request(`/lists/${listId}`, {
      method: 'DELETE'
    });
  }

  // ========== TASKS ENDPOINTS ==========

  // 🔧 FIX: createTask con validazione completa
  async createTask(taskData) {
    console.log('🔍 realApiClient.createTask called with:', taskData);

    // Verifica che tutti i dati necessari siano presenti
    if (!taskData.listId) {
      throw new Error('listId è richiesto per creare un task');
    }

    if (!taskData.title || taskData.title.trim() === '') {
      throw new Error('title è richiesto per creare un task');
    }

    const payload = {
      listId: parseInt(taskData.listId),
      title: taskData.title.trim(),
      details: taskData.details || '',
      priority: taskData.priority || 'medium'
    };

    // Aggiungi solo se presenti e validi
    if (taskData.reminder && taskData.reminder !== null) {
      payload.reminder = taskData.reminder;
    }

    if (taskData.dueDate && taskData.dueDate !== null) {
      payload.dueDate = taskData.dueDate;
    }

    console.log('📤 Sending task payload:', payload);

    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getTask(taskId) {
    return this.request(`/tasks/${taskId}`);
  }

  // ✅ FIX: updateTask con validazione completa
  async updateTask(taskId, taskData) {
    console.log('🔍 realApiClient.updateTask called with:', { taskId, taskData });

    // Validazione taskId
    if (!taskId || isNaN(parseInt(taskId))) {
      throw new Error('taskId deve essere un numero valido');
    }

    // Validazione taskData
    if (!taskData || typeof taskData !== 'object') {
      throw new Error('taskData deve essere un oggetto valido');
    }

    // Pulisci i dati - rimuovi proprietà undefined/null/vuote
    const cleanTaskData = {};

    if (taskData.title !== undefined && taskData.title !== null) {
      cleanTaskData.title = String(taskData.title).trim();
    }

    if (taskData.details !== undefined) {
      cleanTaskData.details = taskData.details ? String(taskData.details).trim() : '';
    }

    if (taskData.priority !== undefined && taskData.priority !== null) {
      cleanTaskData.priority = taskData.priority;
    }

    if (taskData.completed !== undefined && taskData.completed !== null) {
      cleanTaskData.completed = Boolean(taskData.completed);
    }

    if (taskData.reminder !== undefined && taskData.reminder !== null && taskData.reminder !== '') {
      cleanTaskData.reminder = taskData.reminder;
    }

    if (taskData.dueDate !== undefined && taskData.dueDate !== null && taskData.dueDate !== '') {
      cleanTaskData.dueDate = taskData.dueDate;
    }

    if (taskData.listId !== undefined && taskData.listId !== null) {
      cleanTaskData.listId = parseInt(taskData.listId);
    }

    console.log('📤 realApiClient.updateTask sending clean data:', cleanTaskData);

    // Verifica che abbiamo almeno un campo da aggiornare
    if (Object.keys(cleanTaskData).length === 0) {
      throw new Error('Nessun dato valido da aggiornare');
    }

    return this.request(`/tasks/${parseInt(taskId)}`, {
      method: 'PUT',
      body: JSON.stringify(cleanTaskData)
    });
  }

  async deleteTask(taskId) {
    console.log('🔍 realApiClient.deleteTask called with taskId:', taskId);

    // Validazione taskId
    if (!taskId || isNaN(parseInt(taskId))) {
      throw new Error('taskId deve essere un numero valido per delete');
    }

    console.log('📤 realApiClient.deleteTask sending DELETE to:', `/tasks/${parseInt(taskId)}`);

    return this.request(`/tasks/${parseInt(taskId)}`, {
      method: 'DELETE'
    });
  }

  // ✅ FIX: toggleTaskCompletion - corretto senza body
  async toggleTaskCompletion(taskId) {
    console.log('🔍 realApiClient.toggleTaskCompletion called with taskId:', taskId);

    // Validazione taskId
    if (!taskId || isNaN(parseInt(taskId))) {
      throw new Error('taskId deve essere un numero valido per toggle');
    }

    console.log('📤 realApiClient.toggleTaskCompletion sending PATCH to:', `/tasks/${parseInt(taskId)}/toggle`);

    // PATCH non deve avere body per toggle
    return this.request(`/tasks/${parseInt(taskId)}/toggle`, {
      method: 'PATCH'
      // NON aggiungere body qui!
    });
  }

  async reorderTasks(taskIds) {
    return this.request('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ taskIds })
    });
  }

  async getUpcomingTasks(days = 7) {
    return this.request(`/tasks/upcoming?days=${days}`);
  }

  // ========== SETTINGS ENDPOINTS ==========

  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // ========== STATS ENDPOINTS ==========

  async getDashboardStats() {
    return this.request('/stats/dashboard');
  }

  async getProductivityStats(period = 'week') {
    return this.request(`/stats/productivity?period=${period}`);
  }

  async getTaskTrends(days = 30) {
    return this.request(`/stats/trends?days=${days}`);
  }

  // ========== UTILITY METHODS ==========

  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      return await response.json();
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return { status: 'ERROR', error: error.message };
    }
  }

  // Ottieni informazioni utente corrente dal localStorage
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  }

  // Verifica se l'utente è autenticato
  isAuthenticated() {
    const token = localStorage.getItem('token');
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Pulisci dati di autenticazione
  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

// Crea un'istanza singleton
export const realApiClient = new RealApiClient();
export default realApiClient;