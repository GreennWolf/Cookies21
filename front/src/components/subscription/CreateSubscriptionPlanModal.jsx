import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { createSubscriptionPlan } from '../../api/subscription';

const CreateSubscriptionPlanModal = ({ onClose, onPlanCreated }) => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre del plan es requerido');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await createSubscriptionPlan(formData);
      toast.success('Plan de suscripción creado correctamente');
      onPlanCreated(response.data.plan);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Error al crear el plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Crear Plan de Suscripción</h2>
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
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 p-2 rounded"
                  placeholder="Ej: Plan Básico"
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
                  placeholder="Breve descripción del plan"
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
                onClick={onClose}
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
                {isSubmitting ? 'Creando...' : 'Crear Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSubscriptionPlanModal;