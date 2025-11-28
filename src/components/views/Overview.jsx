import React, { useContext } from 'react';
import { Calendar, BarChart3, Clock, AlertCircle, ArrowRight, ExternalLink, Rss, Mail } from 'lucide-react';
import AppContext from '../../contexts/AppContext';
import { useNewsRSS } from '../../hooks/useNewsRSS';

// 🔧 FIX: Import degli hook con autenticazione persistente
// import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { useGmail } from '../../hooks/useGmail';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';

import { RSSSourceSelector } from '../common/RSSSourceSelector';
import { CalendarWidget } from '../common/CalendarWidget';
import { GmailWidget } from '../common/GmailWidget';

export const Overview = () => {
  const { data, updateData } = useContext(AppContext);
  const { news, loading: newsLoading, error: newsError, sources } = useNewsRSS(data.selectedRssSource);

  // 🔧 FIX: Usa direttamente gli hook Google con persistenza
  // Hook Google Calendar con calendari multipli
  const {
    events,
    loading: calendarLoading,
    error: calendarError,
    isAuthenticated: isCalendarAuthenticated,
    signIn: signInCalendar,
    refreshEvents,
    getTodayEvents,
    getUpcomingEvents,
    availableCalendars,
    selectedCalendars,
    loadingCalendars,
    toggleCalendar,
    selectAllCalendars,
    selectNoneCalendars,
    setCustomCalendarName
  } = useGoogleCalendar();

  // Hook Gmail
  const {
    emails,
    loading: gmailLoading,
    error: gmailError,
    isAuthenticated: isGmailAuthenticated,
    signIn: signInGmail,
    fetchRecentEmails,
    formatEmailDate,
    getUnreadCount,
    markAsRead,
    archiveEmail,
    labelColors
  } = useGmail();

  // 🔧 DEBUG: Verifica che le funzioni siano disponibili
  console.log('📧 Gmail functions debug:', {
    hasMarkAsRead: !!markAsRead,
    hasArchiveEmail: !!archiveEmail,
    hasLabelColors: !!labelColors,
    labelColorsKeys: Object.keys(labelColors || {}).length,
    isGmailAuthenticated,
    gmailEmailsCount: emails.length
  });

  console.log('📅 Calendar functions debug:', {
    hasToggleCalendar: !!toggleCalendar,
    hasSetCustomCalendarName: !!setCustomCalendarName,
    isCalendarAuthenticated,
    eventsCount: events.length,
    calendarsCount: availableCalendars.length
  });

  // 🔧 FIX: Controllo di sicurezza robusto per evitare errori con data.lists
  console.log('🔍 Overview Debug - data object:', data);
  console.log('🔍 Overview Debug - data.lists:', data.lists, 'type:', typeof data.lists);

  const lists = Array.isArray(data.lists) ? data.lists : [];

  // 🔧 FIX: Debug per verificare struttura dati
  console.log('🔍 Overview Lists Full Debug:', {
    listsCount: lists.length,
    firstListStructure: lists[0] ? Object.keys(lists[0]) : 'nessuna lista',
    firstListData: lists[0] || null
  });

  // 🔧 FIX: Calcoli con supporto entrambi i formati (camelCase e snake_case)
  const totalTasks = lists.reduce((sum, list) => {
    const total = list.totalTasks || list.total_tasks || 0;
    return sum + total;
  }, 0);

  const incompleteTasks = lists.reduce((sum, list) => {
    const incomplete = list.incompleteTasks || list.incomplete_tasks || 0;
    return sum + incomplete;
  }, 0);

  const completedTasks = totalTasks - incompleteTasks;

  // 🔧 FIX: Calcola task in scadenza oggi (semplificato per ora)
  // const tasksToday = 0; // Il backend /lists non include task individuali

  // 📅 Calcola eventi di oggi dal calendario
  const todayEvents = getTodayEvents ? getTodayEvents() : [];
  const upcomingEvents = getUpcomingEvents ? getUpcomingEvents() : [];

  console.log('📅 Eventi oggi debug:', {
    todayEventsCount: todayEvents.length,
    isCalendarAuthenticated,
    events: events.length,
    todayEventsPreview: todayEvents.slice(0, 3).map(e => ({ title: e.title, start: e.start }))
  });

  const handleRssSourceChange = (sourceId) => {
    console.log('📰 Changing RSS source to:', sourceId);
    updateData({ selectedRssSource: sourceId });
  };

  // Gestione click su liste  
  const handleListClick = (list) => {
    console.log('📋 Clicking on list:', list.name);
    updateData({
      currentView: 'lists',
      selectedList: list
    });
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data non valida';
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panoramica</h1>
        <p className="text-gray-600">Il tuo centro di controllo personale</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Task Totali</p>
              <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
            </div>
            <BarChart3 className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Da Completare</p>
              <p className="text-2xl font-bold text-gray-900">{incompleteTasks}</p>
            </div>
            <Clock className="text-orange-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completati</p>
              <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
            </div>
            <BarChart3 className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Email Non Lette</p>
              <p className="text-2xl font-bold text-gray-900">{getUnreadCount ? getUnreadCount() : 0}</p>
              {isGmailAuthenticated && (
                <p className="text-xs text-gray-400 mt-1">
                  su {emails.length} recenti
                </p>
              )}
            </div>
            <Mail className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {/* Contenuto principale con layout a griglia - 3 colonne */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Quick Lists */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Calendar size={20} className="text-blue-500" />
            <span>Le Tue Liste</span>
          </h3>

          {lists.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="mx-auto text-gray-400 mb-3" size={32} />
              <p className="text-gray-500 text-sm mb-3">Nessuna lista ancora creata</p>
              <button
                onClick={() => updateData({ currentView: 'lists' })}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Crea la tua prima lista →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lists.slice(0, 4).map(list => {
                // 🔧 DEBUG: Aggiungi console.log per ogni lista
                console.log('🔍 Rendering list:', {
                  id: list.id,
                  name: list.name,
                  color: list.color,
                  totalTasks: list.totalTasks,
                  total_tasks: list.total_tasks,
                  incompleteTasks: list.incompleteTasks,
                  incomplete_tasks: list.incomplete_tasks
                });

                return (
                  <button
                    key={list.id}
                    onClick={() => handleListClick(list)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: list.color || '#3B82F6' }}
                      />
                      <div className="flex-1 min-w-0">
                        {/* 🔧 FIX: Nome lista con fallback e debug */}
                        <p className="font-medium text-gray-900 truncate">
                          {list.name || 'Lista senza nome'}
                        </p>
                        {/* 🔧 FIX: Conteggio task con entrambi i formati */}
                        <p className="text-sm text-gray-500">
                          {list.incompleteTasks || list.incomplete_tasks || 0} di {list.totalTasks || list.total_tasks || 0} task
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="text-gray-400 flex-shrink-0" size={16} />
                  </button>
                );
              })}

              {lists.length > 4 && (
                <button
                  onClick={() => updateData({ currentView: 'lists' })}
                  className="w-full p-2 text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Vedi tutte le {lists.length} liste →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Google Calendar Widget */}
        <CalendarWidget
          events={events}
          todayEvents={todayEvents}
          upcomingEvents={upcomingEvents}
          loading={calendarLoading}
          error={calendarError}
          isAuthenticated={isCalendarAuthenticated}
          onSignIn={signInCalendar}
          onRefresh={refreshEvents}
          availableCalendars={availableCalendars}
          selectedCalendars={selectedCalendars}
          loadingCalendars={loadingCalendars}
          onToggleCalendar={toggleCalendar}
          onSelectAllCalendars={selectAllCalendars}
          onSelectNoneCalendars={selectNoneCalendars}
          onSetCustomCalendarName={setCustomCalendarName}
        />

        {/* Gmail Widget */}
        <GmailWidget
          emails={emails}
          loading={gmailLoading}
          error={gmailError}
          isAuthenticated={isGmailAuthenticated}
          onSignIn={signInGmail}
          onRefresh={fetchRecentEmails}
          formatEmailDate={formatEmailDate}
          getUnreadCount={getUnreadCount}
          onMarkAsRead={markAsRead}
          onArchiveEmail={archiveEmail}
          labelColors={labelColors}
        />
      </div>

      {/* News RSS */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Rss size={20} className="text-orange-500" />
            <span>Ultime Notizie</span>
          </h3>

          <RSSSourceSelector
            sources={sources}
            selectedSourceId={data.selectedRssSource}
            onSourceChange={handleRssSourceChange}
          />
        </div>

        {newsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2 text-gray-600">Caricamento notizie...</span>
          </div>
        )}

        {newsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="text-red-500" size={16} />
              <p className="text-red-700 text-sm">{typeof newsError === 'object' ? (newsError.message || 'Errore sconosciuto') : newsError}</p>
            </div>
          </div>
        )}

        {!newsLoading && !newsError && news.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.slice(0, 6).map((article, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{article.title}</h4>
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{article.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{formatDate(article.pubDate)}</span>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>Leggi</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!newsLoading && !newsError && news.length === 0 && (
          <div className="text-center py-8">
            <Rss className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-gray-500">Nessuna notizia disponibile al momento</p>
          </div>
        )}
      </div>
    </div>
  );
};