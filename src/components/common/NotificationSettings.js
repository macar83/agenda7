// src/components/common/NotificationSettings.jsx
import React from 'react';
import { Bell, BellOff, AlertCircle, Check, X } from 'lucide-react';

export const NotificationSettings = ({ 
  isSupported, 
  permission, 
  isEnabled, 
  onRequestPermission,
  onTestNotification 
}) => {
  
  const getPermissionStatus = () => {
    if (!isSupported) {
      return {
        icon: <X className="text-red-500" size={20} />,
        text: 'Non supportate',
        description: 'Il tuo browser non supporta le notifiche',
        color: 'red'
      };
    }

    switch (permission) {
      case 'granted':
        return {
          icon: <Check className="text-green-500" size={20} />,
          text: 'Attivate',
          description: 'Riceverai notifiche per i task in scadenza',
          color: 'green'
        };
      case 'denied':
        return {
          icon: <X className="text-red-500" size={20} />,
          text: 'Bloccate',
          description: 'Abilita le notifiche nelle impostazioni del browser',
          color: 'red'
        };
      default:
        return {
          icon: <AlertCircle className="text-yellow-500" size={20} />,
          text: 'Non richieste',
          description: 'Clicca per abilitare le notifiche',
          color: 'yellow'
        };
    }
  };

  const status = getPermissionStatus();

  const handleTestNotification = () => {
    if (isEnabled) {
      onTestNotification();
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <Bell className="text-blue-500" size={24} />
        <h3 className="text-lg font-semibold text-gray-900">Notifiche Task</h3>
      </div>

      {/* Stato attuale */}
      <div className={`border rounded-lg p-4 ${
        status.color === 'green' ? 'border-green-200 bg-green-50' :
        status.color === 'red' ? 'border-red-200 bg-red-50' :
        'border-yellow-200 bg-yellow-50'
      }`}>
        <div className="flex items-center space-x-3">
          {status.icon}
          <div>
            <p className="font-medium text-gray-900">{status.text}</p>
            <p className="text-sm text-gray-600">{status.description}</p>
          </div>
        </div>
      </div>

      {/* Azioni */}
      <div className="space-y-3">
        {!isEnabled && isSupported && permission !== 'denied' && (
          <button
            onClick={onRequestPermission}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Bell size={16} />
            <span>Abilita Notifiche</span>
          </button>
        )}

        {isEnabled && (
          <button
            onClick={handleTestNotification}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Bell size={16} />
            <span>Testa Notifica</span>
          </button>
        )}

        {permission === 'denied' && (
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-medium">Come abilitare le notifiche:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Clicca sull'icona del lucchetto nella barra degli indirizzi</li>
              <li>Seleziona "Consenti" per le notifiche</li>
              <li>Ricarica la pagina</li>
            </ol>
          </div>
        )}
      </div>

      {/* Info aggiuntive */}
      {isEnabled && (
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
          <p>• Le notifiche appaiono 5 minuti prima della scadenza</p>
          <p>• Vengono controllate ogni minuto automaticamente</p>
          <p>• Solo per task con reminder impostato</p>
        </div>
      )}
    </div>
  );
};