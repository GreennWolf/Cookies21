import React from 'react';
import PropTypes from 'prop-types';

const IntegrationStatus = ({ 
  status, 
  onConfigureGA, 
  onConfigureGTM, 
  onConfigureIAB, 
  onConfigureWebhook,
  onTestWebhook
}) => {
  // Función para renderizar el estado de una integración
  const renderStatusBadge = (integrationStatus) => {
    if (!integrationStatus || !integrationStatus.enabled) {
      return (
        <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-sm">
          No configurado
        </span>
      );
    }

    switch (integrationStatus.status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            Activo
          </span>
        );
      case 'error':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
            Error
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            {integrationStatus.status}
          </span>
        );
    }
  };

  // Función para contar webhooks activos
  const getActiveWebhooksCount = () => {
    if (!status.webhooks || !Array.isArray(status.webhooks)) return 0;
    return status.webhooks.filter(webhook => webhook.status === 'active').length;
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4 text-[#181818]">Estado de Integraciones</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Google Analytics */}
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-[#235C88]">Google Analytics</h3>
            {renderStatusBadge(status.googleAnalytics)}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {status.googleAnalytics && status.googleAnalytics.enabled 
              ? `Measurement ID: ${status.googleAnalytics.measurementId || 'No disponible'}`
              : 'Integración de Google Analytics no configurada'
            }
          </p>
          <button
            onClick={onConfigureGA}
            className="w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {status.googleAnalytics && status.googleAnalytics.enabled ? 'Editar' : 'Configurar'}
          </button>
        </div>

        {/* Google Tag Manager */}
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-[#235C88]">Google Tag Manager</h3>
            {renderStatusBadge(status.gtm)}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {status.gtm && status.gtm.enabled 
              ? `Container ID: ${status.gtm.containerId || 'No disponible'}`
              : 'Integración de Google Tag Manager no configurada'
            }
          </p>
          <button
            onClick={onConfigureGTM}
            className="w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {status.gtm && status.gtm.enabled ? 'Editar' : 'Configurar'}
          </button>
        </div>

        {/* IAB */}
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-[#235C88]">IAB CMP</h3>
            {renderStatusBadge(status.iab)}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {status.iab && status.iab.enabled 
              ? `CMP ID: ${status.iab.cmpId || 'No disponible'}`
              : 'Integración IAB CMP no configurada'
            }
          </p>
          <button
            onClick={onConfigureIAB}
            className="w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {status.iab && status.iab.enabled ? 'Editar' : 'Configurar'}
          </button>
        </div>

        {/* Webhooks */}
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-[#235C88]">Webhooks</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {getActiveWebhooksCount()} activos
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {getActiveWebhooksCount() > 0
              ? `${getActiveWebhooksCount()} webhook(s) configurados`
              : 'No hay webhooks configurados'
            }
          </p>
          <div className="flex space-x-2">
            <button
              onClick={onConfigureWebhook}
              className="flex-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Añadir
            </button>
            <button
              onClick={onTestWebhook}
              className="flex-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Probar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

IntegrationStatus.propTypes = {
  status: PropTypes.object.isRequired,
  onConfigureGA: PropTypes.func.isRequired,
  onConfigureGTM: PropTypes.func.isRequired,
  onConfigureIAB: PropTypes.func.isRequired,
  onConfigureWebhook: PropTypes.func.isRequired,
  onTestWebhook: PropTypes.func.isRequired
};

export default IntegrationStatus;