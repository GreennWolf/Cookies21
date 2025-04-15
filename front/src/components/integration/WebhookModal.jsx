import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const WebhookModal = ({ onClose, onSave, onTest }) => {
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState([]);
  const [config, setConfig] = useState({
    timeout: 5000,
    retries: 3,
    method: 'POST'
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // Lista de eventos disponibles
  const availableEvents = [
    { id: 'consent.accepted', name: 'Consentimiento aceptado' },
    { id: 'consent.rejected', name: 'Consentimiento rechazado' },
    { id: 'consent.updated', name: 'Consentimiento actualizado' },
    { id: 'banner.shown', name: 'Banner mostrado' },
    { id: 'banner.closed', name: 'Banner cerrado' },
    { id: 'cookie.detected', name: 'Cookie detectada' },
    { id: 'scan.completed', name: 'Escaneo completado' }
  ];

  // Cerrar el modal con Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Manejar cambios en los eventos seleccionados
  const handleEventChange = (eventId) => {
    setEvents(
      events.includes(eventId)
        ? events.filter(id => id !== eventId)
        : [...events, eventId]
    );
  };

  // Función para probar el webhook
  const handleTestWebhook = async () => {
    if (!url || !secret) {
      return;
    }
    
    setIsTesting(true);
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

  // Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (events.length === 0) {
      alert('Selecciona al menos un evento');
      return;
    }
    
    setLoading(true);
    try {
      // Probar el webhook antes de guardar
      const testResult = await onTest({ url, secret });
      
      if (!testResult.success) {
        alert(`Error al probar el webhook: ${testResult.error}`);
        setLoading(false);
        return;
      }
      
      // Si la prueba es exitosa, guardar la configuración
      const webhookData = {
        url,
        secret,
        events,
        config
      };
      
      await onSave(webhookData);
    } catch (error) {
      console.error('Error saving webhook:', error);
      alert('Error al guardar el webhook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">Configurar Webhook</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="text-xs text-gray-500 mt-1">
              URL donde se enviarán las notificaciones
            </p>
          </div>
          
          <div>
            <label className="block font-semibold mb-1">Secret</label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="webhook_secret_key"
              className="w-full border p-2 rounded"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Clave secreta para firmar las solicitudes webhook
            </p>
          </div>
          
          <div>
            <label className="block font-semibold mb-1">Eventos</label>
            <div className="border p-2 rounded max-h-40 overflow-y-auto">
              {availableEvents.map(event => (
                <div key={event.id} className="flex items-center space-x-2 p-1">
                  <input
                    type="checkbox"
                    id={`event-${event.id}`}
                    checked={events.includes(event.id)}
                    onChange={() => handleEventChange(event.id)}
                    className="rounded"
                  />
                  <label htmlFor={`event-${event.id}`} className="text-sm">
                    {event.name} <span className="text-gray-500">({event.id})</span>
                  </label>
                </div>
              ))}
            </div>
            {events.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                Selecciona al menos un evento
              </p>
            )}
          </div>
          
          <div>
            <label className="block font-semibold mb-1">Configuración Avanzada</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={config.timeout}
                  onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value, 10) || 5000 })}
                  min="1000"
                  className="w-full border p-2 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Reintentos</label>
                <input
                  type="number"
                  value={config.retries}
                  onChange={(e) => setConfig({ ...config, retries: parseInt(e.target.value, 10) || 3 })}
                  min="0"
                  max="10"
                  className="w-full border p-2 rounded"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm mb-1">Método</label>
                <select
                  value={config.method}
                  onChange={(e) => setConfig({ ...config, method: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Sección para probar el webhook */}
          <div className="border-t pt-4">
            <div className="flex space-x-2 items-center mb-2">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={!url || !secret || isTesting}
                className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
              >
                {isTesting ? 'Probando...' : 'Probar Webhook'}
              </button>
              <span className="text-sm text-gray-600">
                Antes de guardar, prueba si el webhook responde correctamente
              </span>
            </div>
            
            {testResult && (
              <div className={`p-2 rounded text-sm ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testResult.success ? (
                  <p>Webhook probado correctamente. Latencia: {testResult.latency}ms</p>
                ) : (
                  <p>Error: {testResult.error}</p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={loading || events.length === 0}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

WebhookModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onTest: PropTypes.func.isRequired
};

export default WebhookModal;