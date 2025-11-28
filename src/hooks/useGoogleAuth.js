import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Configura axios per inviare cookie
axios.defaults.withCredentials = true;

const BACKEND_URL = 'http://localhost:5001/api';

export const useGoogleAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  // Funzione per ottenere il token dal backend
  const fetchToken = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/auth/google/token`);
      if (res.data.isAuthenticated && res.data.accessToken) {
        setIsAuthenticated(true);
        setUser(res.data.user);
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      }
    } catch (error) {
      // 401 è normale se non loggato
      if (error.response?.status !== 401) {
        console.error('Auth check error:', error);
      }
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  // Init al mount
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Login: Redirect al backend
  const login = () => {
    window.location.href = `${BACKEND_URL}/auth/google/login`;
  };

  // Logout
  const logout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/auth/google/logout`);
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);

      // Pulisci anche GAPI se presente
      if (window.gapi?.client) {
        window.gapi.client.setToken(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    isAuthenticated,
    user,
    loading,
    accessToken,
    login,
    logout,
    fetchToken // Esposto per forzare refresh se necessario
  };
};