// src/AppWithRealAuth.jsx
import React, { useEffect } from 'react';
import { AlertCircle, X, Bell } from 'lucide-react';
import { RealAuthProvider } from './contexts/RealAuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppContextProvider, useAppContext } from './contexts/AppContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { GoogleCalendarProvider } from './contexts/GoogleCalendarContext';
import { useNotifications } from './hooks/useNotifications';

// Import dei componenti esistenti
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Overview } from './components/views/Overview';
import { ListsView } from './components/views/ListsView';
import { StatsView } from './components/views/StatsView';
import { NotificationSettings } from './components/common/NotificationSettings';
import { Planner } from './components/views/Planner';
import { Profile } from './components/views/Profile';
import { Settings } from './components/views/Settings';

// Main App Component content (usa il context adattato)
const AppWithRealAuthContent = () => {
  const { data, clearError, updateData } = useAppContext();

  // 🔔 Hook notifiche
  const notifications = useNotifications();

  // 🔔 Effetto per avviare controllo notifiche quando autenticato e liste caricate
  useEffect(() => {
    if (notifications.isEnabled && data.lists && data.lists.length > 0) {
      console.log('🔔 Avvio controllo notifiche task con', data.lists.length, 'liste');
      notifications.startPeriodicCheck(data.lists, 1); // Controlla ogni minuto

      return () => {
        notifications.stopPeriodicCheck();
      };
    }
  }, [
    notifications.isEnabled,
    data.lists,
    notifications
  ]);

  // 🔔 Handler per test notifica
  const handleTestNotification = () => {
    notifications.showNotification(
      '🔔 Test Notifica!',
      {
        body: 'Le notifiche funzionano correttamente! 🎉',
        icon: '/favicon.ico'
      }
    );
  };

  // 🔔 Richiesta permesso notifiche
  const handleRequestNotifications = async () => {
    const granted = await notifications.requestPermission();
    if (granted) {
      console.log('✅ Permesso notifiche ottenuto');
      // Avvia controllo se abbiamo liste
      if (data.lists && data.lists.length > 0) {
        notifications.startPeriodicCheck(data.lists, 1);
      }
    }
  };

  const renderContent = () => {
    console.log('🎬 Rendering content for view:', data.currentView);

    switch (data.currentView) {
      case 'overview':
        console.log('📊 Rendering Overview');
        return <Overview />;
      case 'planner':
        console.log('📅 Rendering Planner');
        return <Planner />;
      case 'lists':
        console.log('📋 Rendering Lists');
        return <ListsView />;
      case 'stats':
        console.log('📈 Rendering Stats');
        return <StatsView />;
      case 'notifications':
        console.log('🔔 Rendering Notifications');
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Impostazioni Notifiche</h1>
              <p className="text-gray-600">Gestisci le notifiche per i tuoi task</p>
            </div>

            <NotificationSettings
              isSupported={notifications.isSupported}
              permission={notifications.permission}
              isEnabled={notifications.isEnabled}
              onRequestPermission={handleRequestNotifications}
              onTestNotification={handleTestNotification}
            />

            {/* Informazioni aggiuntive */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Come Funzionano le Notifiche</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Le notifiche vengono inviate <strong>5 minuti prima</strong> della scadenza del reminder</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Solo i task <strong>non completati</strong> con reminder impostato generano notifiche</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Il sistema controlla automaticamente ogni <strong>minuto</strong> se ci sono task in scadenza</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Cliccando sulla notifica, l'app viene portata in primo piano</p>
                </div>
              </div>
            </div>

            {/* Stato debug notifiche */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">Debug Notifiche (Solo Development)</h4>
                <div className="text-xs text-yellow-700 space-y-1">
                  <p>Supporto Browser: {notifications.isSupported ? '✅ Sì' : '❌ No'}</p>
                  <p>Permesso: {notifications.permission}</p>
                  <p>Abilitato: {notifications.isEnabled ? '✅ Sì' : '❌ No'}</p>
                  <p>Liste caricate: {data.lists?.length || 0}</p>
                  <p>Current View: {data.currentView}</p>
                </div>
              </div>
            )}
          </div>
        );
      case 'profile':
        console.log('👤 Rendering Profile');
        return <Profile />;
      case 'settings':
        console.log('⚙️ Rendering Settings');
        return <Settings />;
      case 'help':
        console.log('❓ Rendering Help');
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Aiuto e Supporto</h1>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Come iniziare</h3>
                  <p className="text-gray-600">Crea la tua prima lista dalla sezione "Liste" e aggiungi i tuoi task.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Notifiche</h3>
                  <p className="text-gray-600">Abilita le notifiche per ricevere promemoria sui task in scadenza.</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Integrazioni</h3>
                  <p className="text-gray-600">Connetti Google Calendar e Gmail per una gestione completa.</p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        console.log('❓ Unknown view, fallback to overview:', data.currentView);
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* 🔔 Banner informativo per notifiche (mostra solo se non abilitate) */}
      {notifications.isSupported &&
        !notifications.isEnabled &&
        data.currentView !== 'notifications' && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="text-blue-600" size={16} />
                <span className="text-sm text-blue-800">
                  Abilita le notifiche per essere avvisato quando i tuoi task scadono
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    console.log('🎯 Banner click - navigazione a notifiche');
                    updateData({ currentView: 'notifications' });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Impostazioni
                </button>
                <button
                  onClick={handleRequestNotifications}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  Abilita
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Error Banner */}
      {data.error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{data.error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={clearError}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative">
          {/* Loading Overlay */}
          {data.isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-40">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Caricamento...</p>
              </div>
            </div>
          )}

          {/* Content */}
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// App principale con tutti i provider necessari
const AppWithRealAuth = () => {
  return (
    <RealAuthProvider>
      <ProtectedRoute>
        <QueryClientProvider client={queryClient}>
          <GoogleCalendarProvider>
            <AppContextProvider>
              <AppWithRealAuthContent />
            </AppContextProvider>
          </GoogleCalendarProvider>
        </QueryClientProvider>
      </ProtectedRoute>
    </RealAuthProvider>
  );
};

export default AppWithRealAuth;