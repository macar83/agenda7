import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Plus, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';

export const Planner = () => {
    const { data, createTask, toggleTask } = useAppContext();
    const {
        isAuthenticated: isCalendarAuthenticated,
        signIn: signInCalendar,
        getTodayEvents
    } = useGoogleCalendar();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');

    // Aggiorna l'orario corrente ogni minuto
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Filtra i task non completati
    const allTasks = Array.isArray(data.lists)
        ? data.lists.flatMap(list => list.tasks || [])
        : [];

    // In una implementazione reale, dovremmo avere i task caricati. 
    // Qui assumiamo che data.lists contenga i task se caricati con loadListWithTasks
    // Ma per ora usiamo i dati disponibili.

    const incompleteTasks = allTasks.filter(t => !t.completed);

    const highPriorityTasks = incompleteTasks.filter(t => t.priority === 'high');
    const otherTasks = incompleteTasks.filter(t => t.priority !== 'high');

    // Eventi di oggi
    const todayEvents = getTodayEvents ? getTodayEvents() : [];

    // Genera ore per la timeline (6:00 - 23:00)
    const hours = Array.from({ length: 18 }, (_, i) => i + 6);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        // Trova una lista di default (la prima disponibile)
        const defaultList = data.lists && data.lists.length > 0 ? data.lists[0] : null;

        if (!defaultList) {
            alert('Crea prima una lista per aggiungere task!');
            return;
        }

        try {
            await createTask(defaultList.id, {
                title: newTaskTitle,
                priority: newTaskPriority
            });
            setNewTaskTitle('');
        } catch (error) {
            console.error('Errore creazione task:', error);
        }
    };

    const getEventStyle = (event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);

        // Calcola posizione e altezza basati sui minuti dall'inizio della giornata (06:00)
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const endMinutes = end.getHours() * 60 + end.getMinutes();
        const dayStartMinutes = 6 * 60; // 06:00

        const top = Math.max(0, startMinutes - dayStartMinutes);
        const duration = Math.max(30, endMinutes - startMinutes); // Minimo 30 min altezza

        return {
            top: `${(top / 60) * 64}px`, // 64px per ora
            height: `${(duration / 60) * 64}px`,
            position: 'absolute',
            width: '90%',
            right: '0'
        };
    };

    return (
        <div className="flex h-full bg-white overflow-hidden">
            {/* Colonna Sinistra: Timeline */}
            <div className="w-1/3 border-r flex flex-col bg-gray-50">
                <div className="p-4 border-b bg-white">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Clock size={20} className="text-blue-500" />
                        Timeline Oggi
                    </h2>
                    <p className="text-sm text-gray-500">
                        {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto relative p-4">
                    {!isCalendarAuthenticated ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500 mb-4">Connetti Google Calendar per vedere la tua giornata.</p>
                            <button
                                onClick={signInCalendar}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                            >
                                Connetti Calendar
                            </button>
                        </div>
                    ) : (
                        <div className="relative" style={{ height: `${hours.length * 64}px` }}>
                            {/* Griglia Ore */}
                            {hours.map(hour => (
                                <div key={hour} className="absolute w-full border-t border-gray-200" style={{ top: `${(hour - 6) * 64}px`, height: '64px' }}>
                                    <span className="text-xs text-gray-400 -mt-2.5 block bg-gray-50 w-10">{hour}:00</span>
                                </div>
                            ))}

                            {/* Indicatore Ora Corrente */}
                            {(() => {
                                const now = currentTime;
                                const minutes = now.getHours() * 60 + now.getMinutes();
                                const top = Math.max(0, minutes - (6 * 60));
                                if (now.getHours() >= 6 && now.getHours() <= 23) {
                                    return (
                                        <div
                                            className="absolute w-full border-t-2 border-red-500 z-10 flex items-center"
                                            style={{ top: `${(top / 60) * 64}px` }}
                                        >
                                            <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Eventi */}
                            {todayEvents.map((event, index) => (
                                <div
                                    key={event.id || index}
                                    className="bg-blue-100 border-l-4 border-blue-500 rounded p-2 text-xs overflow-hidden hover:z-20 hover:shadow-md transition-all"
                                    style={getEventStyle(event)}
                                    title={`${event.title} (${new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                                >
                                    <div className="font-semibold text-blue-800 truncate">{event.title}</div>
                                    <div className="text-blue-600">
                                        {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                        {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Colonna Destra: Task Focus */}
            <div className="w-2/3 flex flex-col bg-white">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold text-gray-900">Daily Focus</h1>
                    <p className="text-gray-600">Cosa vuoi ottenere oggi?</p>

                    {/* Quick Add Task */}
                    <form onSubmit={handleCreateTask} className="mt-4 flex gap-2">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Aggiungi un task veloce..."
                            className="flex-1 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value)}
                            className="border rounded-md px-2 py-2 text-sm bg-gray-50"
                        >
                            <option value="high">Alta</option>
                            <option value="medium">Media</option>
                            <option value="low">Bassa</option>
                        </select>
                        <button
                            type="submit"
                            disabled={!newTaskTitle.trim()}
                            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Plus size={20} />
                        </button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Must Do */}
                    <div>
                        <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
                            <AlertCircle size={20} />
                            Priorità Alta (Must Do)
                        </h3>
                        {highPriorityTasks.length === 0 ? (
                            <p className="text-gray-400 italic text-sm">Nessun task urgente. Ottimo!</p>
                        ) : (
                            <div className="space-y-2">
                                {highPriorityTasks.map(task => (
                                    <div key={task.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100 group">
                                        <button
                                            onClick={() => toggleTask(task.id)}
                                            className="mt-0.5 text-red-400 hover:text-red-600"
                                        >
                                            <Circle size={20} />
                                        </button>
                                        <div className="flex-1">
                                            <p className="text-gray-900 font-medium">{task.title}</p>
                                            {task.details && <p className="text-xs text-gray-500 mt-1">{task.details}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* To Do List */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <CheckCircle2 size={20} />
                            Altri Task
                        </h3>
                        {otherTasks.length === 0 ? (
                            <p className="text-gray-400 italic text-sm">Tutto pulito.</p>
                        ) : (
                            <div className="space-y-2">
                                {otherTasks.map(task => (
                                    <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                                        <button
                                            onClick={() => toggleTask(task.id)}
                                            className="mt-0.5 text-gray-400 hover:text-green-600"
                                        >
                                            <Circle size={20} />
                                        </button>
                                        <div className="flex-1">
                                            <p className="text-gray-900 font-medium">{task.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
