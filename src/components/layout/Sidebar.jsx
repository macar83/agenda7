import React, { useContext } from 'react';
import { Eye, Calendar, BarChart3, Bell, User, Settings, HelpCircle, Layout } from 'lucide-react';
import AppContext from '../../contexts/AppContext';

export const Sidebar = () => {
  const { data, updateData } = useContext(AppContext);

  // Menu items principali
  const menuItems = [
    {
      id: 'overview',
      icon: Eye,
      label: 'Panoramica',
      description: 'Dashboard principale',
      current: data.currentView === 'overview'
    },
    {
      id: 'planner',
      icon: Layout,
      label: 'Daily Planner',
      description: 'Pianifica la tua giornata',
      current: data.currentView === 'planner'
    },
    {
      id: 'lists',
      icon: Calendar,
      label: 'Liste',
      description: 'Gestisci i tuoi task',
      current: data.currentView === 'lists'
    },
    {
      id: 'stats',
      icon: BarChart3,
      label: 'Statistiche',
      description: 'Analizza la produttività',
      current: data.currentView === 'stats'
    }
  ];

  // Sezione impostazioni separata
  const settingsItems = [
    {
      id: 'profile',
      icon: User,
      label: 'Profilo',
      description: 'Gestisci il tuo account'
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Impostazioni',
      description: 'Preferenze app'
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Aiuto',
      description: 'Guide e supporto'
    }
  ];

  const handleMenuClick = (viewId) => {
    console.log('📱 Sidebar - Click su:', viewId);
    console.log('📱 Sidebar - Stato attuale:', data.currentView);

    try {
      updateData({ currentView: viewId, selectedList: null });
      console.log('✅ Sidebar - Navigazione richiesta a:', viewId);
    } catch (error) {
      console.error('❌ Errore durante updateData:', error);
    }
  };

  // 🔔 NUOVO: Contatore badge per notifiche non lette (esempio)
  const getNotificationBadge = () => {
    // Qui potresti aggiungere logica per contare notifiche non lette
    // Per ora ritorna null
    return null;
  };

  // 🐛 DEBUG: Log dello stato corrente
  console.log('🔍 Sidebar Debug - Current view:', data.currentView);

  return (
    <aside className="w-64 bg-white shadow-sm border-r flex flex-col">
      {/* Header Sidebar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Calendar className="text-white" size={16} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Task Manager</h2>
            <p className="text-xs text-gray-500">Benvenuto, {data.user?.name || 'Utente'}</p>
          </div>
        </div>
      </div>

      {/* Menu Principale */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
            Menu Principale
          </div>

          {menuItems.map(item => {
            const Icon = item.icon;
            const notificationCount = item.id === 'notifications' ? getNotificationBadge() : null;

            return (
              <button
                key={item.id}
                onClick={() => {
                  console.log('🎯 Click su menu item:', item.id);
                  handleMenuClick(item.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors group relative ${item.current
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <Icon size={20} className={item.current ? 'text-blue-700' : 'text-gray-500'} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{item.label}</span>
                      {/* Badge notifiche (se presenti) */}
                      {notificationCount && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {notificationCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 group-hover:text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sezione Impostazioni */}
        <div className="mt-8 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
            Impostazioni
          </div>

          {settingsItems.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  console.log('🎯 Click su settings item:', item.id);
                  handleMenuClick(item.id);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors group ${data.currentView === item.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Icon size={18} className="text-gray-500" />
                <div className="flex-1">
                  <span className="text-sm font-medium">{item.label}</span>
                  <p className="text-xs text-gray-500 group-hover:text-gray-600">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer Sidebar con informazioni */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="text-blue-600" size={16} />
            <span className="text-sm font-medium text-blue-900">Task Manager Pro</span>
          </div>
          <p className="text-xs text-blue-700">
            Gestisci i tuoi task in modo efficiente e produttivo
          </p>
        </div>
      </div>

      {/* 🐛 DEBUG: Panel per debugging (solo in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-4 border-t bg-gray-100">
          <div className="text-xs text-gray-600">
            <strong>Debug Sidebar:</strong><br />
            Current View: {data.currentView}<br />
            updateData: {typeof updateData}
          </div>
        </div>
      )}
    </aside>
  );
};