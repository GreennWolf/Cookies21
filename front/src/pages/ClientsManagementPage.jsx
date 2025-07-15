import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getClients, 
  createClient, 
  updateClient, 
  toggleClientStatus,
  assignTemplateToDomain
} from '../api/client';
import { createDomain, setDomainDefaultTemplate } from '../api/domain';
import { createTemplate, getTemplate, cloneTemplate } from '../api/bannerTemplate';
import { renewalNotificationManager } from '../utils/renewalNotifications';
import ClientList from '../components/client/ClientList';
import ClientDetailsModal from '../components/client/ClientDetailsModal';
import CreateClientModal from '../components/client/CreateClientModal';

const ClientsManagementPage = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  
  // Cargar filtros desde localStorage o usar valores por defecto
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('clientsFilters.searchTerm') || '';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem('clientsFilters.statusFilter') || '';
  });
  const [planFilter, setPlanFilter] = useState(() => {
    return localStorage.getItem('clientsFilters.planFilter') || '';
  });
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState(() => {
    return localStorage.getItem('clientsFilters.subscriptionStatusFilter') || '';
  });

  // Funciones para actualizar filtros y guardar en localStorage
  const updateSearchTerm = (value) => {
    setSearchTerm(value);
    localStorage.setItem('clientsFilters.searchTerm', value);
  };

  const updateStatusFilter = (value) => {
    setStatusFilter(value);
    localStorage.setItem('clientsFilters.statusFilter', value);
  };

  const updatePlanFilter = (value) => {
    setPlanFilter(value);
    localStorage.setItem('clientsFilters.planFilter', value);
  };

  const updateSubscriptionStatusFilter = (value) => {
    setSubscriptionStatusFilter(value);
    localStorage.setItem('clientsFilters.subscriptionStatusFilter', value);
  };

  useEffect(() => {
    fetchClients();
  }, [statusFilter, planFilter, subscriptionStatusFilter]);

  // Suscribirse a notificaciones de renovación para actualizar la lista
  useEffect(() => {
    const unsubscribe = renewalNotificationManager.subscribe(() => {
      fetchClients();
    });
    
    return () => unsubscribe();
  }, []);

  // useEffect separado para la búsqueda con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchClients();
    }, 500); // Debounce de 500ms para el término de búsqueda

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const params = {
        limit: 100 // Obtener hasta 100 clientes por página
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.plan = planFilter;
      if (subscriptionStatusFilter) params.subscriptionStatus = subscriptionStatusFilter;

      const response = await getClients(params);
      setClients(response.data.clients);
      setPagination(response.data.pagination || { total: response.data.clients?.length || 0, totalPages: 1 });
    } catch (error) {
      toast.error(error.message || 'Error al cargar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (client) => {
    setSelectedClient(client);
  };

  const handleCloseDetails = () => {
    setSelectedClient(null);
  };

  const handleShowCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleCreateClient = async (clientData) => {
    console.log('🔍 ClientsManagementPage: Iniciando creación transaccional de cliente:', {
      clientName: clientData.name,
      configureBanner: clientData.configureBanner,
      hasBannerConfig: !!clientData.bannerConfig,
      hasCustomizedTemplate: !!clientData.bannerConfig?.customizedTemplate,
      customizedTemplateKeys: clientData.bannerConfig?.customizedTemplate ? Object.keys(clientData.bannerConfig.customizedTemplate) : [],
      layoutBg: clientData.bannerConfig?.customizedTemplate?.layout?.desktop?.backgroundColor,
      componentCount: clientData.bannerConfig?.customizedTemplate?.components?.length,
      hasCustomizations: !!clientData.bannerConfig?.customizations,
      hasComponentUpdates: !!clientData.bannerConfig?.componentUpdates && Object.keys(clientData.bannerConfig.componentUpdates || {}).length > 0
    });
    
    try {
      // Mostrar toast de proceso iniciado  
      toast.info('Iniciando creación transaccional del cliente...', { autoClose: 2000 });
      
      // Preparar FormData si hay imágenes
      let formData = null;
      const hasImages = (clientData.bannerConfig?.images && Object.keys(clientData.bannerConfig.images).length > 0) ||
                       (window._imageFiles && Object.keys(window._imageFiles).length > 0);
      
      if (clientData.configureBanner && clientData.bannerConfig && hasImages) {
        console.log("📷 Detectadas imágenes, preparando FormData para transacción");
        
        formData = new FormData();
        
        // Agregar todos los campos del cliente
        Object.keys(clientData).forEach(key => {
          if (key !== 'bannerConfig') {
            const value = clientData[key];
            if (value !== undefined && value !== null) {
              if (typeof value === 'object') {
                formData.append(key, JSON.stringify(value));
              } else {
                formData.append(key, String(value));
              }
            }
          }
        });
        
        // Agregar banner config
        formData.append('bannerConfig', JSON.stringify(clientData.bannerConfig));
        
        // Combinar imágenes de clientData.bannerConfig.images y window._imageFiles
        const allImages = { ...clientData.bannerConfig.images };
        if (window._imageFiles) {
          Object.entries(window._imageFiles).forEach(([componentId, file]) => {
            if (!allImages[componentId] && file instanceof File) {
              allImages[componentId] = file;
              console.log(`📎 Agregando imagen de window._imageFiles: ${componentId}`);
            }
          });
        }
        
        // Agregar imágenes con formato específico
        Object.entries(allImages).forEach(([componentId, file]) => {
          if (file instanceof File) {
            const uniqueFileName = `IMAGE_REF_${componentId}_${file.name}`;
            formData.append('bannerImages', file, uniqueFileName);
            console.log(`📸 Agregando imagen: ${uniqueFileName}`);
          }
        });
        
        // Usar transacción con FormData
        console.log("📤 Enviando transacción con imágenes");
        const response = await createClient(formData);
        console.log("✅ Transacción completada exitosamente");
        
        // Actualizar lista y mostrar éxito
        fetchClients();
        toast.success(`Cliente ${response.data.client.name} creado completamente`);
        return response;
      } else {
        // Sin imágenes, usar transacción normal
        console.log("📝 Enviando transacción sin imágenes");
        const response = await createClient(clientData);
        console.log("✅ Transacción completada exitosamente");
        
        // Actualizar lista y mostrar éxito
        fetchClients();
        toast.success(`Cliente ${response.data.client.name} creado completamente`);
        return response;
      }
    } catch (error) {
      console.error('❌ Error en transacción de creación de cliente:', error);
      
      // Mostrar error específico al usuario
      let errorMessage = 'Error desconocido al crear cliente';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Identificar qué campo causó el error para mejorar UX
      if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('existe')) {
        toast.error('Ya existe un cliente o usuario con ese email. Por favor use un email diferente.');
      } else if (errorMessage.toLowerCase().includes('dominio') && errorMessage.toLowerCase().includes('existe')) {
        toast.error('Uno de los dominios especificados ya existe. Por favor verifique los dominios.');
      } else if (errorMessage.toLowerCase().includes('plan')) {
        toast.error('Error con el plan de suscripción seleccionado. Por favor seleccione otro plan.');
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
      
      throw error;
    }
  };

  const handleUpdateClient = async (clientId, updates) => {
    try {
      // Actualizar el cliente
      await updateClient(clientId, updates);
      toast.success('Cliente actualizado exitosamente');
      
      // Si hay dominios actualizados, gestionar la creación de nuevos dominios
      if (updates.domains && Array.isArray(updates.domains)) {
        // Obtener cliente actual para comparar dominios
        const currentClient = clients.find(client => client._id === clientId);
        
        if (currentClient) {
          // Determinar dominios nuevos que no estaban en el cliente original
          const currentDomains = currentClient.domains || [];
          const newDomains = updates.domains.filter(
            domain => domain.trim() !== '' && !currentDomains.includes(domain)
          );
          
          // Crear nuevos dominios si hay alguno
          if (newDomains.length > 0) {
            const domainCreationPromises = newDomains.map(async (domainName) => {
              try {
                // Asegurar que el ID del cliente sea un string válido
                // Verificar estructura del ID (puede estar en el objeto o directamente)
                let validClientId;
                
                if (typeof clientId === 'object' && clientId !== null) {
                  // Si es un objeto, intentar .toString() o .id/.toString()
                  if (clientId.toString) {
                    validClientId = clientId.toString();
                  } else if (clientId.id) {
                    validClientId = clientId.id.toString ? clientId.id.toString() : clientId.id;
                  } else if (clientId._id) {
                    validClientId = clientId._id.toString ? clientId._id.toString() : clientId._id;
                  } else {
                    validClientId = String(clientId);
                  }
                } else {
                  // Si es string u otro tipo
                  validClientId = String(clientId);
                }
                
                console.log(`🔑 ID del cliente para actualización de dominio: ${validClientId} (${typeof validClientId})`);
                
                // Configuración simplificada para nuevos dominios, sin ajustes de color
                const domainData = {
                  domain: domainName,
                  clientId: validClientId,
                  status: 'active',
                  settings: {
                    scanning: {
                      autoDetect: true,
                      interval: 24,
                    },
                  },
                };
                
                await createDomain(domainData);
                return { success: true, domain: domainName };
              } catch (err) {
                console.error(`Error al crear dominio ${domainName}:`, err);
                return { success: false, domain: domainName, error: err.message };
              }
            });
            
            // Ejecutar todas las promesas
            const domainResults = await Promise.allSettled(domainCreationPromises);
            
            // Contar dominios creados exitosamente
            const successfulDomains = domainResults.filter(
              result => result.status === 'fulfilled' && result.value.success
            ).length;
            
            if (successfulDomains > 0) {
              toast.success(`Se han creado ${successfulDomains} dominio(s) nuevos para el cliente`);
            }
            
            // Mostrar errores si los hay
            const failedDomains = domainResults
              .filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success))
              .map(result => 
                result.status === 'rejected' 
                  ? { domain: 'Desconocido', error: result.reason } 
                  : { domain: result.value.domain, error: result.value.error }
              );
            
            if (failedDomains.length > 0) {
              console.error('Dominios no creados:', failedDomains);
              toast.warning(`No se pudieron crear ${failedDomains.length} dominio(s) nuevos`);
            }
          }
        }
      }
      
      // Actualizar el cliente en la lista y en el estado de detalles
      const updatedClients = clients.map(client => 
        client._id === clientId ? { ...client, ...updates } : client
      );
      setClients(updatedClients);
      
      if (selectedClient && selectedClient._id === clientId) {
        setSelectedClient({ ...selectedClient, ...updates });
      }
    } catch (error) {
      toast.error(error.message || 'Error al actualizar cliente');
    }
  };

  const handleToggleStatus = async (clientId, newStatus) => {
    try {
      await toggleClientStatus(clientId, newStatus);
      toast.success(`Estado del cliente cambiado a ${newStatus === 'active' ? 'activo' : 'inactivo'}`);
      
      // Refrescar la lista completa para obtener datos actualizados del servidor
      setTimeout(() => {
        fetchClients();
        // Notificar a otros componentes sobre el cambio
        renewalNotificationManager.onSubscriptionReactivated();
      }, 1500); // Delay para permitir que el backend procese las solicitudes pendientes
      
      // Actualización optimista inmediata
      const updatedClients = clients.map(client => 
        client._id === clientId ? { ...client, status: newStatus } : client
      );
      setClients(updatedClients);
      
      if (selectedClient && selectedClient._id === clientId) {
        setSelectedClient({ ...selectedClient, status: newStatus });
      }
    } catch (error) {
      toast.error(error.message || 'Error al cambiar el estado del cliente');
    }
  };

  const handleSearchChange = (e) => {
    updateSearchTerm(e.target.value);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClients();
  };

  const handleClearFilters = () => {
    updateSearchTerm('');
    updateStatusFilter('');
    updatePlanFilter('');
    fetchClients();
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = searchTerm || statusFilter || planFilter;

  // Funciones utilitarias para etiquetas
  const getStatusLabel = (status) => {
    const statusLabels = {
      active: 'Activos',
      inactive: 'Inactivos',
      suspended: 'Suspendidos'
    };
    return statusLabels[status] || status;
  };

  const getPlanLabel = (plan) => {
    const planLabels = {
      basic: 'Básico',
      standard: 'Estándar',
      premium: 'Premium',
      enterprise: 'Empresarial'
    };
    return planLabels[plan] || plan;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#235C88]">Gestión de Clientes</h1>
        <button
          onClick={handleShowCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Crear Cliente
        </button>
      </div>

      <div className="mb-6 bg-white p-4 rounded shadow">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="col-span-1 md:col-span-2">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => updateStatusFilter(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Estado del cliente</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>
          <div>
            <select
              value={planFilter}
              onChange={(e) => updatePlanFilter(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Todos los planes</option>
              <option value="basic">Básico</option>
              <option value="standard">Estándar</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Empresarial</option>
            </select>
          </div>
          <div>
            <select
              value={subscriptionStatusFilter}
              onChange={(e) => updateSubscriptionStatusFilter(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Estado suscripción</option>
              <option value="active">Suscripción activa</option>
              <option value="inactive">Suscripción inactiva</option>
              <option value="pending_renewal">Renovación pendiente</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-5 flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Buscar
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Información de resultados */}
      {!isLoading && (
        <div className="mb-4 text-sm text-gray-600">
          {clients.length === 0 ? (
            "No se encontraron clientes con los filtros aplicados"
          ) : (
            `Mostrando ${clients.length} cliente${clients.length !== 1 ? 's' : ''} ${pagination.total > clients.length ? `de ${pagination.total} totales` : ''}`
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ClientList
          clients={clients}
          onViewDetails={handleViewDetails}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={handleCloseDetails}
          onToggleStatus={handleToggleStatus}
          onUpdateClient={handleUpdateClient}
        />
      )}

      {showCreateModal && (
        <CreateClientModal
          onClose={handleCloseCreateModal}
          onClientCreated={handleCreateClient}
        />
      )}
    </div>
  );
};

export default ClientsManagementPage;