// src/hooks/useRealAuth.js
import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const useRealAuth = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
    error: null
  });

  // 🔧 FIX: Ref per evitare verifiche multiple simultanee
  const isVerifying = useRef(false);
  const lastVerifyTime = useRef(0);
  const verifyInterval = useRef(null);

  // 🔧 FIX: Verifica token solo se sono passati almeno 5 minuti
  const VERIFY_COOLDOWN = 5 * 60 * 1000; // 5 minuti
  const VERIFY_INTERVAL = 10 * 60 * 1000; // 10 minuti

  // Verifica autenticazione al caricamento
  useEffect(() => {
    checkAuthOnLoad();

    // 🔧 FIX: Setup verifiche periodiche meno frequenti
    const setupPeriodicVerification = () => {
      // Cancella eventuale interval esistente
      if (verifyInterval.current) {
        clearInterval(verifyInterval.current);
      }

      // Setup nuovo interval solo se autenticato
      if (authState.isAuthenticated) {
        verifyInterval.current = setInterval(() => {
          const now = Date.now();
          if (now - lastVerifyTime.current > VERIFY_COOLDOWN) {
            console.log('🔍 Periodic token verification...');
            verifyTokenWithServer();
          }
        }, VERIFY_INTERVAL);
      }
    };

    setupPeriodicVerification();

    // Cleanup
    return () => {
      if (verifyInterval.current) {
        clearInterval(verifyInterval.current);
      }
    };
  }, [authState.isAuthenticated]);

  const checkAuthOnLoad = async () => {
    console.log('🔍 Checking authentication on load...');
    
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        console.log('❌ No stored auth data found');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const user = JSON.parse(userStr);
      
      // 🔧 FIX: Prima imposta stato locale, poi verifica con server
      setAuthState({
        isAuthenticated: true,
        user,
        token,
        isLoading: false,
        error: null
      });

      console.log('✅ Local auth restored, will verify with server periodically');
      
      // Verifica con server dopo un breve delay per evitare chiamate immediate
      setTimeout(() => {
        verifyTokenWithServer();
      }, 2000);

    } catch (error) {
      console.error('❌ Auth check error:', error);
      clearAuth();
    }
  };

  // 🔧 FIX: Metodo separato per verifica token con server
  const verifyTokenWithServer = async () => {
    // Evita verifiche multiple simultanee
    if (isVerifying.current) {
      console.log('⏳ Token verification already in progress, skipping...');
      return;
    }

    const now = Date.now();
    if (now - lastVerifyTime.current < VERIFY_COOLDOWN) {
      console.log('⏳ Token verification on cooldown, skipping...');
      return;
    }

    isVerifying.current = true;
    lastVerifyTime.current = now;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        clearAuth();
        return;
      }

      console.log('🔍 Verifying token with server...');

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Token verified successfully');
        
        // Aggiorna dati utente se necessario
        setAuthState(prev => ({
          ...prev,
          user: data.user,
          error: null
        }));
      } else {
        console.log('❌ Token verification failed, status:', response.status);
        
        if (response.status === 401) {
          // Token scaduto o invalido
          clearAuth();
        } else if (response.status === 429) {
          // Rate limit - non fare nulla, riprova più tardi
          console.log('⚠️ Rate limit hit, will retry later');
        }
      }
    } catch (error) {
      console.error('❌ Token verification error:', error);
      
      // Solo se è un errore di rete critico, clear auth
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.log('🌐 Network error during verification, keeping local auth');
        // Non clear auth per errori di rete temporanei
      }
    } finally {
      isVerifying.current = false;
    }
  };

  const login = async (credentials) => {
    console.log('🔐 Attempting login...');
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Login successful');
        
        // Salva dati di autenticazione
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setAuthState({
          isAuthenticated: true,
          user: data.user,
          token: data.token,
          isLoading: false,
          error: null
        });

        return { success: true, user: data.user };
      } else {
        console.log('❌ Login failed:', data.error);
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: data.error || 'Errore durante il login' 
        }));
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Errore di connessione' 
      }));
      return { success: false, error: 'Errore di connessione' };
    }
  };

  const register = async (userData) => {
    console.log('📝 Attempting registration...');
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Registration successful');
        
        // Salva dati di autenticazione
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setAuthState({
          isAuthenticated: true,
          user: data.user,
          token: data.token,
          isLoading: false,
          error: null
        });

        return { success: true, user: data.user };
      } else {
        console.log('❌ Registration failed:', data.error);
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: data.error || 'Errore durante la registrazione' 
        }));
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Errore di connessione' 
      }));
      return { success: false, error: 'Errore di connessione' };
    }
  };

  const logout = async () => {
    console.log('🚪 Logging out...');

    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Notifica il server del logout
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('❌ Logout request error:', error);
      // Continua con il logout locale anche se il server non risponde
    }

    clearAuth();
    return { success: true };
  };

  const clearAuth = () => {
    console.log('🧹 Clearing authentication...');
    
    // Cancella interval di verifica
    if (verifyInterval.current) {
      clearInterval(verifyInterval.current);
      verifyInterval.current = null;
    }

    // Rimuovi dati locali
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset stato
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null
    });
    
    // Reset refs
    isVerifying.current = false;
    lastVerifyTime.current = 0;
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    ...authState,
    login,
    register,
    logout,
    clearError,
    // 🔧 FIX: Esponi metodo per verifica manuale (opzionale)
    verifyToken: verifyTokenWithServer
  };
};