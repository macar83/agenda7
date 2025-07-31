// src/hooks/useGoogleAuth.js
import { useState, useEffect, useCallback, useRef } from 'react';

// Configurazione Google API
const GOOGLE_CONFIG = {
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
  scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
  discoveryDocs: [
    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
  ]
};

// Chiavi per localStorage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'google_access_token',
  EXPIRES_AT: 'google_expires_at',
  USER_INFO: 'google_user_info',
  SIGN_IN_TIME: 'google_sign_in_time'
};

export const useGoogleAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const authInstanceRef = useRef(null);
  const tokenRefreshIntervalRef = useRef(null);

  // 🔄 FUNZIONE PER SALVARE TOKEN NEL LOCALSTORAGE
  const saveTokenToStorage = useCallback((authResponse, userProfile = null) => {
    try {
      const expiresAt = Date.now() + (authResponse.expires_in * 1000);
      
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authResponse.access_token);
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
      localStorage.setItem(STORAGE_KEYS.SIGN_IN_TIME, Date.now().toString());
      
      if (userProfile) {
        localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userProfile));
      }
      
      console.log('✅ Token salvato in localStorage:', {
        expiresAt: new Date(expiresAt).toLocaleString(),
        expiresIn: authResponse.expires_in
      });
      
    } catch (error) {
      console.error('❌ Errore salvataggio token:', error);
    }
  }, []);

  // 🔄 FUNZIONE PER CARICARE TOKEN DAL LOCALSTORAGE
  const loadTokenFromStorage = useCallback(() => {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
      const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO);
      
      if (!accessToken || !expiresAt) {
        console.log('🔍 Nessun token salvato trovato');
        return null;
      }
      
      const now = Date.now();
      const expirationTime = parseInt(expiresAt);
      
      // Controlla se il token è scaduto (con margine di 5 minuti)
      if (now >= (expirationTime - 5 * 60 * 1000)) {
        console.log('⏰ Token scaduto, rimozione dal localStorage');
        clearStoredAuth();
        return null;
      }
      
      const timeLeft = Math.floor((expirationTime - now) / 1000);
      console.log('✅ Token valido trovato, scade in:', Math.floor(timeLeft / 60), 'minuti');
      
      return {
        access_token: accessToken,
        expires_at: expirationTime,
        user_info: userInfo ? JSON.parse(userInfo) : null
      };
      
    } catch (error) {
      console.error('❌ Errore caricamento token:', error);
      clearStoredAuth();
      return null;
    }
  }, []);

  // 🗑️ FUNZIONE PER PULIRE AUTENTICAZIONE
  const clearStoredAuth = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🗑️ Autenticazione pulita dal localStorage');
  }, []);

  // 🔄 FUNZIONE PER RINNOVARE IL TOKEN AUTOMATICAMENTE
  const refreshToken = useCallback(async () => {
    if (!authInstanceRef.current) {
      console.log('❌ AuthInstance non disponibile per refresh');
      return false;
    }

    try {
      console.log('🔄 Tentativo di refresh del token...');
      
      const currentUser = authInstanceRef.current.currentUser.get();
      
      if (!currentUser || !currentUser.isSignedIn()) {
        console.log('❌ Utente non autenticato, impossibile fare refresh');
        return false;
      }

      // Richiedi nuovo token
      const authResponse = await currentUser.reloadAuthResponse();
      
      if (authResponse && authResponse.access_token) {
        console.log('✅ Token rinnovato con successo');
        
        // Salva il nuovo token
        saveTokenToStorage(authResponse);
        setAccessToken(authResponse.access_token);
        
        // Aggiorna gapi.client con il nuovo token
        if (window.gapi && window.gapi.client) {
          window.gapi.client.setToken({
            access_token: authResponse.access_token
          });
        }
        
        return true;
      }
      
      console.log('❌ Refresh fallito: nessun nuovo token ricevuto');
      return false;
      
    } catch (error) {
      console.error('❌ Errore durante refresh token:', error);
      
      // Se il refresh fallisce, potrebbe essere necessario re-autenticare
      handleSignOut();
      return false;
    }
  }, [saveTokenToStorage]);

  // ⚡ INIZIALIZZAZIONE GAPI
  const initializeGapi = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!window.gapi) {
        throw new Error('Google API non caricata');
      }

      // Carica gapi.client e gapi.auth2
      await new Promise((resolve, reject) => {
        window.gapi.load('client:auth2', {
          callback: resolve,
          onerror: reject
        });
      });

      // Inizializza il client
      await window.gapi.client.init({
        apiKey: GOOGLE_CONFIG.apiKey,
        clientId: GOOGLE_CONFIG.clientId,
        discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
        scope: GOOGLE_CONFIG.scope
      });

      authInstanceRef.current = window.gapi.auth2.getAuthInstance();
      
      if (!authInstanceRef.current) {
        throw new Error('Impossibile ottenere AuthInstance');
      }

      console.log('✅ GAPI inizializzato correttamente');
      setIsInitialized(true);
      
      // Controlla se c'è un token salvato
      const savedAuth = loadTokenFromStorage();
      
      if (savedAuth) {
        // Ripristina il token in gapi.client
        window.gapi.client.setToken({
          access_token: savedAuth.access_token
        });
        
        setAccessToken(savedAuth.access_token);
        setUser(savedAuth.user_info);
        setIsAuthenticated(true);
        
        console.log('✅ Sessione ripristinata da localStorage');
        
        // Avvia il refresh automatico
        startTokenRefreshInterval(savedAuth.expires_at);
      } else {
        // Controlla se l'utente è già autenticato con Google
        const currentUser = authInstanceRef.current.currentUser.get();
        
        if (currentUser && currentUser.isSignedIn()) {
          console.log('✅ Utente già autenticato con Google');
          await handleExistingSignIn(currentUser);
        }
      }
      
    } catch (error) {
      console.error('❌ Errore inizializzazione GAPI:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadTokenFromStorage, saveTokenToStorage]);

  // 👤 GESTIONE SIGN-IN ESISTENTE
  const handleExistingSignIn = useCallback(async (currentUser) => {
    try {
      const authResponse = currentUser.getAuthResponse(true);
      const profile = currentUser.getBasicProfile();
      
      const userInfo = {
        id: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        picture: profile.getImageUrl()
      };
      
      saveTokenToStorage(authResponse, userInfo);
      
      setAccessToken(authResponse.access_token);
      setUser(userInfo);
      setIsAuthenticated(true);
      
      // Avvia refresh automatico
      const expiresAt = Date.now() + (authResponse.expires_in * 1000);
      startTokenRefreshInterval(expiresAt);
      
    } catch (error) {
      console.error('❌ Errore gestione sign-in esistente:', error);
    }
  }, [saveTokenToStorage]);

  // ⏰ AVVIA INTERVALLO PER REFRESH AUTOMATICO
  const startTokenRefreshInterval = useCallback((expiresAt) => {
    // Pulisci intervallo esistente
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }
    
    const refreshTime = expiresAt - Date.now() - (10 * 60 * 1000); // 10 minuti prima della scadenza
    
    if (refreshTime > 0) {
      console.log('⏰ Refresh automatico programmato tra:', Math.floor(refreshTime / 60000), 'minuti');
      
      setTimeout(async () => {
        const success = await refreshToken();
        
        if (success) {
          // Programma il prossimo refresh
          const newExpiresAt = Date.now() + (3600 * 1000); // 1 ora
          startTokenRefreshInterval(newExpiresAt);
        }
      }, refreshTime);
    }
  }, [refreshToken]);

  // 🔐 FUNZIONE SIGN IN
  const signIn = useCallback(async () => {
    if (!authInstanceRef.current) {
      setError('Servizio di autenticazione non disponibile');
      return false;
    }

    try {
      setError(null);
      setIsLoading(true);
      
      const currentUser = authInstanceRef.current.currentUser.get();
      
      if (currentUser.isSignedIn()) {
        console.log('✅ Utente già autenticato');
        await handleExistingSignIn(currentUser);
        return true;
      }
      
      // Esegui sign-in
      const user = await authInstanceRef.current.signIn({
        scope: GOOGLE_CONFIG.scope
      });
      
      if (user && user.isSignedIn()) {
        await handleExistingSignIn(user);
        console.log('✅ Sign-in completato con successo');
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Errore durante sign-in:', error);
      setError('Errore durante l\'autenticazione');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [handleExistingSignIn]);

  // 🚪 FUNZIONE SIGN OUT
  const handleSignOut = useCallback(async () => {
    try {
      if (authInstanceRef.current) {
        await authInstanceRef.current.signOut();
      }
      
      // Pulisci intervallo refresh
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
        tokenRefreshIntervalRef.current = null;
      }
      
      // Pulisci storage
      clearStoredAuth();
      
      // Reset stato
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
      setError(null);
      
      console.log('✅ Sign-out completato');
      
    } catch (error) {
      console.error('❌ Errore durante sign-out:', error);
    }
  }, [clearStoredAuth]);

  // 🔄 FUNZIONE MANUALE PER REFRESH
  const manualRefresh = useCallback(async () => {
    return await refreshToken();
  }, [refreshToken]);

  // ⚡ INIZIALIZZAZIONE AL MOUNT
  useEffect(() => {
    initializeGapi();
    
    // Cleanup
    return () => {
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, [initializeGapi]);

  // 👂 LISTENER PER CAMBIO STATO AUTENTICAZIONE
  useEffect(() => {
    if (authInstanceRef.current && isInitialized) {
      const unlisten = authInstanceRef.current.isSignedIn.listen((isSignedIn) => {
        console.log('🔄 Cambio stato autenticazione:', isSignedIn);
        
        if (!isSignedIn && isAuthenticated) {
          // Utente si è disconnesso
          handleSignOut();
        }
      });
      
      return unlisten;
    }
  }, [isInitialized, isAuthenticated, handleSignOut]);

  return {
    // Stato
    isAuthenticated,
    isInitialized,
    isLoading,
    user,
    accessToken,
    error,
    
    // Funzioni
    signIn,
    signOut: handleSignOut,
    refreshToken: manualRefresh,
    
    // Utilities
    clearStoredAuth,
    
    // Debug info
    tokenExpiresAt: loadTokenFromStorage()?.expires_at
  };
};