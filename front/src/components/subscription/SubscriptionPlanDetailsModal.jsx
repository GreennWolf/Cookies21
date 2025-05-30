import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateSubscriptionPlan, clonePlan } from '../../api/subscription';

const SubscriptionPlanDetailsModal = ({ plan, onClose, onUpdate, onClone }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    limits: {
      maxUsers: 5,
      isUnlimitedUsers: false,
      maxDomains: 1,
      isUnlimitedDomains: false
    },
    features: {
      autoTranslate: false,
      cookieScanning: true,
      customization: false,
      advancedAnalytics: false,
      multiLanguage: false,
      apiAccess: false,
      prioritySupport: false
    },
    pricing: {
      enabled: true,
      currency: 'USD',
      amount: 0,
      interval: 'monthly'
    },
    metadata: {
      color: '#3498db',
      isRecommended: false,
      displayOrder: 99
    }
  });
  const [cloneFormData, setCloneFormData] = useState({
    showCloneForm: false,
    newName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        limits: {
          maxUsers: plan.limits?.maxUsers || 5,
          isUnlimitedUsers: plan.limits?.isUnlimitedUsers || false,
          maxDomains: plan.limits?.maxDomains || 1,
          isUnlimitedDomains: plan.limits?.isUnlimitedDomains || false
        },
        features: {
          autoTranslate: plan.features?.autoTranslate || false,
          cookieScanning: plan.features?.cookieScanning || true,
          customization: plan.features?.customization || false,
          advancedAnalytics: plan.features?.advancedAnalytics || false,
          multiLanguage: plan.features?.multiLanguage || false,
          apiAccess: plan.features?.apiAccess || false,
          prioritySupport: plan.features?.prioritySupport || false
        },
        pricing: {
          enabled: plan.pricing?.enabled !== undefined ? plan.pricing.enabled : true,
          currency: plan.pricing?.currency || 'USD',
          amount: plan.pricing?.amount || 0,
          interval: plan.pricing?.interval || 'monthly'
        },
        metadata: {
          color: plan.metadata?.color || '#3498db',
          isRecommended: plan.metadata?.isRecommended || false,
          displayOrder: plan.metadata?.displayOrder || 99
        }
      });
    }
  }, [plan]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Manejo de campos anidados con notación de punto (ej: "limits.maxUsers")
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleCloneChange = (e) => {
    setCloneFormData({
      ...cloneFormData,
      newName: e.target.value
    });
  };

  const toggleCloneForm = () => {
    setCloneFormData({
      showCloneForm: !cloneFormData.showCloneForm,
      newName: cloneFormData.showCloneForm ? '' : `${plan.name} (copia)`
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await updateSubscriptionPlan(plan._id, formData);
      toast.success('Plan de suscripción actualizado correctamente');
      onUpdate(response.data.plan);
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || 'Error al actualizar el plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloneSubmit = async (e) => {
    e.preventDefault();
    if (!cloneFormData.newName.trim()) {
      toast.error('Debes proporcionar un nombre para el nuevo plan');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await clonePlan(plan._id, cloneFormData.newName);
      toast.success('Plan clonado correctamente');
      onClone(response.data.plan);
      toggleCloneForm();
    } catch (error) {
      toast.error(error.message || 'Error al clonar el plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Editar Plan' : 'Detalles del Plan'}
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
        
        <div className="p-4">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 p-2 rounded"
                  />
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="2"
                    className="w-full border border-gray-300 p-2 rounded"
                  />
                </div>
                
                <div className="md:col-span-1">
                  <h3 className="text-lg font-medium mb-2">Límites</h3>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Máximo de usuarios
                      </label>
                      <div className="ml-4">
                        <input
                          type="checkbox"
                          name="limits.isUnlimitedUsers"
                          checked={formData.limits.isUnlimitedUsers}
                          onChange={handleChange}
                          id="unlimited-users"
                          className="mr-1"
                        />
                        <label htmlFor="unlimited-users" className="text-sm">Ilimitado</label>
                      </div>
                    </div>
                    <input
                      type="number"
                      name="limits.maxUsers"
                      value={formData.limits.maxUsers}
                      onChange={handleChange}
                      disabled={formData.limits.isUnlimitedUsers}
                      min="1"
                      className="w-full border border-gray-300 p-2 rounded"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Máximo de dominios
                      </label>
                      <div className="ml-4">
                        <input
                          type="checkbox"
                          name="limits.isUnlimitedDomains"
                          checked={formData.limits.isUnlimitedDomains}
                          onChange={handleChange}
                          id="unlimited-domains"
                          className="mr-1"
                        />
                        <label htmlFor="unlimited-domains" className="text-sm">Ilimitado</label>
                      </div>
                    </div>
                    <input
                      type="number"
                      name="limits.maxDomains"
                      value={formData.limits.maxDomains}
                      onChange={handleChange}
                      disabled={formData.limits.isUnlimitedDomains}
                      min="1"
                      className="w-full border border-gray-300 p-2 rounded"
                    />
                  </div>
                  
                  <h3 className="text-lg font-medium mb-2 mt-6">Precios</h3>
                  
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        name="pricing.enabled"
                        checked={formData.pricing.enabled}
                        onChange={handleChange}
                        id="price-enabled"
                        className="mr-2"
                      />
                      <label htmlFor="price-enabled" className="text-sm font-medium text-gray-700">
                        Precio visible
                      </label>
                    </div>
                    
                    <div className={formData.pricing.enabled ? "" : "opacity-50"}>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monto
                          </label>
                          <input
                            type="number"
                            name="pricing.amount"
                            value={formData.pricing.amount}
                            onChange={handleChange}
                            disabled={!formData.pricing.enabled}
                            min="0"
                            step="0.01"
                            className="w-full border border-gray-300 p-2 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Moneda
                          </label>
                          <select
                            name="pricing.currency"
                            value={formData.pricing.currency}
                            onChange={handleChange}
                            disabled={!formData.pricing.enabled}
                            className="w-full border border-gray-300 p-2 rounded"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="MXN">MXN</option>
                          </select>
                        </div>
                      </div>
                      
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Intervalo
                      </label>
                      <select
                        name="pricing.interval"
                        value={formData.pricing.interval}
                        onChange={handleChange}
                        disabled={!formData.pricing.enabled}
                        className="w-full border border-gray-300 p-2 rounded"
                      >
                        <option value="monthly">Mensual</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="annually">Anual</option>
                        <option value="custom">Personalizado</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-1">
                  <h3 className="text-lg font-medium mb-2">Características</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="features.autoTranslate"
                        checked={formData.features.autoTranslate}
                        onChange={handleChange}
                        id="feature-translate"
                        className="mr-2"
                      />
                      <label htmlFor="feature-translate" className="text-sm">
                        Traducción automática
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="features.cookieScanning"
                        checked={formData.features.cookieScanning}
                        onChange={handleChange}
                        id="feature-cookies"
                        className="mr-2"
                      />
                      <label htmlFor="feature-cookies" className="text-sm">
                        Escaneo de cookies
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="features.customization"
                        checked={formData.features.customization}
                        onChange={handleChange}
                        id="feature-custom"
                        className="mr-2"
                      />
                      <label htmlFor="feature-custom" className="text-sm">
                        Personalización
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="features.advancedAnalytics"
                        checked={formData.features.advancedAnalytics}
                        onChange={handleChange}
                        id="feature-analytics"
                        className="mr-2"
                      />
                      <label htmlFor="feature-analytics" className="text-sm">
                        Analytics avanzado
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="features.multiLanguage"
                        checked={formData.features.multiLanguage}
                        onChange={handleChange}
                        id="feature-language"
                        className="mr-2"
                      />
                      <label htmlFor="feature-language" className="text-sm">
                        Multilenguaje
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="features.apiAccess"
                        checked={formData.features.apiAccess}
                        onChange={handleChange}
                        id="feature-api"
                        className="mr-2"
                      />
                      <label htmlFor="feature-api" className="text-sm">
                        Acceso a API
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="features.prioritySupport"
                        checked={formData.features.prioritySupport}
                        onChange={handleChange}
                        id="feature-support"
                        className="mr-2"
                      />
                      <label htmlFor="feature-support" className="text-sm">
                        Soporte prioritario
                      </label>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-medium mb-2 mt-6">Metadatos</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color
                      </label>
                      <input
                        type="color"
                        name="metadata.color"
                        value={formData.metadata.color}
                        onChange={handleChange}
                        className="border border-gray-300 rounded h-8 w-full"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="metadata.isRecommended"
                        checked={formData.metadata.isRecommended}
                        onChange={handleChange}
                        id="meta-recommended"
                        className="mr-2"
                      />
                      <label htmlFor="meta-recommended" className="text-sm">
                        Plan recomendado
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Orden de visualización
                      </label>
                      <input
                        type="number"
                        name="metadata.displayOrder"
                        value={formData.metadata.displayOrder}
                        onChange={handleChange}
                        min="1"
                        className="w-24 border border-gray-300 p-2 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <p className="text-gray-600">{plan.description || 'Sin descripción'}</p>
                </div>
                
                <div>
                  <div className="mb-6">
                    <h3 className="text-md font-semibold mb-2 border-b pb-1">Límites</h3>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Usuarios: </span>
                        {plan.limits?.isUnlimitedUsers ? 'Ilimitados' : plan.limits?.maxUsers}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Dominios: </span>
                        {plan.limits?.isUnlimitedDomains ? 'Ilimitados' : plan.limits?.maxDomains}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-md font-semibold mb-2 border-b pb-1">Precios</h3>
                    {plan.pricing?.enabled ? (
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Monto: </span>
                          {plan.pricing.amount} {plan.pricing.currency}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Intervalo: </span>
                          {plan.pricing.interval === 'monthly' && 'Mensual'}
                          {plan.pricing.interval === 'quarterly' && 'Trimestral'}
                          {plan.pricing.interval === 'annually' && 'Anual'}
                          {plan.pricing.interval === 'custom' && 'Personalizado'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm italic">Precio a consultar</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-md font-semibold mb-2 border-b pb-1">Metadatos</h3>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center">
                        <span className="font-medium mr-2">Color: </span>
                        <span 
                          className="inline-block w-5 h-5 rounded" 
                          style={{ backgroundColor: plan.metadata?.color || '#3498db' }}
                        />
                        <span className="ml-1">{plan.metadata?.color || '#3498db'}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Recomendado: </span>
                        {plan.metadata?.isRecommended ? 'Sí' : 'No'}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Orden de visualización: </span>
                        {plan.metadata?.displayOrder || 99}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-semibold mb-2 border-b pb-1">Características</h3>
                  <ul className="space-y-1">
                    <li className="text-sm flex items-center">
                      <span className={plan.features?.autoTranslate ? "text-green-600" : "text-red-600"}>
                        {plan.features?.autoTranslate ? (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      Traducción automática
                    </li>
                    <li className="text-sm flex items-center">
                      <span className={plan.features?.cookieScanning ? "text-green-600" : "text-red-600"}>
                        {plan.features?.cookieScanning ? (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      Escaneo de cookies
                    </li>
                    <li className="text-sm flex items-center">
                      <span className={plan.features?.customization ? "text-green-600" : "text-red-600"}>
                        {plan.features?.customization ? (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      Personalización
                    </li>
                    <li className="text-sm flex items-center">
                      <span className={plan.features?.advancedAnalytics ? "text-green-600" : "text-red-600"}>
                        {plan.features?.advancedAnalytics ? (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      Analytics avanzado
                    </li>
                    <li className="text-sm flex items-center">
                      <span className={plan.features?.multiLanguage ? "text-green-600" : "text-red-600"}>
                        {plan.features?.multiLanguage ? (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      Multilenguaje
                    </li>
                    <li className="text-sm flex items-center">
                      <span className={plan.features?.apiAccess ? "text-green-600" : "text-red-600"}>
                        {plan.features?.apiAccess ? (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      Acceso a API
                    </li>
                    <li className="text-sm flex items-center">
                      <span className={plan.features?.prioritySupport ? "text-green-600" : "text-red-600"}>
                        {plan.features?.prioritySupport ? (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      Soporte prioritario
                    </li>
                  </ul>
                </div>
              </div>

              {/* Sección para clonar plan */}
              {cloneFormData.showCloneForm ? (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">Clonar Plan</h3>
                  <form onSubmit={handleCloneSubmit} className="flex items-end space-x-2">
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre para el nuevo plan
                      </label>
                      <input
                        type="text"
                        value={cloneFormData.newName}
                        onChange={handleCloneChange}
                        className="w-full border border-gray-300 p-2 rounded"
                        required
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={toggleCloneForm}
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Clonando...' : 'Clonar'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
              
              <div className="mt-6 flex justify-between">
                <div>
                  <button
                    onClick={toggleCloneForm}
                    className="px-4 py-2 border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-50"
                  >
                    Clonar plan
                  </button>
                </div>
                <div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Editar plan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlanDetailsModal;