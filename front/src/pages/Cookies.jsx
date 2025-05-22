import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getDomains } from '../api/domain';
import { getCookies, createCookie, updateCookieStatus } from '../api/cookie';
import { getClients } from '../api/client';
import { startScan } from '../api/cookieScan';
import DomainSelector from '../components/domain/DomainSelector';
import CookieList from '../components/cookie/CookieList';
import CookieScanModal from '../components/cookie/CookieScanModal';
import CookieDetailsModal from '../components/cookie/CookieDetailsModal';
import CreateCookieModal from '../components/cookie/CreateCookieModal';
import { useAuth } from '../contexts/AuthContext';

const Cookies = () => {
  const [domains, setDomains] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [cookies, setCookies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [selectedCookie, setSelectedCookie] = useState(null);
  const [isCookieDetailsOpen, setIsCookieDetailsOpen] = useState(false);
  const [isCreateCookieOpen, setIsCreateCookieOpen] = useState(false);
  const { hasRole } = useAuth();
  
  // Verificar si el usuario es owner
  const isOwner = hasRole('owner');

  // Obtener dominios asociados al usuario/cliente
  useEffect(() => {
    const fetchDomains = async () => {
      setLoading(true);
      try {
        // Si es owner y hay clientId seleccionado, filtrar dominios por ese cliente
        const params = {};
        if (isOwner && selectedClientId) {
          params.clientId = selectedClientId;
        }
        
        const res = await getDomains(params);
        setDomains(res.data.domains);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDomains();
    
    // Si es owner, cargar los clientes
    if (isOwner) {
      fetchClients();
    }
  }, [isOwner, selectedClientId]);
  
  // Cargar la lista de clientes si el usuario es owner
  const fetchClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data.clients);
    } catch (error) {
      toast.error('Error al cargar clientes: ' + error.message);
    }
  };

  // Obtener cookies para el dominio seleccionado o para todos los dominios del cliente seleccionado (owner)
  useEffect(() => {
    const fetchCookies = async () => {
      // Si no hay dominio seleccionado y no es owner, no hacer nada
      if (!selectedDomain && !isOwner) {
        setCookies([]);
        return;
      }
      
      setLoading(true);
      try {
        let res;
        if (selectedDomain) {
          // Si hay un dominio seleccionado, obtener cookies para ese dominio
          res = await getCookies(selectedDomain._id);
        } else if (isOwner) {
          // Si es owner y no hay dominio seleccionado, puede obtener todas las cookies
          // con filtro opcional por cliente
          const params = {};
          if (selectedClientId) {
            params.clientId = selectedClientId;
          } else {
            // Si es owner pero no ha seleccionado cliente, no mostrar cookies
            setCookies([]);
            setLoading(false);
            return;
          }
          res = await getCookies(null, params);
        }
        
        setCookies(res.data.cookies || []);
      } catch (error) {
        console.error('Error al obtener cookies:', error);
        // Mensaje más descriptivo del error
        toast.error('No se pudieron cargar las cookies: ' + (error.message || 'Error de servidor'));
        setCookies([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCookies();
  }, [selectedDomain, isOwner, selectedClientId]);

  // Función para iniciar un escaneo de cookies
  const handleScan = async () => {
    if (!selectedDomain) return;
    setLoading(true);
    try {
      const res = await startScan(selectedDomain._id);
      setScanResults(res.data.scan);
      setIsScanModalOpen(true);
      // Opcional: refrescar la lista de cookies luego del scan
      const cookiesRes = await getCookies(selectedDomain._id);
      setCookies(cookiesRes.data.cookies);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para ver detalles de una cookie
  const handleViewDetails = (cookie) => {
    setSelectedCookie(cookie);
    setIsCookieDetailsOpen(true);
  };

  // Función para eliminar una cookie (marcar como inactiva)
  const handleDelete = async (cookieId) => {
    if (!selectedDomain) return;
    try {
      await updateCookieStatus(cookieId, 'inactive');
      toast.success('Cookie eliminada');
      const res = await getCookies(selectedDomain._id);
      setCookies(res.data.cookies);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Función para crear una cookie (se llamará desde el modal)
  const handleCreateCookie = async (cookieData) => {
    try {
      await createCookie(cookieData);
      toast.success('Cookie creada');
      const res = await getCookies(selectedDomain._id);
      setCookies(res.data.cookies);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Manejar cambio de cliente seleccionado (solo para owners)
  const handleClientChange = (e) => {
    setSelectedClientId(e.target.value);
    // Al cambiar de cliente, resetear el dominio seleccionado
    setSelectedDomain(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-[#181818]">
        {isOwner ? 'Gestión Global de Cookies' : 'Gestión de Cookies'}
      </h1>
      
      {/* Filtros para owner */}
      {isOwner && (
        <div className="mb-6 bg-white p-4 rounded shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selector de cliente para users */}
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
          </div>
        </div>
      )}
      
      {/* Selector de dominios */}
      <DomainSelector 
        domains={domains} 
        selectedDomain={selectedDomain} 
        onSelect={setSelectedDomain} 
      />

      {/* Botón para iniciar cookies scan */}
      {selectedDomain && (
        <div className="my-4 flex space-x-4">
          <button 
            onClick={handleScan} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Iniciar Escaneo de Cookies
          </button>
          <button 
            onClick={() => setIsCreateCookieOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Crear Cookie
          </button>
        </div>
      )}

      {/* Lista de cookies */}
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <CookieList 
          cookies={cookies} 
          onViewDetails={handleViewDetails} 
          onDelete={handleDelete} 
          showDomainInfo={isOwner} // Mostrar información de dominio para owners
        />
      )}

      {/* Modal para resultados del escaneo */}
      {isScanModalOpen && (
        <CookieScanModal 
          scanResults={scanResults} 
          onClose={() => setIsScanModalOpen(false)}
        />
      )}

      {/* Modal de detalles de cookie */}
      {isCookieDetailsOpen && selectedCookie && (
        <CookieDetailsModal 
          cookie={selectedCookie} 
          onClose={() => setIsCookieDetailsOpen(false)}
          onDelete={handleDelete}
        />
      )}

      {/* Modal para crear cookie */}
      {isCreateCookieOpen && (
        <CreateCookieModal 
          onClose={() => setIsCreateCookieOpen(false)}
          onCreated={handleCreateCookie}
        />
      )}
    </div>
  );
};

export default Cookies;
