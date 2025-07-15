import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const TestWebhookModal = ({ onClose, onTest }) => {
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // Cerrar el modal con Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Función para probar el webhook
  const handleTestWebhook = async () => {
    if (!url) {
      alert('Ingresa una URL para probar');
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTest({ url, secret });
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message || 'Error al probar webhook'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">Probar Webhook</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">URL del Webhook</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full border p-2 rounded"
              required
            />
          </div>
          
          <div>
            <label className="block font-semibold mb-1">Secret (opcional)</label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="webhook_secret_key"
              className="w-full border p-2 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Si tu webhook requiere un secret para validar la firma
            </p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleTestWebhook}
              disabled={!url || isTesting}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isTesting ? 'Probando...' : 'Probar Webhook'}
            </button>
          </div>
          
          {testResult && (
            <div className={`p-4 rounded mt-4 ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className={`font-bold ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.success ? 'Prueba Exitosa' : 'Error'}
              </h3>
              
              {testResult.success ? (
                <div className="mt-2">
                  <p><strong>Estado:</strong> Éxito</p>
                  <p><strong>Latencia:</strong> {testResult.latency}ms</p>
                </div>
              ) : (
                <div className="mt-2">
                  <p><strong>Estado:</strong> Error</p>
                  <p><strong>Mensaje:</strong> {testResult.error}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

TestWebhookModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onTest: PropTypes.func.isRequired
};

export default TestWebhookModal;