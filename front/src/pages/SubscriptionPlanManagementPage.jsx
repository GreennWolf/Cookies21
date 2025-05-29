import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getSubscriptionPlans, 
  togglePlanStatus, 
  initializeDefaultPlans 
} from '../api/subscription';
import SubscriptionPlanList from '../components/subscription/SubscriptionPlanList';
import SubscriptionPlanDetailsModal from '../components/subscription/SubscriptionPlanDetailsModal';
import CreateSubscriptionPlanModal from '../components/subscription/CreateSubscriptionPlanModal';

const SubscriptionPlanManagementPage = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showInitializeConfirm, setShowInitializeConfirm] = useState(false);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [statusFilter]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const response = await getSubscriptionPlans(params);
      setPlans(response.data.plans);
    } catch (error) {
      toast.error(error.message || 'Error al cargar planes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (plan) => {
    setSelectedPlan(plan);
  };

  const handleCloseDetails = () => {
    setSelectedPlan(null);
  };

  const handleShowCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handlePlanCreated = (newPlan) => {
    setPlans([...plans, newPlan]);
  };

  const handlePlanUpdated = (updatedPlan) => {
    const updatedPlans = plans.map(plan => 
      plan._id === updatedPlan._id ? updatedPlan : plan
    );
    setPlans(updatedPlans);
    setSelectedPlan(updatedPlan);
  };

  const handlePlanCloned = (newPlan) => {
    setPlans([...plans, newPlan]);
    toast.info(`Plan clonado: ${newPlan.name}`);
  };

  const handleToggleStatus = async (planId, newStatus) => {
    try {
      const response = await togglePlanStatus(planId, newStatus);
      
      // Actualizar el plan en la lista
      const updatedPlans = plans.map(plan => 
        plan._id === planId ? { ...plan, status: newStatus } : plan
      );
      setPlans(updatedPlans);
      
      // Actualizar el plan seleccionado si es el mismo
      if (selectedPlan && selectedPlan._id === planId) {
        setSelectedPlan({ ...selectedPlan, status: newStatus });
      }
      
      toast.success(`Estado del plan cambiado a ${newStatus === 'active' ? 'activo' : 'inactivo'}`);
    } catch (error) {
      toast.error(error.message || 'Error al cambiar el estado del plan');
    }
  };

  const handleInitializePlans = async () => {
    setInitializing(true);
    try {
      const response = await initializeDefaultPlans();
      toast.success('Planes predeterminados inicializados correctamente');
      fetchPlans();
    } catch (error) {
      toast.error(error.message || 'Error al inicializar planes predeterminados');
    } finally {
      setInitializing(false);
      setShowInitializeConfirm(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#235C88]">Gestión de Planes de Suscripción</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowInitializeConfirm(true)}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition"
          >
            Inicializar Planes
          </button>
          <button
            onClick={handleShowCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Crear Plan
          </button>
        </div>
      </div>

      <div className="mb-6 bg-white p-4 rounded shadow">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <label className="mr-2 text-sm font-medium text-gray-700">Filtrar por estado:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="archived">Archivados</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 italic">
            Total: {plans.length} planes
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <SubscriptionPlanList
          plans={plans}
          onViewDetails={handleViewDetails}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {selectedPlan && (
        <SubscriptionPlanDetailsModal
          plan={selectedPlan}
          onClose={handleCloseDetails}
          onUpdate={handlePlanUpdated}
          onClone={handlePlanCloned}
        />
      )}

      {showCreateModal && (
        <CreateSubscriptionPlanModal
          onClose={handleCloseCreateModal}
          onPlanCreated={handlePlanCreated}
        />
      )}

      {/* Modal de confirmación para inicializar planes */}
      {showInitializeConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full m-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Inicializar Planes Predeterminados</h3>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción creará los planes de suscripción predeterminados (Básico, Estándar, Premium y Enterprise).
              <br /><br />
              Si ya existen planes, no se modificarán.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowInitializeConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                disabled={initializing}
              >
                Cancelar
              </button>
              <button
                onClick={handleInitializePlans}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={initializing}
              >
                {initializing ? 'Inicializando...' : 'Inicializar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlanManagementPage;