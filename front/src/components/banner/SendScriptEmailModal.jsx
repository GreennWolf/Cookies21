import React, { useState, useEffect } from 'react';
import { X, Search, Mail, Users, Send, CheckCircle, AlertCircle, ChevronDown, ChevronRight, ArrowRight, ArrowLeft, Clock, Globe, Plus } from 'lucide-react';
import { getClients } from '../../api/client';
import { getUsers } from '../../api/user';
import { getDomains } from '../../api/domain';
import { sendScriptByEmail } from '../../api/bannerTemplate';
import DomainSelectionModal from './DomainSelectionModal';
import CreateDomainModal from './CreateDomainModal';
import FinalSummaryModal from './FinalSummaryModal';

// Estados de flujo por pasos
const STEPS = {
  SELECTING_USERS: 'selecting_users',
  CONFIGURING_DOMAINS: 'configuring_domains', 
  FINAL_SUMMARY: 'final_summary',
  SENDING: 'sending',
  COMPLETED: 'completed'
};

function SendScriptEmailModal({ isOpen, onClose, banner, onEmailSent }) {
  // Estados principales del flujo
  const [currentStep, setCurrentStep] = useState(STEPS.SELECTING_USERS);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  
  // Estados para el flujo de dominios
  const [clientsWithUsers, setClientsWithUsers] = useState([]);
  const [currentClientIndex, setCurrentClientIndex] = useState(0);
  const [domainConfigurations, setDomainConfigurations] = useState({});
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [showCreateDomainModal, setShowCreateDomainModal] = useState(false);
  const [possibleDomains, setPossibleDomains] = useState(null);

  // Cargar clientes y usuarios al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      resetModalState();
    }
  }, [isOpen]);

  const resetModalState = () => {
    setCurrentStep(STEPS.SELECTING_USERS);
    setSelectedUsers([]);
    setSearchTerm('');
    setSelectedClient('');
    setError(null);
    setClientsWithUsers([]);
    setCurrentClientIndex(0);
    setDomainConfigurations({});
    setShowDomainModal(false);
    setShowCreateDomainModal(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Si el banner es de un cliente específico
      if (banner?.clientId && banner.type !== 'system') {
        // Cargar solo los usuarios de ese cliente - sin límite
        const usersResponse = await getUsers({ 
          clientId: banner.clientId,
          limit: 1000 // Número alto para traer todos
        });
        setUsers(usersResponse.data.users);
        setFilteredUsers(usersResponse.data.users);
      } else {
        // Si es un banner del sistema, cargar todos los clientes y usuarios
        const [clientsResponse, usersResponse] = await Promise.all([
          getClients(),
          getUsers({ limit: 1000 }) // Número alto para traer todos los usuarios
        ]);
        setClients(clientsResponse.data.clients);
        setUsers(usersResponse.data.users);
        setFilteredUsers(usersResponse.data.users);
        
        // Colapsar todos los grupos por defecto
        const groups = {};
        usersResponse.data.users.forEach(user => {
          const clientKey = user.clientId?._id || 'no-client';
          groups[clientKey] = false; // Colapsados por defecto
        });
        setExpandedGroups(groups);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Determinar si es un banner del sistema
  const isSystemBanner = banner?.type === 'system' || !banner?.clientId;

  // Filtrar usuarios según búsqueda y cliente seleccionado
  useEffect(() => {
    let filtered = [...users];

    // Filtrar por cliente si está seleccionado
    if (selectedClient) {
      if (selectedClient === 'no-client') {
        // Mostrar solo usuarios sin cliente (owners y usuarios del sistema)
        filtered = filtered.filter(user => !user.clientId);
      } else {
        // Mostrar usuarios del cliente específico
        filtered = filtered.filter(user => user.clientId?._id === selectedClient);
      }
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.clientId?.name?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
    
    // Actualizar grupos expandidos cuando cambian los usuarios filtrados
    if (isSystemBanner) {
      const newGroups = {};
      filtered.forEach(user => {
        const clientKey = user.clientId?._id || 'no-client';
        if (!(clientKey in expandedGroups)) {
          newGroups[clientKey] = false; // Colapsar nuevos grupos por defecto
        } else {
          newGroups[clientKey] = expandedGroups[clientKey];
        }
      });
      setExpandedGroups(newGroups);
    }
  }, [searchTerm, selectedClient, users, isSystemBanner]);

  // Manejar selección de usuario
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Seleccionar/deseleccionar todos los usuarios visibles
  const toggleSelectAll = () => {
    const visibleUserIds = filteredUsers.map(user => user._id);
    if (selectedUsers.length === visibleUserIds.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(visibleUserIds);
    }
  };

  // Expandir/contraer grupo
  const toggleGroupExpansion = (clientKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [clientKey]: !prev[clientKey]
    }));
  };

  // Expandir todos los grupos
  const expandAllGroups = () => {
    const newState = {};
    Object.keys(expandedGroups).forEach(key => {
      newState[key] = true;
    });
    setExpandedGroups(newState);
  };

  // Contraer todos los grupos
  const collapseAllGroups = () => {
    const newState = {};
    Object.keys(expandedGroups).forEach(key => {
      newState[key] = false;
    });
    setExpandedGroups(newState);
  };

  // Verificar si todos los grupos están expandidos
  const allGroupsExpanded = Object.values(expandedGroups).every(Boolean);
  const allGroupsCollapsed = Object.values(expandedGroups).every(value => !value);

  // Procesar usuarios por cliente
  const processUsersToNextStep = () => {
    if (selectedUsers.length === 0) {
      setError('Por favor selecciona al menos un usuario');
      return;
    }

    // Agrupar usuarios seleccionados por cliente
    const selectedUserObjects = users.filter(user => selectedUsers.includes(user._id));
    const grouped = {};
    
    console.log('👥 Usuarios seleccionados:', selectedUserObjects.map(user => ({
      name: user.name,
      email: user.email,
      clientId: user.clientId?._id,
      clientName: user.clientId?.name
    })));
    
    selectedUserObjects.forEach(user => {
      const clientKey = user.clientId?._id || 'no-client';
      const clientName = user.clientId?.name || 'Usuarios del Sistema (Owners)';
      
      if (!grouped[clientKey]) {
        grouped[clientKey] = {
          id: clientKey,
          name: clientName,
          users: []
        };
      }
      grouped[clientKey].users.push(user);
    });

    console.log('📊 Agrupación final por cliente:', Object.entries(grouped).map(([key, group]) => ({
      clientId: key,
      clientName: group.name,
      userCount: group.users.length,
      users: group.users.map(u => u.email)
    })));

    const clientsList = Object.values(grouped);
    setClientsWithUsers(clientsList);
    setCurrentClientIndex(0);
    setCurrentStep(STEPS.CONFIGURING_DOMAINS);
    
    // Iniciar configuración del primer cliente
    processClientDomains(clientsList[0]);
  };

  // Procesar dominios de un cliente específico
  const processClientDomains = async (client) => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener dominios del cliente (active y pending, no inactive)
      const clientId = client.id === 'no-client' ? 'null' : client.id;
      const params = { 
        clientId: clientId
      };
      
      console.log('🔍 Obteniendo dominios para cliente:', { 
        clientName: client.name,
        clientId: client.id, 
        resolvedClientId: clientId,
        params 
      });
      const domainsResponse = await getDomains(params);
      
      console.log('📊 Respuesta de dominios:', { 
        domainsCount: domainsResponse.data.domains?.length || 0,
        domains: domainsResponse.data.domains?.map(d => ({ id: d._id, domain: d.domain, clientId: d.clientId }))
      });
      
      const domains = domainsResponse.data.domains || [];
      
      if (domains.length === 0) {
        console.log('⚠️ No se encontraron dominios para este cliente específico');
        
        // Si no se encontraron dominios para este cliente específico,
        // buscar todos los dominios para ver si hay disponibles con otro clientId
        if (clientId !== 'null') {
          console.log('🔍 Buscando todos los dominios disponibles para análisis...');
          const allDomainsResponse = await getDomains({});
          const allDomains = allDomainsResponse.data.domains?.filter(d => d.status !== 'inactive') || [];
          
          console.log('📋 Todos los dominios disponibles:', allDomains.map(d => ({
            id: d._id,
            domain: d.domain,
            clientId: d.clientId,
            clientName: d.clientName || d.clientId?.name
          })));
          
          // Buscar dominios que podrían pertenecer a este cliente por nombre
          const possibleDomains = allDomains.filter(domain => {
            const domainClientName = domain.clientName || domain.clientId?.name;
            return domainClientName && 
              (domainClientName.toLowerCase().includes(client.name.toLowerCase()) ||
               client.name.toLowerCase().includes(domainClientName.toLowerCase()));
          });
          
          if (possibleDomains.length > 0) {
            console.log('🎯 Dominios posibles encontrados por nombre:', possibleDomains);
            console.warn(`⚠️ CLIENTE DUPLICADO DETECTADO: Se encontraron ${possibleDomains.length} dominios con cliente de nombre similar para "${client.name}"`);
            
            // Mostrar modal para seleccionar entre los dominios encontrados
            if (possibleDomains.length === 1) {
              setDomainConfigurations(prev => ({
                ...prev,
                [client.id]: {
                  domain: possibleDomains[0],
                  needsUpdate: true
                }
              }));
              moveToNextClient();
              return;
            } else {
              // Guardar dominios posibles para mostrar en modal
              setPossibleDomains(possibleDomains);
              setShowDomainModal(true);
              return;
            }
          }
        }
        
        // No tiene dominios - mostrar modal para crear
        setShowCreateDomainModal(true);
      } else if (domains.length === 1) {
        // Tiene exactamente 1 dominio - usar automáticamente
        setDomainConfigurations(prev => ({
          ...prev,
          [client.id]: {
            domain: domains[0],
            needsUpdate: true
          }
        }));
        moveToNextClient();
      } else {
        // Tiene múltiples dominios - mostrar modal de selección
        setShowDomainModal(true);
      }
    } catch (error) {
      console.error('Error al obtener dominios:', error);
      setError('Error al obtener dominios del cliente');
    } finally {
      setLoading(false);
    }
  };

  // Mover al siguiente cliente o finalizar configuración
  const moveToNextClient = () => {
    const nextIndex = currentClientIndex + 1;
    
    if (nextIndex < clientsWithUsers.length) {
      setCurrentClientIndex(nextIndex);
      processClientDomains(clientsWithUsers[nextIndex]);
    } else {
      // Todos los clientes configurados - ir a resumen final
      setCurrentStep(STEPS.FINAL_SUMMARY);
    }
  };

  // Manejar selección de dominio
  const handleDomainSelected = (domain) => {
    const currentClient = clientsWithUsers[currentClientIndex];
    setDomainConfigurations(prev => ({
      ...prev,
      [currentClient.id]: {
        domain: domain,
        needsUpdate: true
      }
    }));
    
    setShowDomainModal(false);
    moveToNextClient();
  };

  // Manejar creación de dominio
  const handleDomainCreated = (newDomain) => {
    const currentClient = clientsWithUsers[currentClientIndex];
    setDomainConfigurations(prev => ({
      ...prev,
      [currentClient.id]: {
        domain: newDomain,
        needsUpdate: false // Ya se creó con el defaultTemplateId
      }
    }));
    
    setShowCreateDomainModal(false);
    moveToNextClient();
  };

  // Envío final
  const handleFinalSend = async (finalData) => {
    try {
      setCurrentStep(STEPS.SENDING);
      
      // Aquí implementarás la lógica de envío final
      await sendScriptByEmail(banner.id, finalData);
      
      setCurrentStep(STEPS.COMPLETED);
      
      // Notificar al componente padre
      if (onEmailSent) {
        onEmailSent({
          type: 'success',
          message: `Script enviado correctamente a ${finalData.recipients.length} usuario(s)`
        });
      }

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error al enviar emails:', error);
      setError(error.message || 'Error al enviar los emails');
      setCurrentStep(STEPS.FINAL_SUMMARY);
    }
  };

  if (!isOpen) return null;

  // Agrupar usuarios por cliente para banner del sistema
  const groupUsersByClient = () => {
    const grouped = {};
    filteredUsers.forEach(user => {
      // Usar ID del cliente o un key especial para usuarios sin cliente (owners)
      const clientKey = user.clientId?._id || 'no-client';
      const clientName = user.clientId?.name || 'Usuarios del Sistema (Owners)';
      
      if (!grouped[clientKey]) {
        grouped[clientKey] = {
          name: clientName,
          id: clientKey,
          users: []
        };
      }
      grouped[clientKey].users.push(user);
    });
    return grouped;
  };

  // Función para obtener el título del paso actual
  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.SELECTING_USERS:
        return 'Seleccionar Usuarios';
      case STEPS.CONFIGURING_DOMAINS:
        return `Configurar Dominio - ${clientsWithUsers[currentClientIndex]?.name || ''}`;
      case STEPS.FINAL_SUMMARY:
        return 'Resumen Final';
      case STEPS.SENDING:
        return 'Enviando...';
      case STEPS.COMPLETED:
        return 'Completado';
      default:
        return 'Enviar Script por Email';
    }
  };

  // Función para renderizar la selección de usuarios
  function renderUserSelection() {
    return (
      <>
        <div className="p-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Banner:</h4>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium">{banner?.name}</div>
              <div className="text-sm text-gray-600">
                Tipo: {banner?.type === 'system' ? 'Sistema' : 'Personalizado'}
                {banner?.clientName && (
                  <span className="ml-2">• Cliente: {banner.clientName}</span>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Filtros */}
              <div className="mb-4 space-y-3">
                {/* Buscador */}
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Selector de cliente (solo para banners del sistema) */}
                {isSystemBanner && (
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-700"
                  >
                    <option value="">Todos los usuarios</option>
                    <option value="no-client">Solo usuarios del sistema (Owners)</option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Información de selección */}
              <div className="mb-4 flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {selectedUsers.length > 0 ? (
                      <>
                        <span className="text-blue-600 font-semibold">{selectedUsers.length}</span> de {filteredUsers.length} usuarios seleccionados
                      </>
                    ) : (
                      `${filteredUsers.length} usuarios disponibles`
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isSystemBanner && Object.keys(expandedGroups).length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={expandAllGroups}
                        disabled={allGroupsExpanded}
                        className="text-sm font-medium text-gray-600 hover:text-gray-700 transition-colors duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronDown size={14} />
                        Expandir todo
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={collapseAllGroups}
                        disabled={allGroupsCollapsed}
                        className="text-sm font-medium text-gray-600 hover:text-gray-700 transition-colors duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={14} />
                        Contraer todo
                      </button>
                    </div>
                  )}
                  {filteredUsers.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                    >
                      {selectedUsers.length === filteredUsers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Lista de usuarios */}
              <div className="border border-gray-200 rounded-lg">
                {filteredUsers.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      {searchTerm || selectedClient ? 
                        'No se encontraron usuarios con los filtros aplicados' : 
                        'No hay usuarios disponibles'
                      }
                    </p>
                  </div>
                ) : isSystemBanner ? (
                  // Vista agrupada por cliente para banners del sistema
                  Object.entries(groupUsersByClient()).map(([clientKey, clientGroup], index) => (
                    <div key={clientKey} className={index > 0 ? 'border-t border-gray-200' : ''}>
                      <button
                        onClick={() => toggleGroupExpansion(clientKey)}
                        className="w-full px-4 py-2 bg-gray-50 font-medium text-sm text-gray-700 sticky top-0 border-b border-gray-200 hover:bg-gray-100 transition-colors duration-200 text-left"
                      >
                        <span className="inline-flex items-center gap-2">
                          {expandedGroups[clientKey] ? (
                            <ChevronDown size={14} className="text-gray-500" />
                          ) : (
                            <ChevronRight size={14} className="text-gray-500" />
                          )}
                          <Users size={14} className="text-gray-500" />
                          {clientGroup.name}
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                            {clientGroup.users.length}
                          </span>
                          {clientKey === 'no-client' && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                              SISTEMA
                            </span>
                          )}
                        </span>
                      </button>
                      {expandedGroups[clientKey] && (
                        clientGroup.users.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500 text-sm">
                            No hay usuarios en este grupo
                          </div>
                        ) : (
                          clientGroup.users.map(user => (
                            <label
                              key={user._id}
                              className="flex items-center px-4 py-3 hover:bg-blue-50/50 cursor-pointer transition-colors duration-150"
                            >
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user._id)}
                                onChange={() => toggleUserSelection(user._id)}
                                className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-offset-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                                  {user.name}
                                  {user.role === 'owner' && (
                                    <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded font-medium">
                                      OWNER
                                    </span>
                                  )}
                                  {user.role === 'admin' && (
                                    <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 truncate">{user.email}</div>
                              </div>
                            </label>
                          ))
                        )
                      )}
                    </div>
                  ))
                ) : (
                  // Vista simple para banners de cliente específico
                  filteredUsers.map((user, index) => (
                    <label
                      key={user._id}
                      className={`flex items-center px-4 py-3 hover:bg-blue-50/50 cursor-pointer transition-colors duration-150 ${
                        index > 0 ? 'border-t border-gray-100' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => toggleUserSelection(user._id)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                          {user.name}
                          {user.role === 'owner' && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded font-medium">
                              OWNER
                            </span>
                          )}
                          {user.role === 'admin' && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
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
            onClick={processUsersToNextStep}
            disabled={selectedUsers.length === 0}
            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <ArrowRight size={16} />
            <span>Siguiente ({selectedUsers.length})</span>
          </button>
        </div>
      </>
    );
  }

  // Función para renderizar la configuración de dominios
  function renderDomainConfiguration() {
    const currentClient = clientsWithUsers[currentClientIndex];
    
    return (
      <>
        <div className="p-4">
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Configurando dominios:</h4>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-900">
                Cliente: {currentClient?.name}
              </div>
              <div className="text-sm text-blue-700">
                {currentClient?.users?.length} usuario(s) seleccionado(s)
              </div>
              <div className="text-sm text-blue-600 mt-1">
                Paso {currentClientIndex + 1} de {clientsWithUsers.length}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Verificando dominios...</span>
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500 mb-2">
                Este cliente no tiene dominios configurados
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Necesitas crear un dominio para generar el script
              </p>
              
              {/* Botón para crear dominio manualmente */}
              <button
                onClick={() => setShowCreateDomainModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <Plus size={16} />
                Crear Nuevo Dominio
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
              <AlertCircle size={18} className="mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
              
              {/* Botón para reintentar o crear dominio */}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => processClientDomains(currentClient)}
                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Reintentar
                </button>
                <button
                  onClick={() => setShowCreateDomainModal(true)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Crear Dominio
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-between">
          <button
            onClick={() => setCurrentStep(STEPS.SELECTING_USERS)}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
          >
            Cancelar
          </button>
        </div>
      </>
    );
  }

  // Función para renderizar el estado de envío
  function renderSending() {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-6"></div>
          <p className="text-lg font-medium text-gray-900 mb-2">Enviando scripts...</p>
          <p className="text-sm text-gray-500 text-center">
            Por favor espera mientras enviamos los scripts de consent a los usuarios seleccionados
          </p>
        </div>
      </div>
    );
  }

  // Función para renderizar el estado completado
  function renderCompleted() {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <CheckCircle size={48} className="text-green-500 mb-4" />
          <p className="text-lg font-medium text-gray-900">¡Scripts enviados correctamente!</p>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Los scripts han sido enviados exitosamente a todos los usuarios seleccionados
          </p>
        </div>
      </div>
    );
  }

  // Renderizar contenido según el paso actual
  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.SELECTING_USERS:
        return renderUserSelection();
      case STEPS.CONFIGURING_DOMAINS:
        return renderDomainConfiguration();
      case STEPS.FINAL_SUMMARY:
        return <FinalSummaryModal 
          clientsWithUsers={clientsWithUsers}
          domainConfigurations={domainConfigurations}
          banner={banner}
          onSend={handleFinalSend}
          onBack={() => setCurrentStep(STEPS.SELECTING_USERS)}
        />;
      case STEPS.SENDING:
        return renderSending();
      case STEPS.COMPLETED:
        return renderCompleted();
      default:
        return renderUserSelection();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div 
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">{getStepTitle()}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="px-4 py-2 bg-gray-50 border-b">
              <div className="flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${currentStep === STEPS.SELECTING_USERS ? 'text-blue-600 font-medium' : currentStep === STEPS.CONFIGURING_DOMAINS || currentStep === STEPS.FINAL_SUMMARY || currentStep === STEPS.SENDING || currentStep === STEPS.COMPLETED ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === STEPS.SELECTING_USERS ? 'bg-blue-100 text-blue-600' : currentStep === STEPS.CONFIGURING_DOMAINS || currentStep === STEPS.FINAL_SUMMARY || currentStep === STEPS.SENDING || currentStep === STEPS.COMPLETED ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    1
                  </div>
                  Usuarios
                </div>
                <div className={`flex items-center gap-2 ${currentStep === STEPS.CONFIGURING_DOMAINS ? 'text-blue-600 font-medium' : currentStep === STEPS.FINAL_SUMMARY || currentStep === STEPS.SENDING || currentStep === STEPS.COMPLETED ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === STEPS.CONFIGURING_DOMAINS ? 'bg-blue-100 text-blue-600' : currentStep === STEPS.FINAL_SUMMARY || currentStep === STEPS.SENDING || currentStep === STEPS.COMPLETED ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    2
                  </div>
                  Dominios
                </div>
                <div className={`flex items-center gap-2 ${currentStep === STEPS.FINAL_SUMMARY ? 'text-blue-600 font-medium' : currentStep === STEPS.SENDING || currentStep === STEPS.COMPLETED ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === STEPS.FINAL_SUMMARY ? 'bg-blue-100 text-blue-600' : currentStep === STEPS.SENDING || currentStep === STEPS.COMPLETED ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    3
                  </div>
                  Resumen
                </div>
              </div>
            </div>

            {/* Content */}
            {renderStepContent()}
        </div>
      </div>

      {/* Modales auxiliares */}
      {showDomainModal && (
        <DomainSelectionModal
          isOpen={showDomainModal}
          onClose={() => {
            setShowDomainModal(false);
            setPossibleDomains(null);
          }}
          client={clientsWithUsers[currentClientIndex]}
          onDomainSelected={handleDomainSelected}
          possibleDomains={possibleDomains}
        />
      )}

      {showCreateDomainModal && (
        <CreateDomainModal
          isOpen={showCreateDomainModal}
          onClose={() => setShowCreateDomainModal(false)}
          client={clientsWithUsers[currentClientIndex]}
          bannerId={banner?.id}
          onDomainCreated={handleDomainCreated}
        />
      )}
    </>
  );
}

export default SendScriptEmailModal;