/* /src/components/domain/DomainList.jsx */
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getDomains, deleteDomain } from '../api/domain';
import { getClients } from '../api/client';
import DomainCard from '../components/domain/DomainCard';
import DomainModal from '../components/domain/DomainModal'; // Modal para crear/editar dominio
import DomainDetailsModal from '../components/domain/DomainDetailsModal'; // Modal para ver detalles
import { useAuth } from '../contexts/AuthContext';

const DomainList = () => {
  const [domains, setDomains] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { hasRole } = useAuth();
  
  // Verificar si el usuario es owner
  const isOwner = hasRole('owner');

  const fetchDomains = async () => {
    setLoading(true);
    try {
      // Construir parámetros de consulta
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (isOwner && selectedClientId) params.clientId = selectedClientId;

      const data = await getDomains(params);
      setDomains(data.data.domains);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Obtener los clientes si el usuario es owner
  const fetchClients = async () => {
    if (!isOwner) return;
    
    try {
      const response = await getClients();
      setClients(response.data.clients);
    } catch (error) {
      toast.error('Error al cargar clientes: ' + error.message);
    }
  };

  useEffect(() => {
    fetchDomains();
    if (isOwner) {
      fetchClients();
    }
  }, [isOwner]);

  // Actualizar dominios cuando cambia el filtro de cliente
  useEffect(() => {
    fetchDomains();
  }, [selectedClientId, statusFilter, searchTerm]);

  const handleDelete = async (domainId) => {
    if (!window.confirm('¿Estás seguro de eliminar este dominio?')) return;
    try {
      await deleteDomain(domainId);
      toast.success('Dominio eliminado');
      fetchDomains();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Para abrir el modal de detalles al hacer clic en "Ver Detalles" en la tarjeta
  const handleViewDetails = (domain) => {
    setSelectedDomain(domain);
  };

  // Cierra el modal de creación; si se creó/actualizó un dominio, refresca la lista
  const handleCreateModalClose = (updatedDomain) => {
    setIsCreateModalOpen(false);
    if (updatedDomain) {
      fetchDomains();
    }
  };

  // Cierra el modal de detalles
  const handleDetailsModalClose = () => {
    setSelectedDomain(null);
  };

  // Maneja el cambio en el selector de cliente
  const handleClientChange = (e) => {
    setSelectedClientId(e.target.value);
  };

  // Manejar el cambio en el buscador
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Manejar el cambio en el filtro de estado
  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#181818] mb-4">
        {isOwner ? 'Gestión de Dominios' : 'Mis Dominios'}
      </h1>

      {/* Filtros y búsqueda */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro por cliente (solo para owners) */}
          {isOwner && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={selectedClientId}
                onChange={handleClientChange}
                className="w-full border rounded p-2"
              >
                <option value="">Todos los clientes</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="w-full border rounded p-2"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="pending">Pendiente</option>
            </select>
          </div>

          {/* Buscador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Buscar por dominio..."
              className="w-full border rounded p-2"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p>Cargando dominios...</p>
      ) : domains.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <p className="text-gray-600 mb-4">No hay dominios disponibles.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-[#235C88] text-white rounded hover:bg-[#1e4a6b] transition"
          >
            Crear Dominio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((domain) => (
            <DomainCard
              key={domain._id}
              domain={domain}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
            />
          ))}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[#235C88] text-white rounded hover:bg-[#1e4a6b] transition"
            >
              Agregar Dominio
            </button>
          </div>
        </div>
      )}

      {/* Modal para crear/editar dominio */}
      {isCreateModalOpen && (
        <DomainModal 
          onClose={handleCreateModalClose} 
          isOwner={isOwner} 
          clients={clients}
          selectedClientId={selectedClientId}
        />
      )}

      {/* Modal para ver detalles del dominio */}
      {selectedDomain && (
        <DomainDetailsModal domain={selectedDomain} onClose={handleDetailsModalClose} />
      )}
    </div>
  );
};

export default DomainList;
