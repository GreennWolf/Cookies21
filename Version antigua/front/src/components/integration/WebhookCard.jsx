import React, { useState } from 'react';
import PropTypes from 'prop-types';

const WebhookCard = ({ webhook, onTestWebhook }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Función para probar el webhook
  const handleTest = async () => {
    if (isTesting) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Asumimos que la URL y el secret ya están almacenados en el objeto webhook
      const result = await onTestWebhook({
        url: webhook.url,
        secret: webhook.secret
      });
      
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

  // Función para renderizar los eventos del webhook
  const renderEvents = () => {
    if (!webhook.events || webhook.events.length === 0) {
      return <span className="text-gray-500">No hay eventos configurados</span>;
    }

    // Si hay muchos eventos, mostrar solo los primeros 2 y un contador
    if (webhook.events.length > 2) {
      return (
        <div>
          <div className="mb-1">{webhook.events[0]}</div>
          <div className="mb-1">{webhook.events[1]}</div>
          <div className="text-blue-600 text-sm">
            + {webhook.events.length - 2} más
          </div>
        </div>
      );
    }

    // Si hay pocos eventos, mostrarlos todos
    return webhook.events.map((event, index) => (
      <div key={index} className="mb-1">
        {event}
      </div>
    ));
  };

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-[#235C88] truncate" title={webhook.url}>
          {webhook.url.length > 30 
            ? webhook.url.substring(0, 30) + '...' 
            : webhook.url}
        </h3>
        <span 
          className={`px-2 py-1 text-xs rounded-full ${
            webhook.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}
        >
          {webhook.status === 'active' ? 'Activo' : 'Error'}
        </span>
      </div>
      
      <div className="text-sm text-gray-700 mb-3">
        <p className="font-semibold mb-1">Eventos:</p>
        <div className="pl-2 text-gray-600 text-xs">
          {renderEvents()}
        </div>
      </div>
      
      {webhook.lastChecked && (
        <p className="text-xs text-gray-500 mb-3">
          Última verificación: {new Date(webhook.lastChecked).toLocaleString()}
        </p>
      )}
      
      {webhook.error && webhook.status !== 'active' && (
        <p className="text-xs text-red-600 mb-3">
          Error: {webhook.error}
        </p>
      )}
      
      <button
        onClick={handleTest}
        disabled={isTesting}
        className="w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isTesting ? 'Probando...' : 'Probar webhook'}
      </button>
      
      {testResult && (
        <div className={`mt-2 p-2 rounded text-xs ${
          testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {testResult.success ? (
            <p>Prueba exitosa. Latencia: {testResult.latency}ms</p>
          ) : (
            <p>Error: {testResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

WebhookCard.propTypes = {
  webhook: PropTypes.object.isRequired,
  onTestWebhook: PropTypes.func.isRequired
};

export default WebhookCard;