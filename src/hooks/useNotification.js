// src/hooks/useNotifications.js
import { useState, useEffect, useRef } from 'react';

export const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [isSupported, setIsSupported] = useState('Notification' in window);
  const intervalRef = useRef(null);
  const notifiedTasksRef = useRef(new Set()); // Traccia i task già notificati

  // Richiedi permesso notifiche
  const requestPermission = async () => {
    if (!isSupported) {
      console.warn('❌ Notifiche non supportate in questo browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log('🔔 Permesso notifiche:', result);
      return result === 'granted';
    } catch (error) {
      console.error('❌ Errore richiesta permesso notifiche:', error);
      return false;
    }
  };

  // Mostra notifica singola
  const showNotification = (title, options = {}) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('❌ Notifiche non disponibili');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'task-reminder',
        requireInteraction: true, // Rimane fino a click
        ...options
      });

      // Auto-close dopo 10 secondi se non cliccata
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    } catch (error) {
      console.error('❌ Errore creazione notifica:', error);
      return null;
    }
  };

  // Notifica per task in scadenza
  const notifyTaskDue = (task, list) => {
    const notificationKey = `${task.id}-${task.reminder}`;
    
    // Evita notifiche duplicate
    if (notifiedTasksRef.current.has(notificationKey)) {
      return;
    }

    const notification = showNotification(
      `⏰ Task in Scadenza!`,
      {
        body: `"${task.title}" dalla lista "${list?.name || 'Senza lista'}"`,
        icon: '/favicon.ico',
        tag: `task-${task.id}`,
        data: { taskId: task.id, listId: list?.id },
        actions: [
          {
            action: 'mark-complete',
            title: '✅ Completa'
          },
          {
            action: 'snooze',
            title: '⏰ Posticipa 15min'
          }
        ]
      }
    );

    if (notification) {
      // Segna come notificato
      notifiedTasksRef.current.add(notificationKey);
      
      // Click sulla notifica
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Puoi aggiungere logica per navigare al task
        console.log('🖱️ Notifica cliccata per task:', task.id);
      };

      // Gestione azioni (se supportate)
      notification.onnotificationclick = (event) => {
        console.log('🎯 Azione notifica:', event.action);
        
        switch (event.action) {
          case 'mark-complete':
            // Logica per completare il task
            console.log('✅ Richiesta completamento task:', task.id);
            break;
          case 'snooze':
            // Logica per posticipare
            console.log('⏰ Richiesta posticipo task:', task.id);
            break;
        }
        
        notification.close();
      };

      console.log('🔔 Notifica inviata per task:', task.title);
    }
  };

  // Controlla task in scadenza
  const checkDueTasks = (lists = []) => {
    if (!isSupported || permission !== 'granted') return;

    const now = new Date();
    const in5Minutes = new Date(now.getTime() + 5 * 60 * 1000);

    lists.forEach(list => {
      if (!list.tasks) return;

      list.tasks.forEach(task => {
        // Salta task già completati
        if (task.completed) return;
        
        // Controlla solo task con reminder
        if (!task.reminder) return;

        const reminderTime = new Date(task.reminder);
        
        // Notifica se il reminder è tra ora e i prossimi 5 minuti
        if (reminderTime <= in5Minutes && reminderTime > now) {
          notifyTaskDue(task, list);
        }
      });
    });
  };

  // Avvia controllo periodico
  const startPeriodicCheck = (lists = [], intervalMinutes = 1) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Controllo iniziale
    checkDueTasks(lists);

    // Controllo periodico ogni X minuti
    intervalRef.current = setInterval(() => {
      checkDueTasks(lists);
    }, intervalMinutes * 60 * 1000);

    console.log(`🔄 Controllo notifiche avviato (ogni ${intervalMinutes} min)`);
  };

  // Ferma controllo periodico
  const stopPeriodicCheck = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏹️ Controllo notifiche fermato');
    }
  };

  // Pulisci alla smontatura del componente
  useEffect(() => {
    return () => {
      stopPeriodicCheck();
    };
  }, []);

  // Reset notifiche quando cambiano i permessi
  useEffect(() => {
    if (permission === 'granted') {
      notifiedTasksRef.current.clear();
    }
  }, [permission]);

  return {
    // Stato
    isSupported,
    permission,
    isEnabled: permission === 'granted',
    
    // Funzioni
    requestPermission,
    showNotification,
    notifyTaskDue,
    checkDueTasks,
    startPeriodicCheck,
    stopPeriodicCheck,
    
    // Utility
    clearNotifiedTasks: () => notifiedTasksRef.current.clear()
  };
};