import React, { useContext } from 'react';
import { Settings, LogOut, Bell, BellOff } from 'lucide-react';
import AppContext from '../../contexts/AppContext';
import { useNotifications } from '../../hooks/useNotifications';

export const Header = () => {
  const { data, logout, updateData } = useContext(AppContext);
  
  // 🔔 Hook notifiche per mostrare stato
  const notifications = useNotifications();

  const handleLogout = async () => {
    if (window.confirm('Sei sicuro di voler uscire?')) {
      console.log('🚪 Logout confermato dall\'utente');
      try {
        const result = await logout();
        if (result.success) {
          console.log('✅ Logout completato con successo');
          // Il redirect alla schermata di login avverrà automaticamente
          // quando isAuthenticated diventa false
        } else {
          console.error('❌ Errore durante il logout:', result.error);
          // Mostra errore all'utente se necessario
        }
      } catch (error) {
        console.error('❌ Errore logout:', error);
      }
    }
  };

  const handleSettings = () => {
    console.log('⚙️ Apertura impostazioni');
    updateData({ showSettings: !data.showSettings });
  };

  // 🔔 Handler per navigare alle notifiche
  const handleNotifications = () => {
    console.log('🔔 Apertura notifiche');
    updateData({ currentView: 'notifications' });
  };

  // 🔔 Determina quale icona mostrare in base allo stato
  const getNotificationIcon = () => {
    if (!notifications.isSupported) {
      return <BellOff size={20} className="text-gray-400" />;
    }
    
    if (notifications.isEnabled) {
      return <Bell size={20} className="text-green-600" />;
    }
    
    return <Bell size={20} className="text-gray-500" />;
  };

  // 🔔 Tooltip basato sullo stato
  const getNotificationTooltip = () => {
    if (!notifications.isSupported) {
      return 'Notifiche non supportate';
    }
    
    if (notifications.isEnabled) {
      return 'Notifiche attive - Clicca per gestire';
    }
    
    return 'Notifiche disattivate - Clicca per abilitare';
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">Task Manager Pro</h1>
            <span className="text-sm text-gray-500">
              Benvenuto, {data.user?.name || 'Utente'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* 🔔 NUOVO: Icona Notifiche */}
            <div className="relative">
              <button 
                onClick={handleNotifications}
                className={`p-2 transition-colors relative ${
                  data.currentView === 'notifications' 
                    ? 'text-blue-600 bg-blue-50 rounded-lg' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title={getNotificationTooltip()}
              >
                {getNotificationIcon()}
                
                {/* Badge per indicare se sono attive */}
                {notifications.isEnabled && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                )}
                
                {/* Badge per indicare se non sono supportate */}
                {!notifications.isSupported && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              
              {/* 🔔 Badge con testo per chiarezza */}
              {!notifications.isEnabled && notifications.isSupported && (
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                  !
                </span>
              )}
            </div>

            <button 
              onClick={handleSettings}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors" 
              title="Impostazioni"
            >
              <Settings size={20} />
            </button>
            
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 transition-colors" 
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};