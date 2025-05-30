import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateClient, updateSubscription, getClientMetrics } from '../../api/client';
import { getSubscriptionPlans, assignPlanToClient } from '../../api/subscription';
import { createDomain } from '../../api/domain';

const ClientDetailsModal = ({ client, onClose, onToggleStatus, onUpdateClient }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: client.name || '',
    contactEmail: client.contactEmail || '',
    domains: client.domains || [],
    fiscalInfo: {
      cif: client.fiscalInfo?.cif || '',
      razonSocial: client.fiscalInfo?.razonSocial || '',
      direccion: client.fiscalInfo?.direccion || '',
      codigoPostal: client.fiscalInfo?.codigoPostal || '',
      poblacion: client.fiscalInfo?.poblacion || '',
      provincia: client.fiscalInfo?.provincia || '',
      pais: client.fiscalInfo?.pais || 'España'
    }
  });
  const [metrics, setMetrics] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState({
    isUnlimited: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: null
  });
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  useEffect(() => {
    if (activeTab === 'metrics') {
      fetchClientMetrics();
    }
    if (activeTab === 'subscription') {
      fetchAvailablePlans();
      // Inicializar datos de suscripción basados en el cliente actual
      setSubscriptionData({
        isUnlimited: client.subscription?.isUnlimited || false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: client.subscription?.isUnlimited 
          ? null 
          : (client.subscription?.endDate ? new Date(client.subscription.endDate).toISOString().split('T')[0] : null)
      });
    }
    console.log(client.subscription)
  }, [activeTab, client]);

  const fetchClientMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const response = await getClientMetrics(client._id);
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
      const originalDomains = client.domains || [];
      const newDomains = cleanedDomains.filter(
        domain => !originalDomains.includes(domain)
      );
      
      // Preparar actualización del cliente
      const updates = {
        ...formData,
        domains: cleanedDomains
      };
      
      // Actualizar cliente
      await updateClient(client._id, updates);
      toast.success('Cliente actualizado correctamente');
      
      // Si hay dominios nuevos, crearlos en la tabla de dominios
      if (newDomains.length > 0) {
        // Crear cada dominio nuevo
        const domainCreationPromises = newDomains.map(async (domainName) => {
          try {
            // Configuración por defecto para nuevos dominios
            const domainData = {
              domain: domainName,
              clientId: client._id,
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
      onUpdateClient(client._id, updates);
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
    
    setIsSubmittingPlan(true);
    try {
      // Si se seleccionó asignar vía API de asignación
      const planData = {
        startDate: subscriptionData.startDate,
        endDate: subscriptionData.isUnlimited ? null : subscriptionData.endDate,
        isUnlimited: subscriptionData.isUnlimited
        // Ya no enviamos maxUsers porque lo controlará el plan seleccionado
      };
      
      await assignPlanToClient(selectedPlanId, client._id, planData);
      toast.success('Plan asignado correctamente');
      
      // Recargar métricas del cliente para reflejar los cambios
      fetchClientMetrics();
      setActiveTab('metrics');
    } catch (error) {
      toast.error(error.message || 'Error al asignar plan');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    
    setIsSubmittingPlan(true);
    try {
      const updates = {
        isUnlimited: subscriptionData.isUnlimited,
        startDate: subscriptionData.startDate,
        endDate: subscriptionData.isUnlimited ? null : subscriptionData.endDate
        // Ya no enviamos maxUsers porque lo controlará el plan
      };
      
      await updateSubscription(client._id, updates);
      toast.success('Suscripción actualizada correctamente');
      
      // Recargar métricas del cliente para reflejar los cambios
      fetchClientMetrics();
      setActiveTab('metrics');
    } catch (error) {
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
                        <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                        <p className="text-sm text-gray-500">{client.contactEmail}</p>
                      </div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        client.status === 'active' ? 'bg-green-100 text-green-800' :
                        client.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {client.status === 'active' ? 'Activo' :
                         client.status === 'inactive' ? 'Inactivo' :
                         'Suspendido'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Información Fiscal</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      {client.fiscalInfo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <p><span className="font-medium">CIF:</span> {client.fiscalInfo.cif || 'No especificado'}</p>
                            <p><span className="font-medium">Razón Social:</span> {client.fiscalInfo.razonSocial || 'No especificada'}</p>
                            <p><span className="font-medium">Dirección:</span> {client.fiscalInfo.direccion || 'No especificada'}</p>
                            <p><span className="font-medium">Código Postal:</span> {client.fiscalInfo.codigoPostal || 'No especificado'}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Población:</span> {client.fiscalInfo.poblacion || 'No especificada'}</p>
                            <p><span className="font-medium">Provincia:</span> {client.fiscalInfo.provincia || 'No especificada'}</p>
                            <p><span className="font-medium">País:</span> {client.fiscalInfo.pais || 'España'}</p>
                          </div>
                        </div>
                      )}
                      {!client.fiscalInfo && (
                        <p className="text-sm text-gray-500 italic">No hay información fiscal registrada</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Dominios</h4>
                    {client.domains && client.domains.length > 0 ? (
                      <ul className="space-y-1">
                        {client.domains.map((domain, index) => (
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
                        {typeof client.subscription?.plan === 'object'
                          ? client.subscription.plan.name
                          : client.subscription?.plan || 'Básico'}
                      </span>
                        <span className="text-sm text-gray-500">
                          {client.subscription?.isUnlimited 
                            ? 'Ilimitado' 
                            : `Vence: ${new Date(client.subscription?.endDate).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Usuarios:</span>
                          <span>
                            {client.subscription?.currentUsers || 1} / 
                            {client.subscription?.isUnlimited 
                              ? '∞' 
                              : client.subscription?.maxUsers || 5}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      {client.status === 'active' ? (
                        <button
                          onClick={() => onToggleStatus(client._id, 'inactive')}
                          className="px-3 py-1 border border-yellow-300 text-yellow-600 rounded hover:bg-yellow-50"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleStatus(client._id, 'active')}
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
                      {typeof client.subscription?.plan === 'object' 
                        ? client.subscription.plan.name 
                        : client.subscription?.plan || 'Básico'}
                      </p>
                      <p>
                        <span className="font-medium">Estado: </span>
                        {client.subscription?.isUnlimited ? 'Ilimitado' : 'Limitado'}
                      </p>
                      <p>
                        <span className="font-medium">Usuarios máximos: </span>
                        {client.subscription?.isUnlimited ? 'Sin límite' : (client.subscription?.maxUsers || 5)}
                      </p>
                      <p>
                        <span className="font-medium">Fecha inicio: </span>
                        {client.subscription?.startDate ? new Date(client.subscription.startDate).toLocaleDateString() : 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Fecha fin: </span>
                        {client.subscription?.isUnlimited 
                          ? 'Sin vencimiento' 
                          : (client.subscription?.endDate ? new Date(client.subscription.endDate).toLocaleDateString() : 'N/A')}
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
    </div>
  );
};

export default ClientDetailsModal;