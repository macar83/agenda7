import React from 'react';
import { Moon, Sun, Volume2, VolumeX, Rss, Settings as SettingsIcon } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { RSSSourceSelector } from '../common/RSSSourceSelector';
import { useNewsRSS } from '../../hooks/useNewsRSS';

export const Settings = () => {
    const { data, toggleTheme, toggleSound, setRssSource } = useAppContext();
    const { sources } = useNewsRSS();

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
                <p className="text-gray-600">Personalizza la tua esperienza</p>
            </div>

            <div className="space-y-6">

                {/* Aspetto */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <SettingsIcon size={20} className="text-gray-500" />
                        Aspetto e Comportamento
                    </h2>

                    <div className="space-y-4">
                        {/* Tema */}
                        <div className="flex items-center justify-between py-3 border-b last:border-0">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${data.theme === 'dark' ? 'bg-indigo-100 text-indigo-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                    {data.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Tema Scuro</p>
                                    <p className="text-sm text-gray-500">
                                        {data.theme === 'dark' ? 'Attivo' : 'Disattivato'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${data.theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${data.theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Suoni */}
                        <div className="flex items-center justify-between py-3 border-b last:border-0">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${data.soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                    {data.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Effetti Sonori</p>
                                    <p className="text-sm text-gray-500">
                                        {data.soundEnabled ? 'Attivi' : 'Disattivati'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={toggleSound}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${data.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${data.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contenuti */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Rss size={20} className="text-orange-500" />
                        Contenuti e Notizie
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <p className="font-medium text-gray-900">Fonte Notizie Predefinita</p>
                                <p className="text-sm text-gray-500">Scegli da dove ricevere le ultime news nella dashboard</p>
                            </div>
                            <div className="w-48">
                                <RSSSourceSelector
                                    sources={sources}
                                    selectedSourceId={data.selectedRssSource}
                                    onSourceChange={setRssSource}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info App */}
                <div className="text-center text-sm text-gray-400 pt-8">
                    <p>Agenda App v1.0.0</p>
                    <p>© 2025 Marco Carboni</p>
                </div>

            </div>
        </div>
    );
};
