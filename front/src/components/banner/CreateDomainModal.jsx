import React, { useState } from 'react';
import { X, Globe, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { createDomain } from '../../api/domain';

function CreateDomainModal({ isOpen, onClose, client, bannerId, onDomainCreated }) {
  const [domainName, setDomainName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!domainName.trim()) {
      setError('Por favor ingresa un nombre de dominio');
      return;
    }

    // Validación básica de formato de dominio
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domainName.trim())) {
      setError('Por favor ingresa un dominio válido (ej: ejemplo.com)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const domainData = {
        domain: domainName.trim().toLowerCase(),
        clientId: client.id === 'no-client' ? null : client.id,
        status: 'active',
        settings: {
          defaultTemplateId: bannerId // Asignar el banner como predeterminado
        }
      };

      console.log('🔨 Creando dominio:', {
        clientName: client.name,
        clientId: client.id,
        domainData
      });

      const response = await createDomain(domainData);
      
      if (onDomainCreated) {
        onDomainCreated(response.data.domain);
      }
    } catch (err) {
      console.error('Error al crear dominio:', err);
      setError(err.message || 'Error al crear el dominio');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setDomainName('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Crear Nuevo Dominio</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Cliente:</h4>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium">{client?.name}</div>
              <div className="text-sm text-gray-600">
                No tiene dominios configurados. Crea uno nuevo para enviar el script.
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del dominio *
            </label>
            <div className="relative">
              <Globe size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="domain"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="ejemplo.com"
                disabled={loading}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Ingresa el dominio donde se implementará el banner de cookies
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
              <AlertCircle size={18} className="mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Configuración automática
              </span>
            </div>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• El dominio se creará como activo</li>
              <li>• Se asignará el banner actual como predeterminado</li>
              <li>• El script se generará para este dominio</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !domainName.trim()}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Crear Dominio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateDomainModal;