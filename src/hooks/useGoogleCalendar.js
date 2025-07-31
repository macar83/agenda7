import { useState, useEffect, useRef, useCallback } from 'react';

// Configurazione Google Calendar API
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

// CHIAVI STORAGE MIGLIORATE PER PERSISTENZA ROBUSTA
const GOOGLE_TOKEN_KEY = 'google_calendar_token_v3';
const GOOGLE_REFRESH_TOKEN_KEY = 'google_calendar_refresh_token_v3';
const GOOGLE_TOKEN_EXPIRY_KEY = 'google_calendar_token_expiry_v3';
const GOOGLE_AUTH_STATE_KEY = 'google_calendar_auth_state_v3';
const CALENDAR_FILTERS_KEY = 'google_calendar_filters';
const CALENDAR_CUSTOM_NAMES_KEY = 'google_calendar_custom_names';

export const useGoogleCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gapi, setGapi] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);
  
  // STATI PER CALENDARI MULTIPLI
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [selectedCalendars, setSelectedCalendars] = useState(['primary']);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // REF PER GESTIONE AVANZATA REFRESH
  const refreshIntervalRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const lastHealthCheckRef = useRef(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Debug delle credenziali
  console.log('🔧 Google Calendar Config Enhanced:', {
    hasApiKey: !!GOOGLE_API_KEY,
    hasClientId: !!GOOGLE_CLIENT_ID,
    isAuthenticated,
    hasTokenClient: !!tokenClient,
    hasGapi: !!gapi,
    hasStoredAuth: !!localStorage.getItem(GOOGLE_AUTH_STATE_KEY)
  });

  // PERSISTENZA AVANZATA CON METADATA
  const saveAuthState = useCallback((authData) => {
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
      
      localStorage.setItem(GOOGLE_AUTH_STATE_KEY, JSON.stringify(authState));
      localStorage.setItem(GOOGLE_TOKEN_KEY, JSON.stringify(authData.token));
      localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, authData.tokenExpiry.toString());
      
      if (authData.refresh_token) {
        localStorage.setItem(GOOGLE_REFRESH_TOKEN_KEY, authData.refresh_token);
      }
      
      console.log('💾 Stato auth Google Calendar salvato con metadata:', {
        expiry: new Date(authData.tokenExpiry).toLocaleString(),
        hasRefresh: !!authData.refresh_token,
        version: '3.0'
      });
    } catch (error) {
      console.error('❌ Errore salvataggio stato auth:', error);
    }
  }, []);

  const loadAuthState = useCallback(() => {
    try {
      const authState = localStorage.getItem(GOOGLE_AUTH_STATE_KEY);
      const savedToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
      const savedExpiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
      const refreshToken = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);

      if (!authState || !savedToken || !savedExpiry) {
        console.log('📦 Nessun stato auth Calendar salvato');
        return null;
      }

      const parsedState = JSON.parse(authState);
      const expiryTime = parseInt(savedExpiry);
      const now = Date.now();

      const timeSinceLastActivity = now - (parsedState.lastActivity || 0);
      const isRecentlyActive = timeSinceLastActivity < (30 * 60 * 1000);
      
      const refreshMargin = isRecentlyActive 
        ? 15 * 60 * 1000  
        : 45 * 60 * 1000;

      if (now >= (expiryTime - refreshMargin)) {
        console.log('⏰ Token Calendar in scadenza, programmo refresh...', {
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
          console.log('❌ Nessun refresh token Calendar disponibile');
          clearAuthState();
          return null;
        }
      }

      console.log('✅ Stato auth Calendar valido caricato:', {
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
      console.error('❌ Errore caricamento stato auth Calendar:', error);
      clearAuthState();
      return null;
    }
  }, []);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem(GOOGLE_AUTH_STATE_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    localStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
    console.log('🗑️ Stato auth Google Calendar pulito');
  }, []);

  // HEALTH CHECK AVANZATO
  const performHealthCheck = useCallback(async () => {
    const now = Date.now();
    if (now - lastHealthCheckRef.current < 5 * 60 * 1000) {
      return true;
    }

    lastHealthCheckRef.current = now;

    try {
      console.log('🏥 Health check Google Calendar...');
      
      if (!window.gapi?.client?.calendar) {
        throw new Error('GAPI Calendar client non disponibile');
      }

      const response = await window.gapi.client.calendar.calendarList.list({
        maxResults: 1
      });

      console.log('✅ Health check Calendar OK');
      reconnectAttempts.current = 0;
      return true;

    } catch (error) {
      console.warn('⚠️ Health check Calendar fallito:', error);
      
      if (error.status === 401) {
        console.log('🔄 Token scaduto durante health check, refresh necessario');
        const refreshToken = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
        if (refreshToken) {
          return await refreshAccessToken(refreshToken);
        }
      }
      
      return false;
    }
  }, []);

  // REFRESH TOKEN ROBUSTO CON RETRY
  const refreshAccessToken = useCallback(async (refreshToken, retryCount = 0) => {
    if (isRefreshingRef.current) {
      console.log('🔄 Refresh Calendar già in corso, attendo...');
      return false;
    }

    isRefreshingRef.current = true;
    
    try {
      console.log('🔄 Tentativo refresh token Calendar...', { retryCount });

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
      
      if (window.gapi?.client) {
        window.gapi.client.setToken({
          access_token: tokenData.access_token
        });
        
        const currentToken = window.gapi.client.getToken();
        if (!currentToken || currentToken.access_token !== tokenData.access_token) {
          throw new Error('Token non impostato correttamente in GAPI');
        }
      }

      console.log('✅ Token Calendar refreshato con successo');
      setError(null);
      reconnectAttempts.current = 0;
      
      setupTokenRefresh(newTokenData.tokenExpiry);
      
      return true;

    } catch (error) {
      console.error('❌ Errore refresh token Calendar:', error);
      
      if (retryCount < 2 && !error.message.includes('invalid_grant')) {
        console.log(`🔄 Retry refresh Calendar (${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return refreshAccessToken(refreshToken, retryCount + 1);
      }
      
      console.log('❌ Refresh Calendar fallito definitivamente');
      clearAuthState();
      setIsAuthenticated(false);
      setError('Sessione Calendar scaduta. Riconnetti per continuare.');
      return false;
      
    } finally {
      isRefreshingRef.current = false;
    }
  }, [saveAuthState, clearAuthState]);

  // SETUP REFRESH INTELLIGENTE
  const setupTokenRefresh = useCallback((expiryTime) => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    const refreshTime = Math.max(5 * 60 * 1000, timeUntilExpiry - (25 * 60 * 1000));
    const healthCheckInterval = 10 * 60 * 1000;

    console.log('⏰ Setup refresh Calendar avanzato:', {
      expiry: new Date(expiryTime).toLocaleString(),
      refreshIn: Math.round(refreshTime / (1000 * 60)) + ' minuti',
      healthCheckEvery: Math.round(healthCheckInterval / (1000 * 60)) + ' minuti'
    });

    refreshIntervalRef.current = setTimeout(async () => {
      const refreshToken = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
      if (refreshToken && isAuthenticated) {
        console.log('🔄 Refresh automatico Calendar...');
        const success = await refreshAccessToken(refreshToken);
        
        if (!success) {
          console.log('❌ Refresh automatico Calendar fallito');
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            setTimeout(() => {
              console.log(`🔄 Tentativo riconnessione Calendar ${reconnectAttempts.current}/${maxReconnectAttempts}`);
              signIn();
            }, 5000 * reconnectAttempts.current);
          }
        }
      }
    }, refreshTime);

    const healthCheckTimer = setInterval(async () => {
      if (isAuthenticated) {
        await performHealthCheck();
      }
    }, healthCheckInterval);

    return () => {
      if (healthCheckTimer) clearInterval(healthCheckTimer);
    };

  }, [refreshAccessToken, isAuthenticated, performHealthCheck]);

  // FILTRO EVENTI FUTURI
  const filterFutureEvents = useCallback((eventsList) => {
    const now = new Date();
    
    return eventsList.filter(event => {
      const eventEnd = new Date(event.end);
      
      if (event.allDay) {
        const eventDate = new Date(event.start);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
      } else {
        return eventEnd > now;
      }
    });
  }, []);

  // FETCH EVENTI CON GESTIONE ROBUSTA
  const fetchWeekEvents = useCallback(async () => {
    if (!isAuthenticated || !gapi) {
      console.log('⚠️ Calendar non pronto per fetch eventi');
      return;
    }

    if (selectedCalendars.length === 0) {
      console.log('⚠️ Nessun calendario selezionato');
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isHealthy = await performHealthCheck();
      if (!isHealthy) {
        throw new Error('Calendar non disponibile');
      }

      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      console.log('📅 Caricamento eventi da', now.toISOString(), 'a', endOfWeek.toISOString());
      console.log('📅 Calendari selezionati:', selectedCalendars);

      const allEvents = [];
      
      for (const calendarId of selectedCalendars) {
        try {
          console.log(`📅 Caricando eventi da calendario: ${calendarId}`);
          
          const response = await gapi.client.calendar.events.list({
            calendarId: calendarId,
            timeMin: now.toISOString(),
            timeMax: endOfWeek.toISOString(),
            showDeleted: false,
            singleEvents: true,
            maxResults: 50,
            orderBy: 'startTime'
          });

          const events = response.result.items || [];

          const calendarInfo = availableCalendars.find(cal => cal.id === calendarId) || { 
            name: calendarId === 'primary' ? 'Principale' : calendarId,
            backgroundColor: '#1976d2'
          };

          const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.summary || 'Senza titolo',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            allDay: !event.start?.dateTime,
            description: event.description || '',
            location: event.location || '',
            calendarId: calendarId,
            calendarName: calendarInfo.displayName || calendarInfo.name,
            calendarColor: calendarInfo.backgroundColor,
            htmlLink: event.htmlLink,
            status: event.status,
            attendees: event.attendees || []
          }));

          allEvents.push(...formattedEvents);
          console.log(`✅ ${formattedEvents.length} eventi caricati da ${calendarInfo.name}`);

        } catch (calError) {
          console.error(`❌ Errore caricamento calendario ${calendarId}:`, calError);
        }
      }

      const futureEvents = filterFutureEvents(allEvents);
      futureEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

      setEvents(futureEvents);
      console.log('✅ Eventi totali caricati:', futureEvents.length);

    } catch (err) {
      console.error('❌ Errore caricamento eventi:', err);
      
      if (err.status === 401) {
        const refreshToken = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
        if (refreshToken) {
          console.log('🔄 Token scaduto durante fetch eventi, refresh...');
          const success = await refreshAccessToken(refreshToken);
          if (success) {
            return fetchWeekEvents();
          }
        } else {
          setIsAuthenticated(false);
          setError('Sessione Calendar scaduta. Effettua nuovamente il login.');
        }
      } else {
        setError(`Errore nel caricamento degli eventi: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, gapi, selectedCalendars, availableCalendars, performHealthCheck, refreshAccessToken, filterFutureEvents]);

  // FETCH CALENDARI DISPONIBILI
  const fetchAvailableCalendars = useCallback(async () => {
    if (!gapi || !isAuthenticated) return;

    setLoadingCalendars(true);
    
    try {
      const isHealthy = await performHealthCheck();
      if (!isHealthy) {
        throw new Error('Health check fallito prima del fetch calendari');
      }

      const response = await gapi.client.calendar.calendarList.list({
        minAccessRole: 'reader'
      });

      const calendars = response.result.items || [];
      const customNames = loadCustomNames();

      const formattedCalendars = calendars.map(cal => ({
        id: cal.id,
        name: cal.summary,
        displayName: customNames[cal.id] || cal.summary,
        description: cal.description,
        primary: cal.primary === true,
        backgroundColor: cal.backgroundColor || '#1976d2',
        foregroundColor: cal.foregroundColor || '#ffffff',
        accessRole: cal.accessRole,
        selected: cal.selected !== false,
        timeZone: cal.timeZone
      }));

      formattedCalendars.sort((a, b) => {
        if (a.primary) return -1;
        if (b.primary) return 1;
        return a.name.localeCompare(b.name);
      });

      setAvailableCalendars(formattedCalendars);
      
      const savedFilters = loadCalendarFilters();
      setSelectedCalendars(savedFilters);

    } catch (err) {
      console.error('❌ Errore recupero calendari:', err);
      
      if (err.status === 401) {
        const refreshToken = localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
        if (refreshToken) {
          console.log('🔄 Token scaduto durante fetch calendari, refresh...');
          const success = await refreshAccessToken(refreshToken);
          if (success) {
            return fetchAvailableCalendars();
          }
        }
      }
      
      setError(`Errore nel caricamento calendari: ${err.message}`);
    } finally {
      setLoadingCalendars(false);
    }
  }, [gapi, isAuthenticated, performHealthCheck, refreshAccessToken]);

  // FUNZIONI GESTIONE NOMI PERSONALIZZATI
  const saveCustomNames = useCallback((customNames) => {
    try {
      localStorage.setItem(CALENDAR_CUSTOM_NAMES_KEY, JSON.stringify(customNames));
    } catch (error) {
      console.error('❌ Errore salvataggio nomi personalizzati:', error);
    }
  }, []);

  const loadCustomNames = useCallback(() => {
    try {
      const saved = localStorage.getItem(CALENDAR_CUSTOM_NAMES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('❌ Errore caricamento nomi personalizzati:', error);
      return {};
    }
  }, []);

  const setCustomCalendarName = useCallback((calendarId, customName) => {
    const currentCustomNames = loadCustomNames();
    const updatedNames = { ...currentCustomNames, [calendarId]: customName };
    saveCustomNames(updatedNames);
    
    setAvailableCalendars(prev => {
      const updated = prev.map(cal => 
        cal.id === calendarId 
          ? { ...cal, displayName: customName, name: customName }
          : cal
      );
      return updated;
    });
  }, [loadCustomNames, saveCustomNames]);

  // FUNZIONI PER FILTRI CALENDARI
  const saveCalendarFilters = useCallback((calendarIds) => {
    try {
      localStorage.setItem(CALENDAR_FILTERS_KEY, JSON.stringify(calendarIds));
    } catch (error) {
      console.error('❌ Errore salvataggio filtri:', error);
    }
  }, []);

  const loadCalendarFilters = useCallback(() => {
    try {
      const saved = localStorage.getItem(CALENDAR_FILTERS_KEY);
      return saved ? JSON.parse(saved) : ['primary'];
    } catch (error) {
      console.error('❌ Errore caricamento filtri:', error);
      return ['primary'];
    }
  }, []);

  const toggleCalendar = useCallback((calendarId) => {
    const newSelection = selectedCalendars.includes(calendarId)
      ? selectedCalendars.filter(id => id !== calendarId)
      : [...selectedCalendars, calendarId];
    
    setSelectedCalendars(newSelection);
    saveCalendarFilters(newSelection);
  }, [selectedCalendars, saveCalendarFilters]);

  const selectAllCalendars = useCallback(() => {
    const allIds = availableCalendars.map(cal => cal.id);
    setSelectedCalendars(allIds);
    saveCalendarFilters(allIds);
  }, [availableCalendars, saveCalendarFilters]);

  const selectNoneCalendars = useCallback(() => {
    setSelectedCalendars([]);
    saveCalendarFilters([]);
  }, [saveCalendarFilters]);

  // FUNZIONE LOGIN
  const signIn = useCallback(async () => {
    try {
      console.log('🔐 Avvio processo login Calendar migliorato...');
      
      if (!tokenClient) {
        setError('Token client Calendar non inizializzato. Ricarica la pagina.');
        return;
      }

      const authState = loadAuthState();
      if (authState && !authState.needsRefresh) {
        console.log('✅ Auth Calendar valida trovata, ripristino...');
        window.gapi.client.setToken({
          access_token: authState.token.access_token
        });
        setIsAuthenticated(true);
        setError(null);
        setupTokenRefresh(authState.expiry);
        
        const isHealthy = await performHealthCheck();
        if (isHealthy) {
          return;
        } else {
          console.log('⚠️ Auth ripristinata ma health check fallito, refresh necessario');
        }
      }

      if (authState && authState.needsRefresh && authState.refreshToken) {
        console.log('🔄 Token Calendar scaduto, provo refresh...');
        const success = await refreshAccessToken(authState.refreshToken);
        if (success) {
          setIsAuthenticated(true);
          const newExpiry = parseInt(localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY));
          setupTokenRefresh(newExpiry);
          return;
        } else {
          console.log('❌ Refresh fallito, richiedo nuovo token');
        }
      }

      console.log('🔄 Richiedendo nuovo token Calendar...');
      setError(null);
      
      tokenClient.requestAccessToken({
        prompt: 'consent',
        include_granted_scopes: true,
        enable_granular_consent: true,
        access_type: 'offline'
      });
      
    } catch (err) {
      console.error('❌ Errore durante login Calendar:', err);
      setError(`Errore login Calendar: ${err.message}`);
      reconnectAttempts.current = 0;
    }
  }, [tokenClient, loadAuthState, setupTokenRefresh, performHealthCheck, refreshAccessToken]);

  // FUNZIONE LOGOUT
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Logout Calendar...');
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      const token = window.gapi?.client?.getToken();
      if (token && token.access_token) {
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          console.log('✅ Token Calendar revocato');
        });
        window.gapi.client.setToken(null);
      }
      
      clearAuthState();
      setIsAuthenticated(false);
      setEvents([]);
      setAvailableCalendars([]);
      setSelectedCalendars(['primary']);
      setError(null);
      reconnectAttempts.current = 0;
      
      console.log('✅ Logout Calendar completato');
      
    } catch (err) {
      console.error('❌ Errore durante logout Calendar:', err);
    }
  }, [clearAuthState]);

  // Carica script GAPI e GIS
  const loadGapiScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Impossibile caricare GAPI script'));
      document.body.appendChild(script);
    });
  }, []);

  const loadGisScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Impossibile caricare GIS script'));
      document.body.appendChild(script);
    });
  }, []);

  // INIZIALIZZAZIONE con setup robusto
  useEffect(() => {
    const initializeGoogleServices = async () => {
      if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
        const missingCreds = [];
        if (!GOOGLE_API_KEY) missingCreds.push('REACT_APP_GOOGLE_API_KEY');
        if (!GOOGLE_CLIENT_ID) missingCreds.push('REACT_APP_GOOGLE_CLIENT_ID');
        
        setError(`Credenziali Calendar mancanti: ${missingCreds.join(', ')}`);
        return;
      }

      try {
        await loadGapiScript();
        await loadGisScript();

        await new Promise((resolve, reject) => {
          window.gapi.load('client', {
            callback: resolve,
            onerror: reject
          });
        });

        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });

        setGapi(window.gapi);

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            console.log('🔐 Token Calendar ricevuto:', response);
            if (response.access_token) {
              window.gapi.client.setToken({
                access_token: response.access_token
              });
              
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
              
              console.log('✅ Autenticazione Calendar completata con persistenza avanzata');
            }
          },
          error_callback: (error) => {
            console.error('❌ Errore OAuth Calendar:', error);
            setError(`Errore autenticazione Calendar: ${error.type || error.message}`);
            clearAuthState();
          }
        });

        setTokenClient(client);

        const authState = loadAuthState();
        if (authState) {
          if (authState.needsRefresh && authState.refreshToken) {
            console.log('🔄 Token Calendar salvato necessita refresh...');
            const success = await refreshAccessToken(authState.refreshToken);
            if (success) {
              setIsAuthenticated(true);
              const newExpiry = parseInt(localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY));
              setupTokenRefresh(newExpiry);
            }
          } else if (!authState.needsRefresh) {
            console.log('✅ Ripristino sessione Calendar da storage avanzato...');
            window.gapi.client.setToken({
              access_token: authState.token.access_token
            });
            setIsAuthenticated(true);
            setupTokenRefresh(authState.expiry);
            
            setTimeout(() => performHealthCheck(), 2000);
          }
        }

        console.log('🎉 Google Calendar API inizializzato con persistenza robusta');

      } catch (err) {
        console.error('❌ Errore inizializzazione Calendar:', err);
        setError(`Errore inizializzazione Calendar: ${err.message || err}`);
      }
    };

    initializeGoogleServices();

    // Cleanup al unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadGapiScript, loadGisScript, saveAuthState, setupTokenRefresh, refreshAccessToken, loadAuthState, clearAuthState, performHealthCheck]);

  // Altri useEffect necessari
  useEffect(() => {
    if (isAuthenticated && gapi) {
      fetchAvailableCalendars();
    }
  }, [isAuthenticated, gapi, fetchAvailableCalendars]);

  useEffect(() => {
    if (isAuthenticated && selectedCalendars.length > 0) {
      fetchWeekEvents();
    }
  }, [isAuthenticated, selectedCalendars, fetchWeekEvents]);

  useEffect(() => {
    if (isAuthenticated && selectedCalendars.length > 0) {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh eventi Google Calendar...');
        fetchWeekEvents();
      }, 10 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, selectedCalendars, fetchWeekEvents]);

  // FUNZIONI UTILITY
  const getTodayEvents = useCallback(() => {
    const today = new Date().toDateString();
    return events.filter(event => {
      const eventDate = new Date(event.start).toDateString();
      return eventDate === today;
    });
  }, [events]);

  const getUpcomingEvents = useCallback(() => {
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= now && eventDate <= threeDaysLater;
    }).slice(0, 5);
  }, [events]);

  return {
    // Stati
    events,
    loading,
    error,
    isAuthenticated,
    availableCalendars,
    selectedCalendars,
    loadingCalendars,
    
    // Funzioni auth
    signIn,
    signOut,
    
    // Funzioni calendari
    toggleCalendar,
    selectAllCalendars,
    selectNoneCalendars,
    fetchAvailableCalendars,
    setCustomCalendarName,
    
    // Funzioni eventi
    fetchWeekEvents,
    getTodayEvents,
    getUpcomingEvents,
    refreshEvents: fetchWeekEvents,
    
    // Utility avanzate
    performHealthCheck,
    checkConnectionStatus: () => ({
      isAuthenticated,
      hasRefreshToken: !!localStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY),
      reconnectAttempts: reconnectAttempts.current,
      lastHealthCheck: lastHealthCheckRef.current
    })
  };
};