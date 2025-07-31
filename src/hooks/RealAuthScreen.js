// src/components/auth/RealAuthScreen.jsx
import React, { useState } from 'react';
import { useRealAuthContext } from '../../contexts/RealAuthContext';
import { Eye, EyeOff, Mail, Lock, User, Loader } from 'lucide-react';

export const RealAuthScreen = () => {
  const { login, register, isLoading, error, clearError } = useRealAuthContext();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    // Validazione email
    if (!formData.email.trim()) {
      errors.email = 'Email richiesta';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email non valida';
    }

    // Validazione password
    if (!formData.password) {
      errors.password = 'Password richiesta';
    } else if (formData.password.length < 6) {
      errors.password = 'Password di almeno 6 caratteri';
    }

    // Validazione per registrazione
    if (!isLogin) {
      if (!formData.name.trim()) {
        errors.name = 'Nome richiesto';
      } else if (formData.name.trim().length < 2) {
        errors.name = 'Nome di almeno 2 caratteri';
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Le password non coincidono';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setFormErrors({});

    // Validazione client-side
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Chiamata API
    let result;
    if (isLogin) {
      result = await login({
        email: formData.email.trim(),
        password: formData.password
      });
    } else {
      result = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
    }

    // In caso di errore, il context gestisce già l'error state
    if (!result.success) {
      console.log('❌ Auth failed:', result.error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Rimuovi errore quando l'utente inizia a digitare
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (error) {
      clearError();
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    });
    setFormErrors({});
    clearError();
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Task Manager Pro</h1>
          <p className="text-blue-100">
            {isLogin ? 'Accedi al tuo account' : 'Crea un nuovo account'}
          </p>
        </div>

        <div className="p-8">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-red-800 text-sm font-medium">Errore</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome (solo per registrazione) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Il tuo nome completo"
                    disabled={isLoading}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-red-600 text-xs mt-1 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{formErrors.name}</span>
                  </p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    formErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="tua@email.com"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {formErrors.email && (
                <p className="text-red-600 text-xs mt-1 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{formErrors.email}</span>
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    formErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="La tua password"
                  disabled={isLoading}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-red-600 text-xs mt-1 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{formErrors.password}</span>
                </p>
              )}
            </div>

            {/* Conferma Password (solo per registrazione) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conferma Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      formErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ripeti la password"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-red-600 text-xs mt-1 flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>{formErrors.confirmPassword}</span>
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  <span>Caricamento...</span>
                </>
              ) : (
                <span>{isLogin ? 'Accedi' : 'Registrati'}</span>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-8 text-center">
            <button
              onClick={switchMode}
              disabled={isLoading}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>
          </div>

          {/* Demo Info */}
          {isLogin && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">🎯 Demo Account</h4>
              <p className="text-xs text-blue-700 mb-2">
                Puoi usare queste credenziali per testare l'app:
              </p>
              <div className="text-xs text-blue-800 font-mono bg-blue-100 p-2 rounded">
                <div>Email: test@demo.com</div>
                <div>Password: password123</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};