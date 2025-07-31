import { useState, useEffect, useRef, useCallback } from 'react';

// Configurazione Gmail API
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.modify';

// 🆕 CHIAVI STORAGE ROBUSTE PER PERSISTENZA
const GMAIL_TOKEN_KEY = 'gmail_token_v3';
const GMAIL_REFRESH_TOKEN_KEY = 'gmail_refresh_token_v3';
const GMAIL_TOKEN_EXPIRY_KEY = 'gmail_token_expiry_v3';
const GMAIL_AUTH_STATE_KEY = 'gmail_auth_state_v3';

export const useGmail = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [labelColors, setLabelColors] = useState({});

  // 🆕 REF PER GESTIONE AVANZATA
  const refreshIntervalRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const lastHealthCheckRef = useRef(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Debug
  console.log('📧 Gmail Config Enhanced:', {
    hasApiKey: !!GOOGLE_API_KEY,
    hasClientId: !!GOOGLE_CLIENT_ID,
    isAuthenticated,
    isReady,
    hasGapi: !!window.gapi,
    hasGoogle: !!window.google?.accounts?.oauth2,
    hasStoredAuth: !!localStorage.getItem(GMAIL_AUTH_STATE_KEY)
  });

  // 🆕 PERSISTENZA AVANZATA CON METADATA
  const saveAuthState = (authData) => {
    try {
      const authState = {
        isAuthenticated: true,
        timestamp: Date.now(),
        tokenExpiry: authData.tokenExpiry,
        hasRefreshToken: !!authData.refresh_token,
        version: '3.0',
        lastActivity: Date.now(),
        reconnectAttempts: 0
      };
      
      localStorage.setItem(GMAIL_AUTH_STATE_KEY, JSON.stringify(authState));
      localStorage.setItem(GMAIL_TOKEN_KEY, JSON.stringify(authData.token));
      localStorage.setItem(GMAIL_TOKEN_EXPIRY_KEY, authData.tokenExpiry.toString());
      
      if (authData.refresh_token) {
        localStorage.setItem(GMAIL_REFRESH_TOKEN_KEY, authData.refresh_token);
      }
      
      console.log('💾 Stato auth Gmail salvato con metadata:', {
        expiry: new Date(authData.tokenExpiry).toLocaleString(),
        hasRefresh: !!authData.refresh_token,
        version: '3.0'
      });
    } catch (error) {
      console.error('❌ Errore salvataggio stato auth Gmail:', error);
    }
  };

  const loadAuthState = () => {
    try {
      const authState = localStorage.getItem(GMAIL_AUTH_STATE_KEY);
      const savedToken = localStorage.getItem(GMAIL_TOKEN_KEY);
      const savedExpiry = localStorage.getItem(GMAIL_TOKEN_EXPIRY_KEY);
      const refreshToken = localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);

      if (!authState || !savedToken || !savedExpiry) {
        return null;
      }

      const parsedState = JSON.parse(authState);
      const expiryTime = parseInt(savedExpiry);
      const now = Date.now();

      // 🆕 MARGINE DINAMICO BASATO SU ATTIVITÀ
      const timeSinceLastActivity = now - (parsedState.lastActivity || 0);
      const isRecentlyActive = timeSinceLastActivity < (30 * 60 * 1000);
      
      const refreshMargin = isRecentlyActive 
        ? 15 * 60 * 1000  // 15 minuti se attivo
        : 45 * 60 * 1000; // 45 minuti se inattivo

      if (now >= (expiryTime - refreshMargin)) {
        console.log('⏰ Token Gmail in scadenza, programmo refresh...', {
          timeToExpiry: Math.round((expiryTime - now) / (1000 * 60)) + ' minuti',
          isRecentlyActive,
          marginUsed: Math.round(refreshMargin / (1000 * 60)) + ' minuti'
        });
        
        if (refreshToken) {
          return {
            needsRefresh: true,
            refreshToken: refreshToken,
            oldToken: JSON.parse(savedToken),
            authState: parsedState
          };
        } else {
          clearAuthState();
          return null;
        }
      }

      console.log('✅ Stato auth Gmail valido:', {
        expiry: new Date(expiryTime).toLocaleString(),
        timeLeft: Math.round((expiryTime - now) / (1000 * 60)) + ' minuti',
        isRecentlyActive
      });

      return {
        token: JSON.parse(savedToken),
        expiry: expiryTime,
        refreshToken: refreshToken,
        authState: parsedState
      };
    } catch (error) {
      console.error('❌ Errore caricamento stato auth Gmail:', error);
      clearAuthState();
      return null;
    }
  };

  const clearAuthState = () => {
    localStorage.removeItem(GMAIL_AUTH_STATE_KEY);
    localStorage.removeItem(GMAIL_TOKEN_KEY);
    localStorage.removeItem(GMAIL_TOKEN_EXPIRY_KEY);
    localStorage.removeItem(GMAIL_REFRESH_TOKEN_KEY);
    console.log('🗑️ Stato auth Gmail pulito');
  };

  // 🆕 HEALTH CHECK AVANZATO
  const performHealthCheck = useCallback(async () => {
    const now = Date.now();
    if (now - lastHealthCheckRef.current < 5 * 60 * 1000) {
      return true; // Skip se fatto negli ultimi 5 minuti
    }

    lastHealthCheckRef.current = now;

    try {
      console.log('🏥 Health check Gmail...');
      
      if (!window.gapi?.client?.gmail) {
        // Prova a caricare Gmail API se non disponibile
        await window.gapi.client.load('gmail', 'v1');
      }

      const savedToken = localStorage.getItem(GMAIL_TOKEN_KEY);
      if (!savedToken) {
        throw new Error('Token Gmail non disponibile');
      }

      const token = JSON.parse(savedToken);
      const currentToken = window.gapi.client.getToken();
      
      // Imposta token temporaneamente per test
      window.gapi.client.setToken({ access_token: token.access_token });

      // Test semplice: ottieni profilo
      const response = await window.gapi.client.gmail.users.getProfile({
        userId: 'me'
      });

      // Ripristina token originale
      if (currentToken) window.gapi.client.setToken(currentToken);

      console.log('✅ Health check Gmail OK');
      reconnectAttempts.current = 0;
      return true;

    } catch (error) {
      console.warn('⚠️ Health check Gmail fallito:', error);
      
      if (error.status === 401) {
        console.log('🔄 Token Gmail scaduto durante health check');
        const refreshToken = localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);
        if (refreshToken) {
          return await refreshAccessToken(refreshToken);
        }
      }
      
      return false;
    }
  }, []);

  // 🆕 REFRESH TOKEN ROBUSTO
  const refreshAccessToken = useCallback(async (refreshToken, retryCount = 0) => {
    if (isRefreshingRef.current) {
      console.log('🔄 Refresh Gmail già in corso, attendo...');
      return false;
    }

    isRefreshingRef.current = true;
    
    try {
      console.log('🔄 Tentativo refresh token Gmail...', { retryCount });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Refresh failed: ${response.status} - ${errorText}`);
      }

      const tokenData = await response.json();
      
      const newTokenData = {
        token: {
          access_token: tokenData.access_token,
          expires_in: tokenData.expires_in || 3600
        },
        tokenExpiry: Date.now() + ((tokenData.expires_in || 3600) * 1000),
        refresh_token: refreshToken
      };

      saveAuthState(newTokenData);
      
      console.log('✅ Token Gmail refreshato con successo');
      setError(null);
      reconnectAttempts.current = 0;
      
      // Riavvia monitoring
      setupTokenRefresh(newTokenData.tokenExpiry);
      
      return true;

    } catch (error) {
      console.error('❌ Errore refresh token Gmail:', error);
      
      // 🆕 RETRY LOGIC
      if (retryCount < 2 && !error.message.includes('invalid_grant')) {
        console.log(`🔄 Retry refresh Gmail (${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return refreshAccessToken(refreshToken, retryCount + 1);
      }
      
      clearAuthState();
      setIsAuthenticated(false);
      setError('Sessione Gmail scaduta. Riconnetti per continuare.');
      return false;
      
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // 🆕 SETUP REFRESH INTELLIGENTE
  const setupTokenRefresh = useCallback((expiryTime) => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    const refreshTime = Math.max(5 * 60 * 1000, timeUntilExpiry - (25 * 60 * 1000));
    const healthCheckInterval = 10 * 60 * 1000;

    console.log('⏰ Setup refresh Gmail avanzato:', {
      expiry: new Date(expiryTime).toLocaleString(),
      refreshIn: Math.round(refreshTime / (1000 * 60)) + ' minuti',
      healthCheckEvery: Math.round(healthCheckInterval / (1000 * 60)) + ' minuti'
    });

    // Timer per refresh principale
    refreshIntervalRef.current = setTimeout(async () => {
      const refreshToken = localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);
      if (refreshToken && isAuthenticated) {
        console.log('🔄 Refresh automatico Gmail...');
        const success = await refreshAccessToken(refreshToken);
        
        if (!success && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => {
            console.log(`🔄 Tentativo riconnessione Gmail ${reconnectAttempts.current}/${maxReconnectAttempts}`);
            signIn();
          }, 5000 * reconnectAttempts.current);
        }
      }
    }, refreshTime);

    // Health check periodico
    const healthCheckTimer = setInterval(async () => {
      if (isAuthenticated) {
        await performHealthCheck();
      }
    }, healthCheckInterval);

    return () => {
      if (healthCheckTimer) clearInterval(healthCheckTimer);
    };

  }, [refreshAccessToken, isAuthenticated, performHealthCheck]);

  // 🆕 AZIONI EMAIL CON GESTIONE ROBUSTA
  const markAsRead = async (messageId) => {
    console.log('📧 markAsRead chiamata per:', messageId);
    try {
      // Health check prima dell'azione
      const isHealthy = await performHealthCheck();
      if (!isHealthy) {
        throw new Error('Gmail non disponibile');
      }

      const savedToken = localStorage.getItem(GMAIL_TOKEN_KEY);
      if (!savedToken) {
        console.error('❌ Token Gmail non disponibile');
        return false;
      }

      const token = JSON.parse(savedToken);
      const currentToken = window.gapi.client.getToken();
      window.gapi.client.setToken({ access_token: token.access_token });

      await window.gapi.client.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        removeLabelIds: ['UNREAD']
      });

      setEmails(prev => prev.map(email => 
        email.id === messageId 
          ? { ...email, isUnread: false }
          : email
      ));

      if (currentToken) window.gapi.client.setToken(currentToken);
      
      console.log('✅ Email segnata come letta');
      return true;

    } catch (error) {
      console.error('❌ Errore markAsRead:', error);
      if (error.status === 401) {
        const refreshToken = localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const success = await refreshAccessToken(refreshToken);
          if (success) {
            return markAsRead(messageId);
          }
        }
      }
      return false;
    }
  };

  const archiveEmail = async (messageId) => {
    console.log('📧 archiveEmail chiamata per:', messageId);
    try {
      const isHealthy = await performHealthCheck();
      if (!isHealthy) {
        throw new Error('Gmail non disponibile');
      }

      const savedToken = localStorage.getItem(GMAIL_TOKEN_KEY);
      if (!savedToken) return false;

      const token = JSON.parse(savedToken);
      const currentToken = window.gapi.client.getToken();
      window.gapi.client.setToken({ access_token: token.access_token });

      await window.gapi.client.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        removeLabelIds: ['INBOX']
      });

      setEmails(prev => prev.filter(email => email.id !== messageId));

      if (currentToken) window.gapi.client.setToken(currentToken);
      
      console.log('✅ Email archiviata');
      return true;

    } catch (error) {
      console.error('❌ Errore archiveEmail:', error);
      if (error.status === 401) {
        const refreshToken = localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const success = await refreshAccessToken(refreshToken);
          if (success) {
            return archiveEmail(messageId);
          }
        }
      }
      return false;
    }
  };

  // 🆕 SIGN IN COMPLETAMENTE RIVISITATO
  const signIn = async () => {
    try {
      console.log('📧 Avvio login Gmail migliorato...');

      if (!isReady) {
        setError('Gmail non ancora inizializzato');
        return;
      }

      if (!window.gapi || !window.google?.accounts?.oauth2) {
        setError('Librerie Google non disponibili');
        return;
      }

      // Step 1: Verifica auth esistente
      const authState = loadAuthState();
      if (authState && !authState.needsRefresh) {
        console.log('✅ Auth Gmail valida trovata, ripristino...');
        setIsAuthenticated(true);
        setError(null);
        setupTokenRefresh(authState.expiry);
        
        const isHealthy = await performHealthCheck();
        if (isHealthy) {
          return;
        }
      }

      // Step 2: Prova refresh
      if (authState && authState.needsRefresh && authState.refreshToken) {
        console.log('🔄 Token Gmail scaduto, provo refresh...');
        const success = await refreshAccessToken(authState.refreshToken);
        if (success) {
          setIsAuthenticated(true);
          const newExpiry = parseInt(localStorage.getItem(GMAIL_TOKEN_EXPIRY_KEY));
          setupTokenRefresh(newExpiry);
          return;
        }
      }

      // Step 3: Nuovo token
      console.log('📧 Creando token client Gmail robusto...');

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GMAIL_SCOPES,
        callback: (response) => {
          console.log('📧 Callback Gmail ricevuto:', response);
          if (response.access_token) {
            const authData = {
              token: {
                access_token: response.access_token,
                expires_in: response.expires_in || 3600
              },
              tokenExpiry: Date.now() + ((response.expires_in || 3600) * 1000),
              refresh_token: response.refresh_token
            };

            saveAuthState(authData);
            setIsAuthenticated(true);
            setError(null);
            reconnectAttempts.current = 0;
            setupTokenRefresh(authData.tokenExpiry);
            
            console.log('✅ Login Gmail completato con persistenza robusta');
          } else if (response.error) {
            console.error('❌ Errore nella risposta Gmail:', response);
            setError(`Errore Gmail: ${response.error}`);
          }
        },
        error_callback: (error) => {
          console.error('❌ Errore OAuth Gmail:', error);
          setError(`Errore autenticazione Gmail: ${error.type}`);
        }
      });

      console.log('📧 Richiedendo accesso Gmail con opzioni avanzate...');
      tokenClient.requestAccessToken({
        prompt: 'consent',
        include_granted_scopes: true,
        access_type: 'offline'
      });

    } catch (err) {
      console.error('❌ Errore signIn Gmail:', err);
      setError(`Errore login Gmail: ${err.message}`);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Logout Gmail...');
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      const savedToken = localStorage.getItem(GMAIL_TOKEN_KEY);
      if (savedToken) {
        const token = JSON.parse(savedToken);
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          console.log('✅ Token Gmail revocato');
        });
      }
      
      clearAuthState();
      setIsAuthenticated(false);
      setEmails([]);
      setError(null);
      reconnectAttempts.current = 0;
      
      console.log('✅ Logout Gmail completato');
      
    } catch (err) {
      console.error('❌ Errore logout Gmail:', err);
    }
  };

  // FETCH EMAIL CON GESTIONE ROBUSTA
  const fetchRecentEmails = async (maxResults = 5) => {
    if (!isAuthenticated || !window.gapi) {
      console.log('⚠️ Gmail non pronto per fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Health check prima del fetch
      const isHealthy = await performHealthCheck();
      if (!isHealthy) {
        throw new Error('Gmail non disponibile');
      }

      const savedToken = localStorage.getItem(GMAIL_TOKEN_KEY);
      if (!savedToken) {
        setIsAuthenticated(false);
        setError('Sessione scaduta');
        setLoading(false);
        return;
      }

      console.log('📧 Caricamento Gmail API...');

      if (!window.gapi.client.gmail) {
        await window.gapi.client.load('gmail', 'v1');
        console.log('✅ Gmail API caricata');
      }

      const token = JSON.parse(savedToken);
      const currentToken = window.gapi.client.getToken();
      window.gapi.client.setToken({ access_token: token.access_token });

      const response = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: 'in:inbox'
      });

      const messages = response.result.messages || [];
      
      if (messages.length === 0) {
        setEmails([]);
        if (currentToken) window.gapi.client.setToken(currentToken);
        setLoading(false);
        return;
      }

      const emailDetails = await Promise.all(
        messages.map(async (message) => {
          try {
            const detail = await window.gapi.client.gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full'
            });

            const headers = detail.result.payload.headers;
            const from = headers.find(h => h.name === 'From')?.value || 'Mittente sconosciuto';
            const subject = headers.find(h => h.name === 'Subject')?.value || 'Nessun oggetto';
            const date = headers.find(h => h.name === 'Date')?.value || '';

            const hasAttachments = (payload) => {
              if (payload.parts) {
                return payload.parts.some(part => 
                  part.filename && part.filename.length > 0 && 
                  part.body && part.body.attachmentId
                );
              }
              return payload.filename && payload.filename.length > 0;
            };

            const labelIds = detail.result.labelIds || [];
            
            let category = 'primary';
            if (labelIds.includes('CATEGORY_PROMOTIONS')) category = 'promotions';
            else if (labelIds.includes('CATEGORY_SOCIAL')) category = 'social';
            else if (labelIds.includes('CATEGORY_UPDATES')) category = 'updates';
            else if (labelIds.includes('CATEGORY_FORUMS')) category = 'forums';

            const systemLabels = [
              'INBOX', 'UNREAD', 'IMPORTANT', 'STARRED', 'SENT', 'DRAFT', 'SPAM', 'TRASH',
              'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS', 'CATEGORY_PRIMARY'
            ];
            const customLabels = labelIds.filter(id => !systemLabels.includes(id));

            return {
              id: message.id,
              from: from,
              subject: subject,
              date: date,
              snippet: detail.result.snippet || '',
              threadId: detail.result.threadId,
              isUnread: labelIds.includes('UNREAD'),
              isImportant: labelIds.includes('IMPORTANT'),
              isStarred: labelIds.includes('STARRED'),
              hasAttachments: hasAttachments(detail.result.payload),
              labelIds: labelIds,
              customLabels: customLabels,
              category: category
            };
          } catch (err) {
            console.warn('⚠️ Errore dettaglio email:', err);
            return null;
          }
        })
      );

      if (currentToken) window.gapi.client.setToken(currentToken);

      const validEmails = emailDetails.filter(email => email !== null);
      setEmails(validEmails);
      console.log('✅ Email Gmail caricate:', validEmails.length);
      
    } catch (err) {
      console.error('❌ Errore fetch email Gmail:', err);
      
      if (err.status === 401) {
        const refreshToken = localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const success = await refreshAccessToken(refreshToken);
          if (success) {
            return fetchRecentEmails(maxResults);
          }
        } else {
          clearAuthState();
          setIsAuthenticated(false);
          setError('Sessione Gmail scaduta. Riconnettiti.');
        }
      } else {
        setError(`Errore caricamento: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // FETCH LABEL COLORS CON GESTIONE ROBUSTA
  const fetchLabelColors = async () => {
    try {
      const isHealthy = await performHealthCheck();
      if (!isHealthy) return;

      const savedToken = localStorage.getItem(GMAIL_TOKEN_KEY);
      if (!savedToken) return;

      const token = JSON.parse(savedToken);
      const currentToken = window.gapi.client.getToken();
      window.gapi.client.setToken({ access_token: token.access_token });

      const response = await window.gapi.client.gmail.users.labels.list({
        userId: 'me'
      });

      const labels = response.result.labels || [];
      const colors = {};

      labels.forEach(label => {
        if (label.color) {
          colors[label.id] = {
            name: label.name,
            backgroundColor: label.color.backgroundColor || '#cccccc',
            textColor: label.color.textColor || '#000000'
          };
        }
      });

      setLabelColors(colors);
      if (currentToken) window.gapi.client.setToken(currentToken);

    } catch (error) {
      console.error('❌ Errore caricamento colori label:', error);
    }
  };

  // Utility per formattare data
  const formatEmailDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = now - date;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (diffDays === 1) {
        return 'Ieri';
      } else if (diffDays < 7) {
        return `${diffDays} giorni fa`;
      } else {
        return date.toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'short'
        });
      }
    } catch {
      return 'Data non valida';
    }
  };

  // INIZIALIZZAZIONE CON SETUP ROBUSTO
  useEffect(() => {
    const initializeGmail = async () => {
      try {
        console.log('📧 Inizializzazione Gmail API robusta...');
        
        await new Promise((resolve) => {
          const checkLibraries = () => {
            if (window.gapi && window.google?.accounts?.oauth2) {
              resolve();
            } else {
              setTimeout(checkLibraries, 100);
            }
          };
          checkLibraries();
        });

        setIsReady(true);
        console.log('✅ Gmail API pronta');

        // Auto-restore avanzato
        const authState = loadAuthState();
        if (authState) {
          if (authState.needsRefresh && authState.refreshToken) {
            console.log('🔄 Token Gmail salvato necessita refresh...');
            const success = await refreshAccessToken(authState.refreshToken);
            if (success) {
              setIsAuthenticated(true);
              const newExpiry = parseInt(localStorage.getItem(GMAIL_TOKEN_EXPIRY_KEY));
              setupTokenRefresh(newExpiry);
            }
          } else if (!authState.needsRefresh) {
            console.log('✅ Ripristino Gmail da storage robusto...');
            setIsAuthenticated(true);
            setupTokenRefresh(authState.expiry);
            
            // Health check per verificare
            setTimeout(() => performHealthCheck(), 2000);
          }
        }

      } catch (error) {
        console.error('❌ Errore inizializzazione Gmail:', error);
        setError('Errore inizializzazione Gmail');
      }
    };

    initializeGmail();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [setupTokenRefresh, refreshAccessToken, performHealthCheck]);

  // Auto-fetch quando autenticato
  useEffect(() => {
    if (isAuthenticated && isReady) {
      fetchRecentEmails();
      fetchLabelColors();
      
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh email Gmail...');
        fetchRecentEmails();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isReady]);

  return {
    emails,
    loading,
    error,
    isAuthenticated,
    signIn,
    signOut,
    fetchRecentEmails,
    formatEmailDate,
    getUnreadCount: () => emails.filter(email => email.isUnread).length,
    markAsRead,
    archiveEmail,
    labelColors,
    
    // 🆕 UTILITY AVANZATE
    performHealthCheck,
    checkConnectionStatus: () => ({
      isAuthenticated,
      hasRefreshToken: !!localStorage.getItem(GMAIL_REFRESH_TOKEN_KEY),
      reconnectAttempts: reconnectAttempts.current,
      lastHealthCheck: lastHealthCheckRef.current
    })
  };
};