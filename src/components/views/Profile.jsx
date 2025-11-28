import React, { useState, useEffect } from 'react';
import { User, Mail, Save, AlertCircle, Check, Camera } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { realApiClient } from '../../services/realApiClient';

export const Profile = () => {
    // const { data, updateData } = useAppContext(); // Unused for now
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        avatar_url: '',
        google_id: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const user = await realApiClient.getUserProfile();
            setFormData({
                name: user.name || '',
                email: user.email || '',
                avatar_url: user.avatar_url || '',
                google_id: user.google_id || ''
            });
        } catch (err) {
            console.error('Errore caricamento profilo:', err);
            setError('Impossibile caricare i dati del profilo');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Reset messaggi stato
        if (success) setSuccess(null);
        if (error) setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Il nome è obbligatorio');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const updatedUser = await realApiClient.updateUserProfile({
                name: formData.name,
                avatar_url: formData.avatar_url
            });

            // Aggiorna anche lo stato globale se necessario
            // updateData({ user: updatedUser }); // Se avessimo user nel context

            setSuccess('Profilo aggiornato con successo');

            // Ricarica dati freschi
            setFormData(prev => ({
                ...prev,
                name: updatedUser.name,
                avatar_url: updatedUser.avatar_url
            }));

        } catch (err) {
            console.error('Errore salvataggio profilo:', err);
            setError(err.message || 'Errore durante il salvataggio');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Profilo Utente</h1>
                <p className="text-gray-600">Gestisci le tue informazioni personali</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Header con Avatar */}
                <div className="bg-gray-50 p-6 border-b flex flex-col items-center">
                    <div className="relative">
                        {formData.avatar_url ? (
                            <img
                                src={formData.avatar_url}
                                alt="Avatar"
                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-sm">
                                <User size={40} className="text-blue-500" />
                            </div>
                        )}
                        {/* Placeholder per upload avatar futuro */}
                        <button className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow border hover:bg-gray-50 text-gray-500" title="Cambia avatar (non implementato)">
                            <Camera size={16} />
                        </button>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-gray-900">{formData.name}</h2>
                    <p className="text-gray-500">{formData.email}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Messaggi Feedback */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
                            <Check size={18} />
                            <span>{success}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Nome */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Nome Completo
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                                    placeholder="Il tuo nome"
                                />
                            </div>
                        </div>

                        {/* Email (Read only) */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    disabled
                                    className="pl-10 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm border p-2 cursor-not-allowed"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">L'email non può essere modificata.</p>
                        </div>

                        {/* Avatar URL */}
                        <div>
                            <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 mb-1">
                                URL Avatar
                            </label>
                            <input
                                type="text"
                                id="avatar_url"
                                name="avatar_url"
                                value={formData.avatar_url}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-2"
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </div>

                        {/* Google Account Info */}
                        {formData.google_id && (
                            <div className="pt-4 border-t">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                                        />
                                    </svg>
                                    <span>Account collegato a Google</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`flex items-center space-x-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${saving ? 'opacity-70 cursor-wait' : ''
                                }`}
                        >
                            <Save size={18} />
                            <span>{saving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
