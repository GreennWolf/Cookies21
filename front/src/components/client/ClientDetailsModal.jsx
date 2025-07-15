import React, { useState, useEffect, useContext, useMemo } from 'react';
import { toast } from 'react-toastify';
import { updateClient, updateSubscription, getClientMetrics, getClient, cancelClientSubscription, reactivateClientSubscription } from '../../api/client';
import { getSubscriptionPlans, assignPlanToClient } from '../../api/subscription';
import { createDomain } from '../../api/domain';
import { AuthContext } from '../../contexts/AuthContext';
import { renewalNotificationManager } from '../../utils/renewalNotifications';
import CancelSubscriptionModal from './CancelSubscriptionModal';

const ClientDetailsModal = ({ client, onClose, onToggleStatus, onUpdateClient }) => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [currentClient, setCurrentClient] = useState(client);
  const [formData, setFormData] = useState({
    name: currentClient.name || '',
    contactEmail: currentClient.contactEmail || '',
    domains: currentClient.domains || [],
    fiscalInfo: {
      cif: currentClient.fiscalInfo?.cif || '',
      razonSocial: currentClient.fiscalInfo?.razonSocial || '',
      direccion: currentClient.fiscalInfo?.direccion || '',
      codigoPostal: currentClient.fiscalInfo?.codigoPostal || '',
      poblacion: currentClient.fiscalInfo?.poblacion || '',
      provincia: currentClient.fiscalInfo?.provincia || '',
      pais: currentClient.fiscalInfo?.pais || 'España'
    }
  });
  const [metrics, setMetrics] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [isReactivatingSubscription, setIsReactivatingSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState({
    isUnlimited: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: null
  });
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  // Refrescar datos del cliente cuando se abre el modal
  useEffect(() => {
    refreshClientData();
  }, []);

  useEffect(() => {
    if (activeTab === 'metrics') {
      fetchClientMetrics();
    }
    if (activeTab === 'subscription') {
      fetchAvailablePlans();
      // Inicializar datos de suscripción basados en el cliente actual
      setSubscriptionData({
        isUnlimited: currentClient.subscription?.isUnlimited || false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: currentClient.subscription?.isUnlimited 
          ? null 
          : (currentClient.subscription?.endDate ? new Date(currentClient.subscription.endDate).toISOString().split('T')[0] : null)
      });
    }
  }, [activeTab, currentClient]);

  const refreshClientData = async () => {
    try {
      const response = await getClient(currentClient._id);
      if (response.data.client) {
        setCurrentClient(response.data.client);
        console.log('Cliente actualizado:', response.data.client);
      }
    } catch (error) {
      console.error('Error al refrescar cliente:', error);
    }
  };

  const fetchClientMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const response = await getClientMetrics(currentClient._id);
      setMetrics(response.data.metrics);
    } catch (error) {
      toast.error(error.message || 'Error al obtener métricas del cliente');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchAvailablePlans = async () => {
    setIsLoadingPlans(true);
    try {
      const response = await getSubscriptionPlans({ status: 'active' });
      setAvailablePlans(response.data.plans);
    } catch (error) {
      toast.error(error.message || 'Error al cargar planes disponibles');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Manejo de campos anidados con notación de punto
    if (name.includes('.')) {
      const parts = name.split('.');
      if (parts.length === 2) {
        const [section, field] = parts;
        setFormData({
          ...formData,
          [section]: {
            ...formData[section],
            [field]: type === 'checkbox' ? checked : value
          }
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleDomainChange = (e, index) => {
    const newDomains = [...formData.domains];
    newDomains[index] = e.target.value;
    setFormData({
      ...formData,
      domains: newDomains
    });
  };

  const addDomain = () => {
    setFormData({
      ...formData,
      domains: [...formData.domains, '']
    });
  };

  const removeDomain = (index) => {
    const newDomains = formData.domains.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      domains: newDomains
    });
  };

  const handleSubscriptionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSubscriptionData({
      ...subscriptionData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const subscriptionStatus = useMemo(() => {
    if (!currentClient.subscription) {
      return { isActive: false, reason: 'NO_SUBSCRIPTION', message: 'Sin suscripción' };
    }

    const now = new Date();
    const endDate = currentClient.subscription.endDate ? new Date(currentClient.subscription.endDate) : null;
    const startDate = currentClient.subscription.startDate ? new Date(currentClient.subscription.startDate) : null;
    
    // Para registros existentes sin status, usar 'active' como default si el cliente está activo
    const subscriptionStatus = currentClient.subscription.status || (currentClient.status === 'active' ? 'active' : 'cancelled');

    // Verificar si el cliente está inactivo (esto tiene prioridad)
    if (currentClient.status === 'inactive') {
      return { isActive: false, reason: 'CLIENT_INACTIVE', message: 'Cliente inactivo' };
    }

    // Verificar si la suscripción está marcada como cancelada
    if (subscriptionStatus === 'cancelled') {
      return { isActive: false, reason: 'CANCELLED', message: 'Suscripción cancelada' };
    }
    
    // Verificar si la suscripción está suspendida
    if (subscriptionStatus === 'suspended') {
      return { isActive: false, reason: 'SUSPENDED', message: 'Suscripción suspendida' };
    }

    // Verificar si aún no ha empezado
    if (startDate && now < startDate) {
      return { isActive: false, reason: 'NOT_STARTED', message: 'Suscripción no iniciada' };
    }

    // Verificar si ha expirado
    if (endDate && now > endDate) {
      return { isActive: false, reason: 'EXPIRED', message: 'Suscripción expirada' };
    }

    return { isActive: true, reason: 'ACTIVE', message: 'Suscripción activa' };
  }, [currentClient.subscription, currentClient.status]);

  // Debug: Log cuando cambia el estado de suscripción
  useEffect(() => {
    console.log('🔄 Estado de suscripción actualizado:', {
      isActive: subscriptionStatus.isActive,
      reason: subscriptionStatus.reason,
      message: subscriptionStatus.message,
      subscriptionStatus: currentClient.subscription?.status,
      clientStatus: currentClient.status,
      endDate: currentClient.subscription?.endDate,
      startDate: currentClient.subscription?.startDate,
      fullSubscription: currentClient.subscription
    });
  }, [subscriptionStatus, currentClient.subscription, currentClient.status]);

  const handleCancelSubscription = async (options) => {
    setIsCancellingSubscription(true);
    
    // Cerrar el modal inmediatamente
    setShowCancelModal(false);
    
    // Actualización optimista: actualizar UI inmediatamente
    const optimisticUpdate = {
      ...currentClient,
      subscription: {
        ...currentClient.subscription,
        status: 'cancelled',
        cancellation: {
          cancelledAt: new Date().toISOString(),
          reason: options.reason || 'Cancelación manual por owner'
        }
      },
      status: options.cancelImmediately ? 'inactive' : currentClient.status
    };
    
    console.log('🔄 Actualizando estado optimista a:', optimisticUpdate);
    setCurrentClient(optimisticUpdate);
    
    // Forzar re-render con un micro-delay
    setTimeout(() => {
      console.log('🔄 Forzando re-render después de actualización optimista');
      setCurrentClient(prev => ({ ...prev }));
    }, 10);
    
    try {
      const response = await cancelClientSubscription(currentClient._id, options);
      toast.success(response.message);
      
      // Esperar un poco antes de obtener datos del servidor para que la UI tenga tiempo de actualizar
      setTimeout(async () => {
        try {
          const updatedClient = await getClient(currentClient._id);
          console.log('🔄 Datos reales del servidor:', updatedClient.data.client);
          setCurrentClient(updatedClient.data.client);
          
          // Actualizar formulario con datos reales
          setFormData({
            name: updatedClient.data.client.name || '',
            contactEmail: updatedClient.data.client.contactEmail || '',
            domains: updatedClient.data.client.domains || [],
            fiscalInfo: {
              cif: updatedClient.data.client.fiscalInfo?.cif || '',
              razonSocial: updatedClient.data.client.fiscalInfo?.razonSocial || '',
              direccion: updatedClient.data.client.fiscalInfo?.direccion || '',
              codigoPostal: updatedClient.data.client.fiscalInfo?.codigoPostal || '',
              poblacion: updatedClient.data.client.fiscalInfo?.poblacion || '',
              provincia: updatedClient.data.client.fiscalInfo?.provincia || '',
              pais: updatedClient.data.client.fiscalInfo?.pais || 'España'
            }
          });
          
          // Notificar al componente padre
          // La lista se actualizará automáticamente con los datos reales del servidor
        } catch (error) {
          console.error('Error actualizando datos del servidor:', error);
        }
      }, 500);
    } catch (error) {
      console.error('Error al cancelar suscripción:', error);
      toast.error(error.message || 'Error al cancelar la suscripción');
      
      // Revertir actualización optimista en caso de error
      setCurrentClient(client);
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  const handleActivateSubscription = async () => {
    setIsReactivatingSubscription(true);
    
    // Actualización optimista: actualizar UI inmediatamente
    const now = new Date();
    const newEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const optimisticUpdate = {
      ...currentClient,
      subscription: {
        ...currentClient.subscription,
        status: 'active',
        startDate: now.toISOString(),
        endDate: newEndDate.toISOString()
      },
      status: 'active'
    };
    setCurrentClient(optimisticUpdate);
    
    try {
      const response = await reactivateClientSubscription(currentClient._id, { extendDays: 30 });
      toast.success(response.message);
      
      // Actualizar con datos reales del servidor con un pequeño delay para mostrar el mensaje
      setTimeout(async () => {
        const updatedClient = await getClient(currentClient._id);
        setCurrentClient(updatedClient.data.client);
        
        // Verificar si había una solicitud pendiente que se completó
        if (updatedClient.data.client.hasPendingRenewal !== currentClient.hasPendingRenewal || 
            (currentClient.hasPendingRenewal && !updatedClient.data.client.hasPendingRenewal)) {
          toast.success('🎉 ¡Solicitud de renovación completada automáticamente! Se envió email de confirmación al cliente.');
          
          // Notificar actualización para el contador del header
          renewalNotificationManager.onRenewalRequestCompleted();
        }
        
        // Forzar re-render de los datos del formulario
        setFormData({
          name: updatedClient.data.client.name || '',
          contactEmail: updatedClient.data.client.contactEmail || '',
          domains: updatedClient.data.client.domains || [],
          fiscalInfo: {
            cif: updatedClient.data.client.fiscalInfo?.cif || '',
            razonSocial: updatedClient.data.client.fiscalInfo?.razonSocial || '',
            direccion: updatedClient.data.client.fiscalInfo?.direccion || '',
            codigoPostal: updatedClient.data.client.fiscalInfo?.codigoPostal || '',
            poblacion: updatedClient.data.client.fiscalInfo?.poblacion || '',
            provincia: updatedClient.data.client.fiscalInfo?.provincia || '',
            pais: updatedClient.data.client.fiscalInfo?.pais || 'España'
          }
        });
      }, 1000); // Delay de 1 segundo para permitir que el backend procese
      
      toast.success(response.message);
      
      // La lista se actualizará automáticamente con los datos reales del servidor
    } catch (error) {
      console.error('Error al reactivar suscripción:', error);
      toast.error(error.message || 'Error al reactivar la suscripción');
      
      // Revertir actualización optimista en caso de error
      setCurrentClient(client);
    } finally {
      setIsReactivatingSubscription(false);
    }
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlanId(planId);
    
    // Encontrar el plan seleccionado para obtener sus propiedades
    const plan = availablePlans.find(p => p._id === planId);
    if (plan) {
      setSelectedPlan(plan);
      
      // Actualizar isUnlimited basado en el plan
      setSubscriptionData(prev => ({
        ...prev,
        isUnlimited: plan.limits?.isUnlimitedUsers || false
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Limpiar dominios vacíos
      const cleanedDomains = formData.domains.filter(domain => domain.trim() !== '');
      
      // Identificar dominios nuevos que se hayan agregado
      const originalDomains = currentClient.domains || [];
      const newDomains = cleanedDomains.filter(
        domain => !originalDomains.includes(domain)
      );
      
      // Preparar actualización del cliente
      const updates = {
        ...formData,
        domains: cleanedDomains
      };
      
      // Actualizar cliente
      await updateClient(currentClient._id, updates);
      toast.success('Cliente actualizado correctamente');
      
      // Si hay dominios nuevos, crearlos en la tabla de dominios
      if (newDomains.length > 0) {
        // Crear cada dominio nuevo
        const domainCreationPromises = newDomains.map(async (domainName) => {
          try {
            // Configuración por defecto para nuevos dominios
            const domainData = {
              domain: domainName,
              clientId: currentClient._id,
              status: 'active',
              settings: {
                design: {
                  theme: {
                    primary: '#235C88',
                    secondary: '#F0F0F0',
                    background: '#F0F0F0',
                    text: '#181818',
                  },
                  position: 'bottom',
                  layout: 'bar',
                },
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
        
        // Ejecutar todas las promesas de creación
        const domainResults = await Promise.allSettled(domainCreationPromises);
        
        // Contar dominios creados exitosamente
        const successfulDomains = domainResults.filter(
          result => result.status === 'fulfilled' && result.value.success
        ).length;
        
        if (successfulDomains > 0) {
          toast.success(`Se han creado ${successfulDomains} dominio(s) para el cliente`);
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
          toast.warning(`No se pudieron crear ${failedDomains.length} dominio(s)`);
        }
      }
      
      // Notificar al componente padre sobre la actualización
      onUpdateClient(currentClient._id, updates);
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || 'Error al actualizar cliente');
    }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    
    if (!selectedPlanId) {
      toast.error('Debes seleccionar un plan');
      return;
    }
    
    // Validación de fechas en el frontend
    if (!subscriptionData.isUnlimited && subscriptionData.startDate && subscriptionData.endDate) {
      const startDate = new Date(subscriptionData.startDate);
      const endDate = new Date(subscriptionData.endDate);
      
      if (endDate < startDate) {
        toast.error('La fecha de finalización no puede ser anterior a la fecha de inicio');
        return;
      }
    }
    
    setIsSubmittingPlan(true);
    try {
      // Si se seleccionó asignar vía API de asignación
      const planData = {
        startDate: subscriptionData.startDate,
        endDate: subscriptionData.isUnlimited ? null : subscriptionData.endDate,
        isUnlimited: subscriptionData.isUnlimited
        // Ya no enviamos maxUsers porque lo controlará el plan seleccionado
      };
      
      
      await assignPlanToClient(selectedPlanId, currentClient._id, planData);
      toast.success('Plan asignado correctamente');
      
      // Recargar métricas del cliente para reflejar los cambios
      if (onUpdateClient) {
        // Notificar al componente padre para actualizar la lista
        onUpdateClient(currentClient._id, { subscription: { planId: selectedPlanId } });
      }
      refreshClientData();
      // No cambiar de pestaña automáticamente
    } catch (error) {
      console.error('Error al asignar plan:', error);
      toast.error(error.message || 'Error al asignar plan');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    
    // Validación de fechas en el frontend
    if (!subscriptionData.isUnlimited && subscriptionData.startDate && subscriptionData.endDate) {
      const startDate = new Date(subscriptionData.startDate);
      const endDate = new Date(subscriptionData.endDate);
      
      if (endDate < startDate) {
        toast.error('La fecha de finalización no puede ser anterior a la fecha de inicio');
        return;
      }
    }
    
    setIsSubmittingPlan(true);
    try {
      const updates = {
        isUnlimited: subscriptionData.isUnlimited,
        startDate: subscriptionData.startDate,
        endDate: subscriptionData.isUnlimited ? null : subscriptionData.endDate
        // Ya no enviamos maxUsers porque lo controlará el plan
      };
      
      // Solo incluir planId si existe - extraer el ID del objeto si es necesario
      if (currentClient.subscription?.planId) {
        // Si planId es un objeto (populated), extraer el _id, si no, usar directamente
        updates.planId = typeof currentClient.subscription.planId === 'object' 
          ? currentClient.subscription.planId._id 
          : currentClient.subscription.planId;
      }
      
      
      await updateSubscription(currentClient._id, updates);
      toast.success('Suscripción actualizada correctamente');
      
      // Recargar métricas del cliente para reflejar los cambios
      if (onUpdateClient) {
        // Notificar al componente padre para actualizar la lista
        onUpdateClient(currentClient._id, { subscription: updates });
      }
      refreshClientData();
      // No cambiar de pestaña automáticamente
    } catch (error) {
      console.error('Error al actualizar suscripción:', error);
      toast.error(error.message || 'Error al actualizar suscripción');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-black/50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Editar Cliente' : 'Detalles del Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="bg-gray-100 border-b">
          <nav className="flex overflow-x-auto">
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'subscription' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('subscription')}
            >
              Suscripción
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'metrics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('metrics')}
            >
              Métricas
            </button>
          </nav>
        </div>
        
        <div className="p-4">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Información básica */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">🏢 Información Básica</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          📝 Nombre del Cliente
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full border border-blue-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Nombre de la empresa"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          📧 Email de Contacto
                        </label>
                        <input
                          type="email"
                          name="contactEmail"
                          value={formData.contactEmail}
                          onChange={handleChange}
                          className="w-full border border-blue-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="contacto@empresa.com"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Gestión de dominios */}
                  <div className="bg-gradient-to-br from-blue-50 to-sky-100 p-6 rounded-xl border border-blue-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-blue-900">🌐 Dominios</h3>
                      <button
                        type="button"
                        onClick={addDomain}
                        className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                      >
                        ➕ Añadir dominio
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {formData.domains.map((domain, index) => (
                        <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-blue-200">
                          <div className="text-blue-600">🌐</div>
                          <input
                            type="text"
                            value={domain}
                            onChange={(e) => handleDomainChange(e, index)}
                            className="flex-1 border border-blue-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="ejemplo.com"
                          />
                          <button
                            type="button"
                            onClick={() => removeDomain(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Eliminar dominio"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      
                      {formData.domains.length === 0 && (
                        <div className="text-center py-8 bg-white rounded-lg border border-blue-200">
                          <div className="text-4xl mb-2">🌐</div>
                          <p className="text-blue-700 font-medium">No hay dominios configurados</p>
                          <p className="text-blue-600 text-sm">Añade dominios para comenzar</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Información Fiscal */}
                  <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🏛️ Información Fiscal</h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            🆔 CIF/NIF
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.cif"
                            value={formData.fiscalInfo.cif}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                            placeholder="B12345678"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            🏢 Razón Social
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.razonSocial"
                            value={formData.fiscalInfo.razonSocial}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                            placeholder="Empresa, S.L."
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">
                          📍 Dirección Completa
                        </label>
                        <input
                          type="text"
                          name="fiscalInfo.direccion"
                          value={formData.fiscalInfo.direccion}
                          onChange={handleChange}
                          className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                          placeholder="Calle, número, piso, etc."
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            📮 Código Postal
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.codigoPostal"
                            value={formData.fiscalInfo.codigoPostal}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                            placeholder="28001"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            🏙️ Población
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.poblacion"
                            value={formData.fiscalInfo.poblacion}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                            placeholder="Madrid"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            🗺️ Provincia
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.provincia"
                            value={formData.fiscalInfo.provincia}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                            placeholder="Madrid"
                          />
                        </div>
                      </div>
                      
                      <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-800 mb-2">
                          🌍 País
                        </label>
                        <input
                          type="text"
                          name="fiscalInfo.pais"
                          value={formData.fiscalInfo.pais}
                          onChange={handleChange}
                          className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                          placeholder="España"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      💡 Los cambios se guardarán inmediatamente
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                      >
                        ❌ Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md"
                      >
                        ✅ Guardar Cambios
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Encabezado del cliente */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                          {currentClient.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-blue-900">{currentClient.name}</h3>
                          <p className="text-blue-700 flex items-center">
                            📧 {currentClient.contactEmail}
                          </p>
                          <p className="text-sm text-blue-600 mt-1">
                            Cliente desde {new Date(currentClient.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full ${
                          currentClient.status === 'active' ? 'bg-green-100 text-blue-800' :
                          currentClient.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {currentClient.status === 'active' ? '✅ Activo' :
                           currentClient.status === 'inactive' ? '⏸️ Inactivo' :
                           '🚫 Suspendido'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Información de renovación pendiente */}
                  {currentClient.hasPendingRenewal && currentClient.pendingRenewalInfo && (
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200 shadow-sm">
                      <div className="flex items-start">
                        <div className="text-3xl mr-4">⚠️</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                            🔄 Solicitud de Renovación Pendiente
                          </h3>
                          <div className="bg-white p-4 rounded-lg border border-yellow-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-yellow-800">📋 Tipo:</span>
                                <p className="text-yellow-700">{
                                  currentClient.pendingRenewalInfo.requestType === 'renewal' ? 'Renovación' :
                                  currentClient.pendingRenewalInfo.requestType === 'reactivation' ? 'Reactivación' :
                                  currentClient.pendingRenewalInfo.requestType === 'support' ? 'Soporte' : 'Actualización'
                                }</p>
                              </div>
                              <div>
                                <span className="font-medium text-yellow-800">🚨 Urgencia:</span>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                                  currentClient.pendingRenewalInfo.urgency === 'high' ? 'bg-red-100 text-red-800' :
                                  currentClient.pendingRenewalInfo.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-blue-800'
                                }`}>
                                  {currentClient.pendingRenewalInfo.urgency === 'high' ? 'Alta' :
                                   currentClient.pendingRenewalInfo.urgency === 'medium' ? 'Media' : 'Baja'}
                                </span>
                              </div>
                            </div>
                            {currentClient.pendingRenewalInfo.message && (
                              <div className="mt-4">
                                <span className="font-medium text-yellow-800 block mb-2">💬 Mensaje:</span>
                                <p className="text-yellow-700 bg-yellow-50 p-3 rounded border text-sm">
                                  {currentClient.pendingRenewalInfo.message}
                                </p>
                              </div>
                            )}
                            <div className="mt-4 text-xs text-yellow-600 text-right">
                              📅 Solicitado el {new Date(currentClient.pendingRenewalInfo.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Grid de información organizada */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Información Fiscal */}
                    <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">🏛️ Información Fiscal</h4>
                      {currentClient.fiscalInfo && Object.values(currentClient.fiscalInfo).some(value => value && value.trim() !== '') ? (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="space-y-3 text-sm">
                            {currentClient.fiscalInfo.cif && (
                              <div className="flex justify-between">
                                <span className="font-medium text-gray-700">🆔 CIF/NIF:</span>
                                <span className="text-gray-800 font-semibold">{currentClient.fiscalInfo.cif}</span>
                              </div>
                            )}
                            {currentClient.fiscalInfo.razonSocial && (
                              <div className="flex justify-between">
                                <span className="font-medium text-gray-700">🏢 Razón Social:</span>
                                <span className="text-gray-800">{currentClient.fiscalInfo.razonSocial}</span>
                              </div>
                            )}
                            {currentClient.fiscalInfo.direccion && (
                              <div>
                                <span className="font-medium text-gray-700 block mb-1">📍 Dirección:</span>
                                <p className="text-gray-800 text-xs bg-gray-50 p-2 rounded border">
                                  {currentClient.fiscalInfo.direccion}
                                  {currentClient.fiscalInfo.codigoPostal && `, ${currentClient.fiscalInfo.codigoPostal}`}
                                  {currentClient.fiscalInfo.poblacion && ` ${currentClient.fiscalInfo.poblacion}`}
                                  {currentClient.fiscalInfo.provincia && `, ${currentClient.fiscalInfo.provincia}`}
                                  {currentClient.fiscalInfo.pais && ` (${currentClient.fiscalInfo.pais})`}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                          <div className="text-gray-600 mb-2">📋</div>
                          <p className="text-sm text-gray-700 italic">No hay información fiscal registrada</p>
                        </div>
                      )}
                    </div>

                    {/* Plan de Suscripción */}
                    <div className="bg-gradient-to-br from-blue-50 to-sky-100 p-6 rounded-xl border border-blue-200">
                      <h4 className="text-lg font-semibold text-blue-900 mb-4">💳 Plan de Suscripción</h4>
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-lg font-semibold text-blue-800">
                            {typeof currentClient.subscription?.plan === 'object'
                              ? currentClient.subscription.plan.name
                              : (currentClient.subscription?.plan || 'Básico').toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            currentClient.subscription?.isUnlimited 
                              ? 'bg-green-100 text-blue-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {currentClient.subscription?.isUnlimited 
                              ? '∞ Ilimitado' 
                              : `📅 Vence: ${new Date(currentClient.subscription?.endDate).toLocaleDateString()}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-700 font-medium">👥 Usuarios:</span>
                          <span className="text-blue-800 font-semibold">
                            {currentClient.subscription?.currentUsers || 1} / 
                            {currentClient.subscription?.isUnlimited 
                              ? '∞' 
                              : currentClient.subscription?.maxUsers || 5}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dominios */}
                  <div className="bg-gradient-to-br from-blue-50 to-sky-100 p-6 rounded-xl border border-blue-200">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4">🌐 Dominios Configurados</h4>
                    {currentClient.domains && currentClient.domains.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {currentClient.domains.map((domain, index) => (
                          <div key={index} className="bg-white p-3 rounded-lg border border-blue-200 flex items-center">
                            <div className="text-blue-600 mr-3">🌐</div>
                            <span className="text-blue-800 font-medium">{domain}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-lg border border-blue-200 text-center">
                        <div className="text-4xl mb-2">🌐</div>
                        <p className="text-blue-700 font-medium">No hay dominios configurados</p>
                        <p className="text-blue-600 text-sm">Configure dominios para comenzar a usar Cookie21</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      {currentClient.status === 'active' ? (
                        <button
                          onClick={() => onToggleStatus(currentClient._id, 'inactive')}
                          className="px-3 py-1 border border-yellow-300 text-yellow-600 rounded hover:bg-yellow-50"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleStatus(currentClient._id, 'active')}
                          className="px-3 py-1 border border-blue-300 text-blue-600 rounded hover:bg-green-50"
                        >
                          Activar
                        </button>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">💳 Configuración de Suscripción</h3>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">💡</span>
                  <p className="text-blue-800 font-medium">Gestión de suscripciones</p>
                </div>
                <p className="text-sm text-blue-700">
                  Puedes asignar un plan de suscripción predefinido o modificar manualmente los parámetros
                  de la suscripción actual del cliente.
                </p>
              </div>
                
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan actual */}
                <div className="bg-gradient-to-br from-blue-50 to-sky-100 p-6 rounded-xl border border-blue-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <h4 className="text-lg font-semibold text-blue-900">📋 Plan Actual</h4>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-700">📦 Plan:</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white">
                          {typeof currentClient.subscription?.plan === 'object' 
                            ? currentClient.subscription.plan.name 
                            : currentClient.subscription?.plan || 'Básico'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-700">🔄 Estado:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          currentClient.subscription?.isUnlimited 
                            ? 'bg-cyan-100 text-cyan-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {currentClient.subscription?.isUnlimited ? '∞ Ilimitado' : '📅 Limitado'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-700">👥 Usuarios máximos:</span>
                        <span className="text-blue-800 font-semibold">
                          {currentClient.subscription?.isUnlimited ? '∞ Sin límite' : (currentClient.subscription?.maxUsers || 5)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-700">📅 Fecha inicio:</span>
                        <span className="text-blue-800">
                          {currentClient.subscription?.startDate ? new Date(currentClient.subscription.startDate).toLocaleDateString('es-ES') : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-700">⏰ Fecha fin:</span>
                        <span className="text-blue-800">
                          {currentClient.subscription?.isUnlimited 
                            ? '∞ Sin vencimiento' 
                            : (currentClient.subscription?.endDate ? new Date(currentClient.subscription.endDate).toLocaleDateString('es-ES') : 'N/A')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Asignar plan */}
                <div className="bg-gradient-to-br from-cyan-50 to-sky-100 p-6 rounded-xl border border-cyan-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <h4 className="text-lg font-semibold text-cyan-900">🎯 Asignar Nuevo Plan</h4>
                  </div>
                    
                  {isLoadingPlans ? (
                    <div className="flex justify-center items-center h-40 bg-white rounded-lg border border-cyan-200">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-200 border-t-purple-600 mx-auto mb-2"></div>
                        <p className="text-cyan-600 text-sm">Cargando planes...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-lg border border-cyan-200">
                      <form onSubmit={handleAssignPlan} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-cyan-700 mb-2">
                            📦 Plan de suscripción
                          </label>
                          <select
                            value={selectedPlanId}
                            onChange={(e) => handlePlanSelect(e.target.value)}
                            className="w-full border border-cyan-300 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
                            required
                          >
                            <option value="">Seleccionar plan</option>
                            {availablePlans.map(plan => (
                              <option key={plan._id} value={plan._id}>
                                {plan.name} {plan.pricing?.enabled && plan.pricing?.amount > 0 
                                  ? `(${plan.pricing.amount} ${plan.pricing.currency})` 
                                  : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {selectedPlan && (
                          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                            <div className="flex items-center mb-2">
                              <span className="text-lg mr-2">ℹ️</span>
                              <span className="font-medium text-cyan-800">Información del plan</span>
                            </div>
                            <p className="text-sm text-cyan-700">
                              <span className="font-medium">👥 Usuarios máximos: </span>
                              {selectedPlan.limits?.isUnlimitedUsers 
                                ? '∞ Sin límite' 
                                : selectedPlan.limits?.maxUsers || 5}
                            </p>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <div className="flex items-center p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                            <input
                              type="checkbox"
                              name="isUnlimited"
                              id="isUnlimited"
                              checked={subscriptionData.isUnlimited}
                              onChange={handleSubscriptionChange}
                              className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-cyan-300 rounded mr-3"
                            />
                            <label htmlFor="isUnlimited" className="text-sm font-medium text-cyan-700">
                              ∞ Suscripción ilimitada
                            </label>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cyan-700 mb-2">
                                📅 Fecha de inicio
                              </label>
                              <input
                                type="date"
                                name="startDate"
                                value={subscriptionData.startDate}
                                onChange={handleSubscriptionChange}
                                className="w-full border border-cyan-300 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cyan-700 mb-2">
                                ⏰ Fecha de fin
                              </label>
                              <input
                                type="date"
                                name="endDate"
                                value={subscriptionData.endDate || ''}
                                onChange={handleSubscriptionChange}
                                disabled={subscriptionData.isUnlimited}
                                className={`w-full border border-cyan-300 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${
                                  subscriptionData.isUnlimited ? 'bg-cyan-100 text-purple-500' : ''
                                }`}
                              />
                            </div>
                          </div>
                          
                          {!subscriptionData.isUnlimited && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center">
                                <span className="text-lg mr-2">💡</span>
                                <span className="text-xs text-blue-700">
                                  La fecha de inicio y fin pueden ser el mismo día para suscripciones de un día.
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-sky-700 text-white rounded-lg hover:from-cyan-700 hover:to-sky-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isSubmittingPlan || !selectedPlanId}
                            >
                              {isSubmittingPlan ? '⏳ Asignando...' : '🎯 Asignar Plan'}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                  </div>
                </div>
              
              {/* Modificar manualmente */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">⚙️ Modificar Suscripción Actual</h4>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <form onSubmit={handleUpdateSubscription} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            name="isUnlimited"
                            id="manualIsUnlimited"
                            checked={subscriptionData.isUnlimited}
                            onChange={handleSubscriptionChange}
                            className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded mr-3"
                          />
                          <label htmlFor="manualIsUnlimited" className="text-sm font-medium text-gray-700">
                            ∞ Suscripción ilimitada
                          </label>
                        </div>
                        
                        {/* Nota informativa sobre los usuarios máximos */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-start">
                            <span className="text-lg mr-2">ℹ️</span>
                            <div>
                              <p className="text-sm font-medium text-blue-800 mb-1">Límite de usuarios</p>
                              <p className="text-xs text-blue-700">
                                El máximo de usuarios se determina según el plan asignado al cliente.
                                Para modificar este límite, cambie el plan de suscripción.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              📅 Fecha de inicio
                            </label>
                            <input
                              type="date"
                              name="startDate"
                              value={subscriptionData.startDate}
                              onChange={handleSubscriptionChange}
                              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ⏰ Fecha de fin
                            </label>
                            <input
                              type="date"
                              name="endDate"
                              value={subscriptionData.endDate || ''}
                              onChange={handleSubscriptionChange}
                              disabled={subscriptionData.isUnlimited}
                              className={`w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 ${
                                subscriptionData.isUnlimited ? 'bg-gray-100 text-gray-500' : ''
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {!subscriptionData.isUnlimited && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">💡</span>
                          <span className="text-xs text-blue-700">
                            La fecha de inicio y fin pueden ser el mismo día para suscripciones de un día.
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-700 text-white rounded-lg hover:from-gray-700 hover:to-slate-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmittingPlan}
                      >
                        {isSubmittingPlan ? '⏳ Actualizando...' : '🔄 Actualizar Suscripción'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              
              {/* Estado y Control de Suscripción - Solo para owners */}
              {user?.role === 'owner' && currentClient.subscription && (
                <div className={`bg-gradient-to-br p-6 rounded-xl border shadow-sm transition-all duration-300 ease-in-out ${
                  subscriptionStatus.isActive 
                    ? 'from-red-50 to-red-100 border-red-200' 
                    : 'from-yellow-50 to-yellow-100 border-yellow-200'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3">
                          {subscriptionStatus.isActive ? '⚠️' : '🔄'}
                        </span>
                        <h4 className={`text-lg font-semibold ${
                          subscriptionStatus.isActive ? 'text-red-800' : 'text-yellow-800'
                        }`}>
                          {subscriptionStatus.isActive ? 'Zona de Peligro' : 'Estado de Suscripción'}
                        </h4>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border border-opacity-30">
                        <p className={`text-sm mb-2 ${
                          subscriptionStatus.isActive ? 'text-red-700' : 'text-yellow-700'
                        }`}>
                          <strong>Estado actual:</strong> {subscriptionStatus.message}
                        </p>
                        {currentClient.subscription.endDate && (
                          <p className={`text-xs ${
                            subscriptionStatus.isActive ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            <strong>Vence:</strong> {new Date(currentClient.subscription.endDate).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out ${
                      subscriptionStatus.isActive 
                        ? 'bg-green-100 text-blue-800 border border-blue-200' 
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {subscriptionStatus.isActive ? '✅ Activa' : '❌ Inactiva'}
                    </div>
                  </div>
                  
                  {/* Indicador de procesamiento */}
                  {(isCancellingSubscription || isReactivatingSubscription) && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center text-blue-700">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-600 mr-3"></div>
                        <span className="font-medium">
                          {isCancellingSubscription ? 'Cancelando suscripción...' : 'Reactivando suscripción...'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {subscriptionStatus.isActive ? (
                    <div className="space-y-4">
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="flex items-start">
                          <span className="text-lg mr-2">⚠️</span>
                          <p className="text-sm text-red-700">
                            Cancelar la suscripción impedirá que el cliente acceda a las funcionalidades del sistema.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isCancellingSubscription || isReactivatingSubscription}
                      >
                        🚫 Cancelar Suscripción
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-start">
                          <span className="text-lg mr-2">📋</span>
                          <p className="text-sm text-yellow-700">
                            La suscripción está inactiva. {subscriptionStatus.reason === 'CANCELLED' ? 'Fue cancelada.' : subscriptionStatus.reason === 'EXPIRED' ? 'Ha expirado.' : 'Asigna un plan activo.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleActivateSubscription}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-700 text-white rounded-lg hover:from-blue-700 hover:to-sky-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-200"
                        disabled={isReactivatingSubscription || isCancellingSubscription}
                      >
                        {isReactivatingSubscription ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            ⏳ Reactivando...
                          </>
                        ) : (
                          '✅ Activar Suscripción (30 días)'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">📊 Métricas del Cliente</h3>
                <button
                  onClick={fetchClientMetrics}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors duration-200"
                  disabled={isLoadingMetrics}
                >
                  {isLoadingMetrics ? '🔄' : '🔄'} Actualizar
                </button>
              </div>
              
              {isLoadingMetrics ? (
                <div className="flex justify-center items-center h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                    <p className="text-blue-600 font-medium">Cargando métricas...</p>
                  </div>
                </div>
              ) : metrics ? (
                <div className="space-y-6">
                  {/* Resumen general */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Usuarios */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-blue-900">👥 Usuarios</h4>
                        <div className="text-2xl font-bold text-blue-600">{metrics?.users?.total || 0}</div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Activos:</span>
                          <span className="font-semibold text-blue-600">{metrics?.users?.active || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Límite:</span>
                          <span className="font-semibold text-blue-800">
                            {metrics?.subscription?.isUnlimited ? '∞' : (metrics?.users?.limit || 0)}
                          </span>
                        </div>
                        
                        {/* Barra de progreso solo si no es ilimitado */}
                        {!metrics?.subscription?.isUnlimited && (metrics?.users?.limit || 0) > 0 && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-blue-700 mb-1">
                              <span>Uso actual</span>
                              <span>{Math.round(((metrics?.users?.total || 0) / (metrics?.users?.limit || 1)) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  (metrics?.users?.total || 0) / (metrics?.users?.limit || 1) > 0.8 
                                    ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, ((metrics?.users?.total || 0) / (metrics?.users?.limit || 1)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-center mt-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            metrics?.users?.canAddMore 
                              ? 'bg-green-100 text-blue-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {metrics?.users?.canAddMore ? '✅ Puede agregar más' : '❌ Límite alcanzado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dominios */}
                    <div className="bg-gradient-to-br from-blue-50 to-sky-100 p-6 rounded-xl border border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-blue-900">🌐 Dominios</h4>
                        <div className="text-2xl font-bold text-blue-600">{metrics?.domains?.total || 0}</div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Activos:</span>
                          <span className="font-semibold text-blue-600">{metrics?.domains?.active || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-center mt-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-blue-800">
                            ✅ Sin límite
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Banners */}
                    <div className="bg-gradient-to-br from-cyan-50 to-sky-100 p-6 rounded-xl border border-cyan-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-cyan-900">🎨 Banners</h4>
                        <div className="text-2xl font-bold text-cyan-600">{metrics?.banners?.total || 0}</div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-cyan-700">Activos:</span>
                          <span className="font-semibold text-cyan-600">{metrics?.banners?.active || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-center mt-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                            ✅ Sin límite
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Información detallada */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Resumen del Plan */}
                    <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">📋 Resumen del Plan</h4>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-gray-700">Plan activo:</span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-600 text-white">
                            {(metrics?.subscription?.plan || 'N/A').toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tipo de suscripción:</span>
                            <span className="font-medium text-gray-800">
                              {metrics?.subscription?.isUnlimited ? '∞ Ilimitada' : '📅 Con vencimiento'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-600">Estado:</span>
                            <span className={`font-medium ${
                              metrics?.subscription?.status === 'active' ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {metrics?.subscription?.status === 'active' ? '✅ Activo' : '❌ Inactivo'}
                            </span>
                          </div>
                          
                          <div className="mt-3 p-2 bg-gray-50 rounded text-center">
                            <span className="text-xs text-gray-600">
                              💡 Para gestionar suscripciones ir a la pestaña "Suscripción"
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-xl border border-red-200 shadow-sm text-center">
                  <div className="text-4xl mb-4">⚠️</div>
                  <h4 className="text-lg font-semibold text-red-900 mb-2">Error al cargar métricas</h4>
                  <p className="text-red-700 mb-4">No se pudieron obtener las métricas para este cliente.</p>
                  <button
                    onClick={fetchClientMetrics}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    🔄 Intentar de nuevo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de cancelación de suscripción */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        client={currentClient}
        onConfirm={handleCancelSubscription}
        isLoading={isCancellingSubscription}
      />
    </div>
  );
};

export default ClientDetailsModal;