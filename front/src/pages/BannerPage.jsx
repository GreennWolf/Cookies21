// /src/pages/BannerPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClientTemplates, archiveTemplate } from '../api/bannerTemplate';
import { getClients } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Search, Edit, Archive, Clock, Monitor, Tablet, Smartphone, Code, Users } from 'lucide-react';
import BannerThumbnail from '../components/banner/BannerThumbnail';

function BannerPage() {
  const { user, hasRole } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [thumbnailDevice, setThumbnailDevice] = useState('desktop');
  
  // Verificar si el usuario es owner
  const isOwner = hasRole('owner');

  // Función para obtener las plantillas con filtros
  const fetchTemplates = async (params = {}) => {
    try {
      setLoading(true);
      // console.log("🔍 Solicitando plantillas con parámetros:", params);
      const response = await getClientTemplates(params);
      // console.log(`✅ Plantillas recibidas: ${response.data.templates.length}`);
      setTemplates(response.data.templates);
      setError(null);
    } catch (err) {
      console.error("❌ Error al obtener plantillas:", err);
      setError(err.message || "Error al cargar las plantillas");
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar la lista de clientes (solo para owners)
  const fetchClients = async () => {
    if (!isOwner) return;
    
    try {
      const response = await getClients();
      setClients(response.data.clients);
    } catch (err) {
      console.error("❌ Error al obtener clientes:", err);
      setError('Error al cargar la lista de clientes');
    }
  };

  // Efecto para cargar plantillas cuando cambian los filtros
  useEffect(() => {
    const params = {};
    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (statusFilter) params.status = statusFilter;
    
    // Si es owner y hay cliente seleccionado, añadir el parámetro clientId
    if (isOwner && selectedClientId) {
      params.clientId = selectedClientId;
    }
    
    const debounceTimeout = setTimeout(() => {
      fetchTemplates(params);
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, statusFilter, selectedClientId, isOwner]);
  
  // Cargar clientes si el usuario es owner
  useEffect(() => {
    if (isOwner) {
      fetchClients();
    }
  }, [isOwner]);

  // Función para archivar una plantilla
  const handleArchive = async (templateId) => {
    try {
      await archiveTemplate(templateId);
      
      // Construir parámetros para refrescar la lista
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter) params.status = statusFilter;
      
      // Si es owner y hay un cliente seleccionado, aplicar el filtro
      if (isOwner && selectedClientId) {
        params.clientId = selectedClientId;
      }
      
      // Refrescar la lista después de archivar
      fetchTemplates(params);
    } catch (err) {
      setError(err.message || 'Error al archivar la plantilla');
    }
  };

  // Renderizar spinner de carga si es la primera carga
  if (loading && !templates.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Función para mostrar la fecha formateada
  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isOwner ? 'Gestión de Plantillas de Banner' : 'Mis Plantillas de Banner'}
        </h1>
        <Link 
          to="/dashboard/banner-editor/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Crear Banner
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
          <div className="flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Filtro de cliente para owners */}
      {isOwner && (
        <div className="mb-6 bg-white p-4 rounded shadow">
          <div className="flex items-center mb-2">
            <Users size={18} className="text-blue-600 mr-2" />
            <span className="font-medium">Filtrar por cliente</span>
          </div>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="relative max-w-sm">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar plantillas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Selector de dispositivo para las miniaturas */}
        <div className="flex items-center bg-white border rounded-md">
          <button 
            onClick={() => setThumbnailDevice('desktop')}
            className={`p-2 ${thumbnailDevice === 'desktop' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            title="Vista de escritorio"
          >
            <Monitor size={16} />
          </button>
          <button 
            onClick={() => setThumbnailDevice('tablet')}
            className={`p-2 border-l ${thumbnailDevice === 'tablet' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            title="Vista de tablet"
          >
            <Tablet size={16} />
          </button>
          <button 
            onClick={() => setThumbnailDevice('mobile')}
            className={`p-2 border-l ${thumbnailDevice === 'mobile' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            title="Vista de móvil"
          >
            <Smartphone size={16} />
          </button>
        </div>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-md ${
            statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        <button 
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2 rounded-md ${
            statusFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Activos
        </button>
        <button 
          onClick={() => setStatusFilter('draft')}
          className={`px-4 py-2 rounded-md ${
            statusFilter === 'draft' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Borradores
        </button>
        <button 
          onClick={() => setStatusFilter('archived')}
          className={`px-4 py-2 rounded-md ${
            statusFilter === 'archived' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Archivados
        </button>
      </div>

      {/* Mensaje cuando no hay resultados */}
      {templates.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-2">No hay plantillas que coincidan con tu búsqueda.</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
            }}
            className="text-blue-600 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        /* Grid de plantillas - más simple según la imagen de referencia */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div 
              key={template._id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Miniatura del banner - estilo más simple */}
              <div className="h-40 border-b relative bg-white">
                {/* Simulación de barra de navegador */}
                <div className="bg-gray-800 h-6 w-full flex items-center px-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <div className="ml-auto text-white text-xs">Banner</div>
                </div>
                
                {/* Contenedor del banner */}
                <div className="w-full h-full">
                  <BannerThumbnail 
                    bannerConfig={template} 
                    deviceView={thumbnailDevice}
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-800 rounded px-2 py-1">
                    {template.status === 'active' ? 'Activo' : 
                    template.status === 'draft' ? 'Borrador' : 'Archivado'}
                  </span>
                </div>
                
                {/* Mostrar información del cliente si es owner y está disponible */}
                {isOwner && template.clientId && typeof template.clientId === 'object' && (
                  <div className="mb-2 py-1 px-2 bg-blue-50 rounded text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">Cliente: </span>
                      {template.clientId.name}
                    </p>
                  </div>
                )}
                
                <div className="text-sm text-gray-500 mb-3 flex items-center">
                  <Clock size={14} className="mr-1" />
                  <span>Última modificación: {formatDate(template.updatedAt)}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {/* Mostrar botón Editar solo para owners o para plantillas de tipo custom */}
                  {(isOwner || template.type !== 'system') && (
                    <Link 
                      to={`/dashboard/banner-editor/${template._id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                    >
                      <Edit size={16} className="mr-1" /> Editar
                    </Link>
                  )}
                  
                  {/* Botón para generar script siempre visible */}
                  <Link 
                    to={`/dashboard/generate-script/${template._id}`}
                    className="text-green-600 hover:text-green-800 font-medium inline-flex items-center"
                  >
                    <Code size={16} className="mr-1" /> Generar Script
                  </Link>
                  
                  {/* Mostrar botón Archivar solo para owners o para plantillas de tipo custom que no estén archivadas */}
                  {template.status !== 'archived' && (isOwner || template.type !== 'system') && (
                    <button
                      onClick={() => handleArchive(template._id)}
                      className="text-red-600 hover:text-red-800 font-medium inline-flex items-center"
                    >
                      <Archive size={16} className="mr-1" /> Archivar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Indicador de carga para actualizaciones */}
      {loading && templates.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white p-3 rounded-md shadow-md flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm">Actualizando resultados...</span>
        </div>
      )}
    </div>
  );
}

export default BannerPage;