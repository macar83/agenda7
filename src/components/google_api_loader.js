// src/components/common/GoogleApiLoader.jsx
import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader } from 'lucide-react';

const GoogleApiLoader = ({ children }) => {
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGoogleApi = async () => {
      try {
        // Controlla se GAPI è già caricato
        if (window.gapi) {
          console.log('✅ GAPI già disponibile');
          setGapiLoaded(true);
          setLoading(false);
          return;
        }

        console.log('🔄 Caricamento Google API...');

        // Carica lo script GAPI
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;

        script.onload = () => {
          console.log('✅ Script Google API caricato');
          
          // Verifica che gapi sia disponibile
          if (window.gapi) {
            setGapiLoaded(true);
            console.log('✅ GAPI pronto per l\'uso');
          } else {
            throw new Error('GAPI non disponibile dopo il caricamento dello script');
          }
          
          setLoading(false);
        };

        script.onerror = () => {
          const errorMsg = 'Errore nel caricamento della Google API';
          console.error('❌', errorMsg);
          setError(errorMsg);
          setLoading(false);
        };

        document.head.appendChild(script);

        // Timeout di sicurezza
        setTimeout(() => {
          if (!window.gapi && loading) {
            const timeoutMsg = 'Timeout nel caricamento della Google API';
            console.error('⏰', timeoutMsg);
            setError(timeoutMsg);
            setLoading(false);
          }
        }, 10000);

      } catch (err) {
        console.error('❌ Errore generale nel caricamento GAPI:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadGoogleApi();
  }, [loading]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Caricamento Google API
          </h2>
          <p className="text-gray-600">
            Preparazione servizi di autenticazione...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Errore di Caricamento
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ricarica Pagina
            </button>
            <p className="text-sm text-gray-500">
              Assicurati di avere una connessione internet attiva
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state - render children
  if (gapiLoaded) {
    return <>{children}</>;
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="h-4 w-48 bg-gray-300 rounded mx-auto mb-2"></div>
          <div className="h-4 w-32 bg-gray-300 rounded mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default GoogleApiLoader;