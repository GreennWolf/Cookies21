/* /src/components/domain/DomainList.jsx */
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getDomains, deleteDomain } from '../api/domain';
import DomainCard from '../components/domain/DomainCard';
import DomainModal from '../components/domain/DomainModal'; // Modal para crear/editar dominio
import DomainDetailsModal from '../components/domain/DomainDetailsModal'; // Modal para ver detalles

const DomainList = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const data = await getDomains();
      setDomains(data.data.domains);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#181818] mb-4">Mis Dominios</h1>
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
      {isCreateModalOpen && <DomainModal onClose={handleCreateModalClose} />}

      {/* Modal para ver detalles del dominio */}
      {selectedDomain && (
        <DomainDetailsModal domain={selectedDomain} onClose={handleDetailsModalClose} />
      )}
    </div>
  );
};

export default DomainList;
