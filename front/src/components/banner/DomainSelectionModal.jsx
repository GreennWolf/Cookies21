import React, { useState, useEffect } from 'react';
import { X, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { getDomains } from '../../api/domain';

function DomainSelectionModal({ isOpen, onClose, client, onDomainSelected, possibleDomains = null }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);

  useEffect(() => {
    if (isOpen && client) {
      if (possibleDomains) {
        // Si se proporcionan dominios posibles, usarlos directamente
        setDomains(possibleDomains);
        setLoading(false);
      } else {
        fetchDomains();
      }
    }
  }, [isOpen, client, possibleDomains]);

  const fetchDomains = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const clientId = client.id === 'no-client' ? null : client.id;
      const response = await getDomains({ 
        clientId: clientId
      });
      
      setDomains(response.data.domains || []);
    } catch (err) {
      console.error('Error al obtener dominios:', err);
      setError('Error al cargar dominios del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDomain = () => {
    if (selectedDomain && onDomainSelected) {
      onDomainSelected(selectedDomain);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Seleccionar Dominio</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Cliente:</h4>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium">{client?.name}</div>
              <div className="text-sm text-gray-600">
                {possibleDomains 
                  ? "Se encontraron dominios con nombre similar. Selecciona el correcto:"
                  : "Selecciona el dominio para generar el script de consent"
                }
              </div>
              {possibleDomains && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  ⚠️ Puede que haya clientes duplicados. Verifica que seleccionas el dominio correcto.
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando dominios...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
              <AlertCircle size={18} className="mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No se encontraron dominios activos para este cliente
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  Dominios disponibles ({domains.length}):
                </h5>
                <div className="space-y-2">
                  {domains.map((domain) => (
                    <label
                      key={domain._id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedDomain?._id === domain._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="domain"
                        value={domain._id}
                        checked={selectedDomain?._id === domain._id}
                        onChange={() => setSelectedDomain(domain)}
                        className="mr-3 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Globe size={16} className="text-gray-400" />
                          <span className="font-medium text-gray-900">{domain.domain}</span>
                          {domain.isVerified && (
                            <CheckCircle size={16} className="text-green-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Estado: {domain.status === 'active' ? 'Activo' : domain.status}
                          {domain.settings?.defaultTemplateId && (
                            <span className="ml-2">• Tiene banner asignado</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {selectedDomain && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Dominio seleccionado: {selectedDomain.domain}
                    </span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    El script se generará para este dominio y se asignará como banner predeterminado.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSelectDomain}
            disabled={!selectedDomain}
            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Seleccionar Dominio
          </button>
        </div>
      </div>
    </div>
  );
}

export default DomainSelectionModal;