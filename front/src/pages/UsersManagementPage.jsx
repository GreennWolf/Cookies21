import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  toggleUserStatus, 
  updatePermissions 
} from '../api/user';
import { getClients } from '../api/client'; // Para owners que necesitan seleccionar un cliente
import UserList from '../components/user/UserList';
import UserDetailsModal from '../components/user/UserDetailsModal';
import CreateUserModal from '../components/user/CreateUserModal';
import { AuthContext } from '../contexts/AuthContext'; // Asegúrate de que la ruta sea correcta

const UsersManagementPage = () => {
  const { user } = useContext(AuthContext);
  const isOwner = user?.role === 'owner';
  const location = useLocation();
  
  // Si hay un clientId en los query params, lo usamos (para owners que navegan desde la lista de clientes)
  const queryParams = new URLSearchParams(location.search);
  const clientIdFromParams = queryParams.get('clientId');

  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(clientIdFromParams || '');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClients, setIsLoadingClients] = useState(isOwner);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Cargar clientes si el usuario es owner
  useEffect(() => {
    if (isOwner) {
      fetchClients();
    }
  }, [isOwner]);

  // Cargar usuarios
  useEffect(() => {
    fetchUsers();
  }, [statusFilter, roleFilter, selectedClient]);

  const fetchClients = async () => {
    if (!isOwner) return;
    
    setIsLoadingClients(true);
    try {
      const response = await getClients({ status: 'active' });
      setClients(response.data.clients);
    } catch (error) {
      toast.error(error.message || 'Error al cargar clientes');
    } finally {
      setIsLoadingClients(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (roleFilter) params.role = roleFilter;
      
      // Si es owner y ha seleccionado un cliente específico
      if (isOwner && selectedClient) {
        params.clientId = selectedClient;
      }

      const response = await getUsers(params);
      setUsers(response.data.users || []); // Asegurarnos de que users sea un array
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error.message || 'Error al cargar usuarios');
      setUsers([]); // Inicializar como array vacío en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
  };

  const handleCloseDetails = () => {
    setSelectedUser(null);
  };

  const handleShowCreateModal = () => {
    // console.log("Abriendo modal de creación de usuario");
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    // console.log("Cerrando modal de creación de usuario");
    setShowCreateModal(false);
  };

  const handleCreateUser = async (userData) => {
    // console.log("Creando usuario con datos:", userData);
    
    // Si es owner y ha seleccionado un cliente y el usuario a crear no es owner, añadir clientId
    if (isOwner && selectedClient && !userData.clientId && userData.role !== 'owner') {
      userData.clientId = selectedClient;
    }
    
    try {
      const response = await createUser(userData);
      toast.success(`Usuario ${response.data.user.name} invitado exitosamente`);
      fetchUsers();
      return response;
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error.message || 'Error al crear usuario');
      throw error;
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await updateUser(userId, updates);
      toast.success('Usuario actualizado exitosamente');
      
      // Actualizar el usuario en la lista y en el estado de detalles
      const updatedUsers = users.map(user => 
        user._id === userId ? { ...user, ...updates } : user
      );
      setUsers(updatedUsers);
      
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser({ ...selectedUser, ...updates });
      }
    } catch (error) {
      toast.error(error.message || 'Error al actualizar usuario');
    }
  };

  const handleToggleStatus = async (userId, newStatus) => {
    try {
      await toggleUserStatus(userId, newStatus);
      toast.success(`Estado del usuario cambiado a ${
        newStatus === 'active' ? 'activo' : 
        newStatus === 'inactive' ? 'inactivo' : 'suspendido'
      }`);
      
      // Actualizar el usuario en la lista y en el estado de detalles
      const updatedUsers = users.map(user => 
        user._id === userId ? { ...user, status: newStatus } : user
      );
      setUsers(updatedUsers);
      
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
    } catch (error) {
      toast.error(error.message || 'Error al cambiar el estado del usuario');
    }
  };

  const handleUpdatePermissions = async (userId, permissions) => {
    try {
      await updatePermissions(userId, permissions);
      toast.success('Permisos actualizados exitosamente');
      
      // Actualizar el usuario en la lista y en el estado de detalles
      const updatedUsers = users.map(user => 
        user._id === userId ? { 
          ...user, 
          customPermissions: { enabled: true, permissions } 
        } : user
      );
      setUsers(updatedUsers);
      
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser({ 
          ...selectedUser, 
          customPermissions: { enabled: true, permissions } 
        });
      }
    } catch (error) {
      toast.error(error.message || 'Error al actualizar permisos');
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleClientChange = (e) => {
    setSelectedClient(e.target.value);
  };

  // Debug para ver si el modal debería mostrarse
  // console.log("Estado de showCreateModal:", showCreateModal);
  // console.log("Clientes disponibles:", clients);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#235C88]">Gestión de Usuarios</h1>
        <button
          onClick={handleShowCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          // Quitamos la condición de deshabilitación para los owners sin cliente seleccionado
          // Ya que ahora pueden crear otros owners sin necesidad de un cliente
        >
          Invitar Usuario
        </button>
      </div>

      <div className="mb-6 bg-white p-4 rounded shadow">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Selector de cliente (solo para owners) */}
          {isOwner && (
            <div className="col-span-1 md:col-span-4 mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={selectedClient}
                onChange={handleClientChange}
                className="w-full border p-2 rounded"
                disabled={isLoadingClients}
              >
                <option value="">Todos los clientes</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {isLoadingClients && (
                <div className="mt-2 text-sm text-gray-500">
                  Cargando clientes...
                </div>
              )}
            </div>
          )}
          
          <div className="col-span-2">
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="pending">Pendientes</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Todos los roles</option>
              {isOwner && <option value="owner">Owner</option>}
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Buscar
            </button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <UserList
          users={users}
          onViewDetails={handleViewDetails}
          onToggleStatus={handleToggleStatus}
          isOwner={isOwner}
        />
      )}

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={handleCloseDetails}
          onToggleStatus={handleToggleStatus}
          onUpdateUser={handleUpdateUser}
          onUpdatePermissions={handleUpdatePermissions}
          isOwner={isOwner}
        />
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={handleCloseCreateModal}
          onUserCreated={handleCreateUser}
          isOwner={isOwner}
          selectedClientId={selectedClient}
          clients={clients}
        />
      )}
    </div>
  );
};

export default UsersManagementPage;