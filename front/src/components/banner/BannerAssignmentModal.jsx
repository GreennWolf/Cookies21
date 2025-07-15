import React, { useState, useEffect } from 'react';
import { X, Users, Search, Check, UserPlus } from 'lucide-react';
import { getClients } from '../../api/client';
import { assignBannerToClient, unassignBannerFromClient } from '../../api/bannerTemplate';

const BannerAssignmentModal = ({ isOpen, onClose, banner, onAssignmentComplete }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(banner?.clientId || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClients();
      setSelectedClientId(banner?.clientId || '');
    }
  }, [isOpen, banner]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await getClients();
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    try {
      setSubmitting(true);
      
      if (selectedClientId === 'unassign') {
        // Desasignar banner
        await unassignBannerFromClient(banner.id);
        onAssignmentComplete?.({
          type: 'unassign',
          message: `Banner "${banner.name}" convertido en plantilla del sistema`
        });
      } else if (selectedClientId) {
        // Asignar a cliente específico
        const client = clients.find(c => c._id === selectedClientId);
        await assignBannerToClient(banner.id, selectedClientId);
        onAssignmentComplete?.({
          type: 'assign',
          clientName: client?.name,
          message: `Banner "${banner.name}" asignado al cliente "${client?.name}"`
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error in assignment:', error);
      onAssignmentComplete?.({
        type: 'error',
        message: error.response?.data?.message || 'Error al asignar banner'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Asignar Banner a Cliente</h3>
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
            <h4 className="font-medium text-gray-900 mb-2">Banner:</h4>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium">{banner?.name}</div>
              <div className="text-sm text-gray-600">
                Tipo: {banner?.type === 'system' ? 'Sistema' : 'Personalizado'}
                {banner?.clientName && (
                  <span className="ml-2">• Asignado a: {banner.clientName}</span>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Cliente:
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Client List */}
          <div className="mb-4">
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  Cargando clientes...
                </div>
              ) : (
                <>
                  {/* Option to convert to system template */}
                  <label className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b">
                    <input
                      type="radio"
                      name="client"
                      value="unassign"
                      checked={selectedClientId === 'unassign'}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Plantilla del Sistema</div>
                        <div className="text-sm text-gray-600">Disponible para todos los clientes</div>
                      </div>
                    </div>
                  </label>

                  {/* Client options */}
                  {filteredClients.map((client) => (
                    <label key={client._id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="client"
                        value={client._id}
                        checked={selectedClientId === client._id}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserPlus className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-600">{client.email}</div>
                        </div>
                      </div>
                      {selectedClientId === client._id && (
                        <Check className="h-4 w-4 text-green-600 ml-auto" />
                      )}
                    </label>
                  ))}

                  {filteredClients.length === 0 && !loading && (
                    <div className="p-4 text-center text-gray-500">
                      No se encontraron clientes
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedClientId || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Asignando...' : 'Asignar Banner'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BannerAssignmentModal;