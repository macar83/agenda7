import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

const GoogleCalendarContext = createContext(null);

const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

export const GoogleCalendarProvider = ({ children }) => {
    const queryClient = useQueryClient();
    const { isAuthenticated, accessToken, login, logout, loading: authLoading } = useGoogleAuth();
    const [gapiReady, setGapiReady] = useState(false);

    // PERSISTENZA: Carica stato iniziale da localStorage
    const [selectedCalendars, setSelectedCalendars] = useState(() => {
        try {
            const saved = localStorage.getItem('agenda_selected_calendars');
            return saved ? JSON.parse(saved) : ['primary'];
        } catch (e) {
            return ['primary'];
        }
    });

    const [customNames, setCustomNames] = useState(() => {
        try {
            const saved = localStorage.getItem('agenda_custom_calendar_names');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    useEffect(() => {
        localStorage.setItem('agenda_selected_calendars', JSON.stringify(selectedCalendars));
    }, [selectedCalendars]);

    useEffect(() => {
        localStorage.setItem('agenda_custom_calendar_names', JSON.stringify(customNames));
    }, [customNames]);

    // INIT GAPI (Solo caricamento libreria e client)
    useEffect(() => {
        const initGapi = async () => {
            if (!GOOGLE_API_KEY) return;
            try {
                if (!window.gapi) {
                    await new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://apis.google.com/js/api.js';
                        script.onload = resolve;
                        document.body.appendChild(script);
                    });
                }

                await new Promise(resolve => window.gapi.load('client', resolve));
                await window.gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                });
                setGapiReady(true);
            } catch (err) {
                console.error('❌ GAPI Init error:', err);
            }
        };
        initGapi();
    }, []);

    // IMPOSTA TOKEN QUANDO DISPONIBILE
    useEffect(() => {
        if (gapiReady && accessToken) {
            window.gapi.client.setToken({ access_token: accessToken });
            queryClient.invalidateQueries(['calendar']);
        }
    }, [gapiReady, accessToken, queryClient]);

    // QUERY: LISTA CALENDARI
    const { data: availableCalendars = [], isLoading: loadingCalendars } = useQuery({
        queryKey: ['calendar', 'list', customNames],
        queryFn: async () => {
            if (!gapiReady || !isAuthenticated) return [];
            try {
                const response = await window.gapi.client.calendar.calendarList.list({ minAccessRole: 'reader' });
                return response.result.items.map(cal => ({
                    id: cal.id,
                    name: customNames[cal.id] || cal.summary,
                    originalName: cal.summary,
                    backgroundColor: cal.backgroundColor,
                    primary: cal.primary
                }));
            } catch (e) {
                console.error('Calendar List Error:', e);
                return [];
            }
        },
        enabled: gapiReady && isAuthenticated,
        staleTime: 1000 * 60 * 60,
    });

    // QUERY: EVENTI
    const { data: events = [], isLoading: loadingEvents, error } = useQuery({
        queryKey: ['calendar', 'events', selectedCalendars, customNames],
        queryFn: async () => {
            if (!gapiReady || !isAuthenticated || selectedCalendars.length === 0) return [];

            const now = new Date();
            const endOfWeek = new Date(now);
            endOfWeek.setDate(now.getDate() + 7);

            const allEvents = [];

            for (const calendarId of selectedCalendars) {
                try {
                    const response = await window.gapi.client.calendar.events.list({
                        calendarId: calendarId,
                        timeMin: now.toISOString(),
                        timeMax: endOfWeek.toISOString(),
                        showDeleted: false,
                        singleEvents: true,
                        maxResults: 50,
                        orderBy: 'startTime'
                    });

                    const items = response.result.items || [];
                    const calendarInfo = availableCalendars.find(c => c.id === calendarId) || {};
                    const calendarName = customNames[calendarId] || calendarInfo.name || 'Calendario';

                    allEvents.push(...items.map(event => ({
                        id: event.id,
                        title: event.summary || 'Senza titolo',
                        start: event.start?.dateTime || event.start?.date,
                        end: event.end?.dateTime || event.end?.date,
                        allDay: !event.start?.dateTime,
                        calendarId: calendarId,
                        calendarName: calendarName,
                        calendarColor: calendarInfo.backgroundColor || '#1976d2',
                    })));
                } catch (e) {
                    console.error(`Error fetching calendar ${calendarId}`, e);
                }
            }

            return allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
        },
        enabled: gapiReady && isAuthenticated && selectedCalendars.length > 0,
        refetchInterval: 1000 * 60 * 5,
    });

    const toggleCalendar = useCallback((id) => {
        setSelectedCalendars(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    }, []);

    const selectAllCalendars = useCallback(() => {
        if (availableCalendars.length > 0) {
            setSelectedCalendars(availableCalendars.map(c => c.id));
        }
    }, [availableCalendars]);

    const selectNoneCalendars = useCallback(() => {
        setSelectedCalendars([]);
    }, []);

    const setCustomCalendarName = useCallback((id, name) => {
        setCustomNames(prev => ({
            ...prev,
            [id]: name
        }));
        queryClient.invalidateQueries(['calendar']);
    }, [queryClient]);

    const getTodayEvents = useCallback(() => {
        const now = new Date();
        const todayStr = now.toDateString();
        return events.filter(e => new Date(e.start).toDateString() === todayStr);
    }, [events]);

    const getUpcomingEvents = useCallback(() => {
        const now = new Date();
        return events.filter(e => new Date(e.start) > now).slice(0, 5);
    }, [events]);

    const value = {
        events,
        loading: loadingEvents || loadingCalendars || authLoading,
        error,
        isAuthenticated,
        signIn: login, // Usa login del hook
        signOut: logout, // Usa logout del hook
        availableCalendars,
        selectedCalendars,
        toggleCalendar,
        selectAllCalendars,
        selectNoneCalendars,
        setCustomCalendarName,
        refreshEvents: () => queryClient.invalidateQueries(['calendar', 'events']),
        getTodayEvents,
        getUpcomingEvents
    };

    return (
        <GoogleCalendarContext.Provider value={value}>
            {children}
        </GoogleCalendarContext.Provider>
    );
};

export const useGoogleCalendarContext = () => {
    const context = useContext(GoogleCalendarContext);
    if (!context) {
        throw new Error('useGoogleCalendarContext must be used within a GoogleCalendarProvider');
    }
    return context;
};
