import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getDomains } from '../api/domain';
import { getCookies, createCookie } from '../api/cookie';
import { startScan } from '../api/cookieScan';
import DomainSelector from '../components/domain/DomainSelector';
import CookieList from '../components/cookie/CookieList';
import CookieScanModal from '../components/cookie/CookieScanModal';
import CookieDetailsModal from '../components/cookie/CookieDetailsModal';
import CreateCookieModal from '../components/cookie/CreateCookieModal';

const Cookies = () => {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [cookies, setCookies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [selectedCookie, setSelectedCookie] = useState(null);
  const [isCookieDetailsOpen, setIsCookieDetailsOpen] = useState(false);
  const [isCreateCookieOpen, setIsCreateCookieOpen] = useState(false);

  // Obtener dominios asociados al usuario/cliente
  useEffect(() => {
    const fetchDomains = async () => {
      setLoading(true);
      try {
        const res = await getDomains();
        setDomains(res.data.domains);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDomains();
  }, []);

  // Obtener cookies para el dominio seleccionado
  useEffect(() => {
    const fetchCookies = async () => {
      if (selectedDomain) {
        setLoading(true);
        try {
          const res = await getCookies(selectedDomain._id);
          setCookies(res.data.cookies);
        } catch (error) {
          toast.error(error.message);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchCookies();
  }, [selectedDomain]);

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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-[#181818]">Gestión de Cookies</h1>
      
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
