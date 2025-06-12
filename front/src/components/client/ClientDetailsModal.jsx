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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center">
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
            <div>
              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full border border-gray-300 p-2 rounded"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email de contacto
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      className="w-full border border-gray-300 p-2 rounded"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Dominios
                      </label>
                      <button
                        type="button"
                        onClick={addDomain}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Añadir dominio
                      </button>
                    </div>
                    {formData.domains.map((domain, index) => (
                      <div key={index} className="flex mb-2">
                        <input
                          type="text"
                          value={domain}
                          onChange={(e) => handleDomainChange(e, index)}
                          className="flex-grow border border-gray-300 p-2 rounded-l"
                          placeholder="ejemplo.com"
                        />
                        <button
                          type="button"
                          onClick={() => removeDomain(index)}
                          className="bg-red-50 text-red-500 px-3 rounded-r border border-l-0 border-red-200 hover:bg-red-100"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {formData.domains.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No hay dominios configurados</p>
                    )}
                  </div>
                  
                  {/* Sección de Información Fiscal */}
                  <div className="mb-6">
                    <h3 className="text-md font-medium text-gray-700 mb-2">Información Fiscal</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CIF
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.cif"
                            value={formData.fiscalInfo.cif}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-2 rounded"
                            placeholder="B12345678"
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Razón Social
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.razonSocial"
                            value={formData.fiscalInfo.razonSocial}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-2 rounded"
                            placeholder="Empresa, S.L."
                          />
                        </div>
                        
                        <div className="mb-4 md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dirección
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.direccion"
                            value={formData.fiscalInfo.direccion}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-2 rounded"
                            placeholder="Calle, número, piso, etc."
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Código Postal
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.codigoPostal"
                            value={formData.fiscalInfo.codigoPostal}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-2 rounded"
                            placeholder="28001"
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Población
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.poblacion"
                            value={formData.fiscalInfo.poblacion}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-2 rounded"
                            placeholder="Madrid"
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Provincia
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.provincia"
                            value={formData.fiscalInfo.provincia}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-2 rounded"
                            placeholder="Madrid"
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            País
                          </label>
                          <input
                            type="text"
                            name="fiscalInfo.pais"
                            value={formData.fiscalInfo.pais}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-2 rounded"
                            placeholder="España"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="mb-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{currentClient.name}</h3>
                        <p className="text-sm text-gray-500">{currentClient.contactEmail}</p>
                      </div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        currentClient.status === 'active' ? 'bg-green-100 text-green-800' :
                        currentClient.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {currentClient.status === 'active' ? 'Activo' :
                         currentClient.status === 'inactive' ? 'Inactivo' :
                         'Suspendido'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Información de renovación pendiente */}
                  {currentClient.hasPendingRenewal && currentClient.pendingRenewalInfo && (
                    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <svg className="flex-shrink-0 h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Solicitud de Renovación Pendiente
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              <span className="font-medium">Tipo:</span> {
                                currentClient.pendingRenewalInfo.requestType === 'renewal' ? 'Renovación' :
                                currentClient.pendingRenewalInfo.requestType === 'reactivation' ? 'Reactivación' :
                                currentClient.pendingRenewalInfo.requestType === 'support' ? 'Soporte' : 'Actualización'
                              }
                            </p>
                            <p>
                              <span className="font-medium">Urgencia:</span> {
                                currentClient.pendingRenewalInfo.urgency === 'high' ? 'Alta' :
                                currentClient.pendingRenewalInfo.urgency === 'medium' ? 'Media' : 'Baja'
                              }
                            </p>
                            <p>
                              <span className="font-medium">Estado:</span> {
                                currentClient.pendingRenewalInfo.status === 'pending' ? 'Pendiente' : 'En proceso'
                              }
                            </p>
                            {currentClient.pendingRenewalInfo.requestedBy && (
                              <p>
                                <span className="font-medium">Solicitado por:</span> {currentClient.pendingRenewalInfo.requestedBy.name} ({currentClient.pendingRenewalInfo.requestedBy.email})
                              </p>
                            )}
                            {currentClient.pendingRenewalInfo.message && (
                              <div className="mt-2">
                                <span className="font-medium">Mensaje:</span>
                                <p className="mt-1 text-yellow-600 bg-yellow-100 p-2 rounded">
                                  {currentClient.pendingRenewalInfo.message}
                                </p>
                              </div>
                            )}
                            <p className="mt-2 text-xs text-yellow-600">
                              Solicitado el {new Date(currentClient.pendingRenewalInfo.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Información Fiscal</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      {currentClient.fiscalInfo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <p><span className="font-medium">CIF:</span> {currentClient.fiscalInfo.cif || 'No especificado'}</p>
                            <p><span className="font-medium">Razón Social:</span> {currentClient.fiscalInfo.razonSocial || 'No especificada'}</p>
                            <p><span className="font-medium">Dirección:</span> {currentClient.fiscalInfo.direccion || 'No especificada'}</p>
                            <p><span className="font-medium">Código Postal:</span> {currentClient.fiscalInfo.codigoPostal || 'No especificado'}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Población:</span> {currentClient.fiscalInfo.poblacion || 'No especificada'}</p>
                            <p><span className="font-medium">Provincia:</span> {currentClient.fiscalInfo.provincia || 'No especificada'}</p>
                            <p><span className="font-medium">País:</span> {currentClient.fiscalInfo.pais || 'España'}</p>
                          </div>
                        </div>
                      )}
                      {!currentClient.fiscalInfo && (
                        <p className="text-sm text-gray-500 italic">No hay información fiscal registrada</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Dominios</h4>
                    {currentClient.domains && currentClient.domains.length > 0 ? (
                      <ul className="space-y-1">
                        {currentClient.domains.map((domain, index) => (
                          <li key={index} className="text-sm bg-gray-50 p-2 rounded">
                            {domain}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No hay dominios configurados</p>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Plan de Suscripción</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {typeof currentClient.subscription?.plan === 'object'
                          ? currentClient.subscription.plan.name
                          : currentClient.subscription?.plan || 'Básico'}
                      </span>
                        <span className="text-sm text-gray-500">
                          {currentClient.subscription?.isUnlimited 
                            ? 'Ilimitado' 
                            : `Vence: ${new Date(currentClient.subscription?.endDate).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Usuarios:</span>
                          <span>
                            {currentClient.subscription?.currentUsers || 1} / 
                            {currentClient.subscription?.isUnlimited 
                              ? '∞' 
                              : currentClient.subscription?.maxUsers || 5}
                          </span>
                        </div>
                      </div>
                    </div>
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
                          className="px-3 py-1 border border-green-300 text-green-600 rounded hover:bg-green-50"
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
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Configuración de Suscripción</h3>
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-700 mb-4">
                  <p>
                    Puedes asignar un plan de suscripción predefinido o modificar manualmente los parámetros
                    de la suscripción actual del cliente.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Plan actual */}
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium mb-2">Plan Actual</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                      <span className="font-medium">Plan: </span>
                      {typeof currentClient.subscription?.plan === 'object' 
                        ? currentClient.subscription.plan.name 
                        : currentClient.subscription?.plan || 'Básico'}
                      </p>
                      <p>
                        <span className="font-medium">Estado: </span>
                        {currentClient.subscription?.isUnlimited ? 'Ilimitado' : 'Limitado'}
                      </p>
                      <p>
                        <span className="font-medium">Usuarios máximos: </span>
                        {currentClient.subscription?.isUnlimited ? 'Sin límite' : (currentClient.subscription?.maxUsers || 5)}
                      </p>
                      <p>
                        <span className="font-medium">Fecha inicio: </span>
                        {currentClient.subscription?.startDate ? new Date(currentClient.subscription.startDate).toLocaleDateString() : 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Fecha fin: </span>
                        {currentClient.subscription?.isUnlimited 
                          ? 'Sin vencimiento' 
                          : (currentClient.subscription?.endDate ? new Date(currentClient.subscription.endDate).toLocaleDateString() : 'N/A')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Asignar plan */}
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium mb-2">Asignar Nuevo Plan</h4>
                    
                    {isLoadingPlans ? (
                      <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <form onSubmit={handleAssignPlan}>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Plan de suscripción
                          </label>
                          <select
                            value={selectedPlanId}
                            onChange={(e) => handlePlanSelect(e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded"
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
                          <div className="mb-4 bg-gray-50 p-3 rounded">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Usuarios máximos: </span>
                              {selectedPlan.limits?.isUnlimitedUsers 
                                ? 'Sin límite' 
                                : selectedPlan.limits?.maxUsers || 5}
                            </p>
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <div className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              name="isUnlimited"
                              id="isUnlimited"
                              checked={subscriptionData.isUnlimited}
                              onChange={handleSubscriptionChange}
                              className="mr-2"
                            />
                            <label htmlFor="isUnlimited" className="text-sm font-medium text-gray-700">
                              Suscripción ilimitada
                            </label>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha de inicio
                            </label>
                            <input
                              type="date"
                              name="startDate"
                              value={subscriptionData.startDate}
                              onChange={handleSubscriptionChange}
                              className="w-full border border-gray-300 p-2 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha de fin
                            </label>
                            <input
                              type="date"
                              name="endDate"
                              value={subscriptionData.endDate || ''}
                              onChange={handleSubscriptionChange}
                              disabled={subscriptionData.isUnlimited}
                              className={`w-full border border-gray-300 p-2 rounded ${subscriptionData.isUnlimited ? 'bg-gray-100' : ''}`}
                            />
                          </div>
                        </div>
                        
                        {!subscriptionData.isUnlimited && (
                          <div className="text-xs text-gray-500 mb-3">
                            💡 La fecha de inicio y fin pueden ser el mismo día para suscripciones de un día.
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            disabled={isSubmittingPlan || !selectedPlanId}
                          >
                            {isSubmittingPlan ? 'Asignando...' : 'Asignar Plan'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
                
                {/* Modificar manualmente */}
                <div className="mt-6 bg-white p-4 rounded border">
                  <h4 className="font-medium mb-2">Modificar Suscripción Actual</h4>
                  <form onSubmit={handleUpdateSubscription}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            name="isUnlimited"
                            id="manualIsUnlimited"
                            checked={subscriptionData.isUnlimited}
                            onChange={handleSubscriptionChange}
                            className="mr-2"
                          />
                          <label htmlFor="manualIsUnlimited" className="text-sm font-medium text-gray-700">
                            Suscripción ilimitada
                          </label>
                        </div>
                        
                        {/* Nota informativa sobre los usuarios máximos */}
                        <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 mb-4">
                          El máximo de usuarios se determina según el plan asignado al cliente.
                          Para modificar este límite, cambie el plan de suscripción.
                        </div>
                      </div>
                      
                      <div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha de inicio
                            </label>
                            <input
                              type="date"
                              name="startDate"
                              value={subscriptionData.startDate}
                              onChange={handleSubscriptionChange}
                              className="w-full border border-gray-300 p-2 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha de fin
                            </label>
                            <input
                              type="date"
                              name="endDate"
                              value={subscriptionData.endDate || ''}
                              onChange={handleSubscriptionChange}
                              disabled={subscriptionData.isUnlimited}
                              className={`w-full border border-gray-300 p-2 rounded ${subscriptionData.isUnlimited ? 'bg-gray-100' : ''}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {!subscriptionData.isUnlimited && (
                      <div className="text-xs text-gray-500 mb-3">
                        💡 La fecha de inicio y fin pueden ser el mismo día para suscripciones de un día.
                      </div>
                    )}
                    
                    <div className="flex justify-end mt-4">
                      <button
                        type="submit"
                        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        disabled={isSubmittingPlan}
                      >
                        {isSubmittingPlan ? 'Actualizando...' : 'Actualizar Suscripción'}
                      </button>
                    </div>
                  </form>
                </div>
                
                {/* Estado y Control de Suscripción - Solo para owners */}
                {user?.role === 'owner' && currentClient.subscription && (
                    <div className={`mt-6 p-4 rounded border transition-all duration-300 ease-in-out ${
                      subscriptionStatus.isActive 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className={`font-medium mb-1 ${
                            subscriptionStatus.isActive ? 'text-red-800' : 'text-yellow-800'
                          }`}>
                            {subscriptionStatus.isActive ? 'Zona de Peligro' : 'Estado de Suscripción'}
                          </h4>
                          <p className={`text-sm mb-1 ${
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
                        <div className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ease-in-out ${
                          subscriptionStatus.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {subscriptionStatus.isActive ? '✓ Activa' : '✗ Inactiva'}
                        </div>
                      </div>
                      
                      {/* Indicador de procesamiento */}
                      {(isCancellingSubscription || isReactivatingSubscription) && (
                        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          {isCancellingSubscription ? 'Cancelando suscripción...' : 'Reactivando suscripción...'}
                        </div>
                      )}
                      
                      {subscriptionStatus.isActive ? (
                        <>
                          <p className="text-sm text-red-700 mb-3">
                            Cancelar la suscripción impedirá que el cliente acceda a las funcionalidades del sistema.
                          </p>
                          <button
                            onClick={() => setShowCancelModal(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-all duration-200"
                            disabled={isCancellingSubscription || isReactivatingSubscription}
                          >
                            Cancelar Suscripción
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-yellow-700 mb-3">
                            La suscripción está inactiva. {subscriptionStatus.reason === 'CANCELLED' ? 'Fue cancelada.' : subscriptionStatus.reason === 'EXPIRED' ? 'Ha expirado.' : 'Asigna un plan activo.'}
                          </p>
                          <button
                            onClick={handleActivateSubscription}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50 flex items-center transition-all duration-200"
                            disabled={isReactivatingSubscription || isCancellingSubscription}
                          >
                            {isReactivatingSubscription ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Reactivando...
                              </>
                            ) : (
                              'Activar Suscripción (30 días)'
                            )}
                          </button>
                        </>
                      )}
                    </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'metrics' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Métricas del Cliente</h3>
              
              {isLoadingMetrics ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              ) : metrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium mb-3">Usuarios</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total:</span>
                        <span className="text-sm font-semibold">{metrics.users.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Activos:</span>
                        <span className="text-sm font-semibold">{metrics.users.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Límite:</span>
                        <span className="text-sm font-semibold">
                          {metrics.subscription.isUnlimited ? 'Ilimitado' : metrics.users.limit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Puede añadir más:</span>
                        <span className={`text-sm font-semibold ${metrics.users.canAddMore ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.users.canAddMore ? 'Sí' : 'No'}
                        </span>
                      </div>
                    </div>
                    
                    {!metrics.subscription.isUnlimited && metrics.users.total > 0 && (
                      <div className="mt-3">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              metrics.users.total / metrics.users.limit > 0.8 ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, (metrics.users.total / metrics.users.limit) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-right">
                          {Math.round((metrics.users.total / metrics.users.limit) * 100)}% utilizado
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium mb-3">Suscripción</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Plan:</span>
                        <span className="text-sm font-semibold">
                          {metrics.subscription.plan}
                          {metrics.subscription.planInfo && (
                            <span className="ml-1 text-xs text-blue-600">
                              ({metrics.subscription.planInfo.name})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Días restantes:</span>
                        <span className="text-sm font-semibold">
                          {metrics.subscription.daysRemaining}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Duración:</span>
                        <span className="text-sm font-semibold">
                          {metrics.subscription.isUnlimited ? 'Ilimitada' : 'Limitada'}
                        </span>
                      </div>
                    </div>
                    
                    <h5 className="font-medium text-sm mt-4 mb-2">Características</h5>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {metrics.subscription.features ? (
                        Object.entries(metrics.subscription.features).map(([key, value]) => (
                          <div key={key} className="flex items-center">
                            <span className={value ? "text-green-600" : "text-red-600"}>
                              {value ? (
                                <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                            <span className="text-sm">
                              {key === 'autoTranslate' && 'Traducción automática'}
                              {key === 'cookieScanning' && 'Escaneo de cookies'}
                              {key === 'customization' && 'Personalización'}
                              {key === 'advancedAnalytics' && 'Analytics avanzado'}
                              {key === 'multiLanguage' && 'Multilenguaje'}
                              {key === 'apiAccess' && 'Acceso a API'}
                              {key === 'prioritySupport' && 'Soporte prioritario'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-sm text-gray-500 italic">
                          No hay información de características
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium mb-3">Dominios</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total:</span>
                        <span className="text-sm font-semibold">{metrics.domains.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Puede añadir más:</span>
                        <span className={`text-sm font-semibold ${metrics.domains.canAddMore ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.domains.canAddMore ? 'Sí' : 'No'}
                        </span>
                      </div>
                    </div>
                    
                    {metrics.domains.list && metrics.domains.list.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium mb-1">Lista de dominios:</h5>
                        <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                          {metrics.domains.list.map((domain, index) => (
                            <li key={index} className="bg-gray-50 p-1 rounded">{domain}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Nueva sección para mostrar información fiscal en métricas */}
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-medium mb-3">Información Fiscal</h4>
                    <div className="space-y-2">
                      {metrics.fiscalInfo ? (
                        <div className="text-sm text-gray-600">
                          <p><span className="font-medium">CIF:</span> {metrics.fiscalInfo.cif || 'No especificado'}</p>
                          <p><span className="font-medium">Razón Social:</span> {metrics.fiscalInfo.razonSocial || 'No especificada'}</p>
                          <p><span className="font-medium">Dirección:</span> {metrics.fiscalInfo.direccion || 'No especificada'}</p>
                          <p><span className="font-medium">CP:</span> {metrics.fiscalInfo.codigoPostal || 'No especificado'}</p>
                          <p><span className="font-medium">Población:</span> {metrics.fiscalInfo.poblacion || 'No especificada'}</p>
                          <p><span className="font-medium">Provincia:</span> {metrics.fiscalInfo.provincia || 'No especificada'}</p>
                          <p><span className="font-medium">País:</span> {metrics.fiscalInfo.pais || 'España'}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No hay información fiscal registrada
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded text-yellow-700">
                  <p>No se pudo obtener métricas para este cliente.</p>
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