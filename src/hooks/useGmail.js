import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGoogleAuth } from './useGoogleAuth';

const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;

export const useGmail = () => {
    const queryClient = useQueryClient();
    const { isAuthenticated, accessToken, login, logout, loading: authLoading } = useGoogleAuth();
    const [gapiReady, setGapiReady] = useState(false);

    // INIT
    useEffect(() => {
        const init = async () => {
            if (!GOOGLE_API_KEY) return;
            try {
                if (!window.gapi) {
                    await new Promise(resolve => {
                        const script = document.createElement('script');
                        script.src = 'https://apis.google.com/js/api.js';
                        script.onload = resolve;
                        document.body.appendChild(script);
                    });
                }

                await new Promise(resolve => window.gapi.load('client', resolve));
                await window.gapi.client.init({ apiKey: GOOGLE_API_KEY, discoveryDocs: [] });
                setGapiReady(true);
            } catch (err) { console.error(err); }
        };
        init();
    }, []);

    // IMPOSTA TOKEN
    useEffect(() => {
        if (gapiReady && accessToken) {
            window.gapi.client.setToken({ access_token: accessToken });
            queryClient.invalidateQueries(['gmail']);
        }
    }, [gapiReady, accessToken, queryClient]);

    // QUERY: LABELS
    const { data: labelColors = {} } = useQuery({
        queryKey: ['gmail', 'labels'],
        queryFn: async () => {
            if (!gapiReady || !isAuthenticated) return {};
            try {
                const response = await window.gapi.client.gmail.users.labels.list({ userId: 'me' });
                const colors = {};
                (response.result.labels || []).forEach(l => {
                    if (l.color) colors[l.id] = {
                        backgroundColor: l.color.backgroundColor,
                        textColor: l.color.textColor
                    };
                });
                return colors;
            } catch (e) {
                return {};
            }
        },
        enabled: gapiReady && isAuthenticated,
        staleTime: Infinity
    });

    // QUERY: EMAILS
    const { data: emails = [], isLoading, error, refetch } = useQuery({
        queryKey: ['gmail', 'messages', 'inbox'],
        queryFn: async () => {
            if (!gapiReady || !isAuthenticated) return [];

            if (!window.gapi.client.gmail) {
                await window.gapi.client.load('gmail', 'v1');
            }

            try {
                const response = await window.gapi.client.gmail.users.messages.list({
                    userId: 'me',
                    maxResults: 10,
                    q: 'in:inbox'
                });

                const messages = response.result.messages || [];
                if (messages.length === 0) return [];

                const details = await Promise.all(
                    messages.map(async (msg) => {
                        try {
                            const detail = await window.gapi.client.gmail.users.messages.get({
                                userId: 'me',
                                id: msg.id,
                                format: 'full'
                            });
                            const headers = detail.result.payload.headers;
                            return {
                                id: msg.id,
                                from: headers.find(h => h.name === 'From')?.value || 'Sconosciuto',
                                subject: headers.find(h => h.name === 'Subject')?.value || '(No Subject)',
                                date: headers.find(h => h.name === 'Date')?.value,
                                snippet: detail.result.snippet,
                                isUnread: (detail.result.labelIds || []).includes('UNREAD'),
                                labelIds: detail.result.labelIds || []
                            };
                        } catch { return null; }
                    })
                );
                return details.filter(Boolean);
            } catch (e) {
                throw e;
            }
        },
        enabled: gapiReady && isAuthenticated,
        refetchInterval: 1000 * 60 * 2,
    });

    const markAsRead = async (id) => {
        await window.gapi.client.gmail.users.messages.modify({
            userId: 'me',
            id: id,
            removeLabelIds: ['UNREAD']
        });
        queryClient.invalidateQueries(['gmail', 'messages']);
    };

    const archiveEmail = async (id) => {
        await window.gapi.client.gmail.users.messages.modify({
            userId: 'me',
            id: id,
            removeLabelIds: ['INBOX']
        });
        queryClient.invalidateQueries(['gmail', 'messages']);
    };

    return {
        emails,
        loading: isLoading || authLoading,
        error,
        isAuthenticated,
        signIn: login,
        signOut: logout,
        fetchRecentEmails: refetch,
        markAsRead,
        archiveEmail,
        labelColors,
        getUnreadCount: () => emails.filter(e => e.isUnread).length,
        formatEmailDate: (d) => new Date(d).toLocaleDateString()
    };
};
