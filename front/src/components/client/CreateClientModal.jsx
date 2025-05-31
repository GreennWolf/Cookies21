import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getSubscriptionPlans } from '../../api/subscription';
import SubscriptionPlanCards from '../subscription/SubscriptionPlanCards';
import SimpleBannerConfigStep from './SimpleBannerConfigStep';

const CreateClientModal = ({ onClose, onClientCreated }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    subscription: {
      planId: '',
      isUnlimited: false
    },
    domains: [''],
    adminUser: {
      name: '',
      email: '',
      password: '',
      sendInvitation: true
    },
    // Añadimos la sección de información fiscal
    fiscalInfo: {
      cif: '',
      razonSocial: '',
      direccion: '',
      codigoPostal: '',
      poblacion: '',
      provincia: '',
      pais: 'España'
    },
    // Configuración del banner
    configureBanner: false,
    bannerConfig: null,
    // Enviar script por email
    sendScriptByEmail: true
  });

  useEffect(() => {
    // Cargar planes disponibles al abrir el modal
    fetchAvailablePlans();
  }, []);

  const fetchAvailablePlans = async () => {
    setIsLoadingPlans(true);
    try {
      const response = await getSubscriptionPlans({ status: 'active' });
      setAvailablePlans(response.data.plans);
      
      // Si hay planes disponibles, seleccionar el primero que sea recomendado o el primero de la lista
      if (response.data.plans.length > 0) {
        const recommendedPlan = response.data.plans.find(plan => plan.metadata?.isRecommended);
        if (recommendedPlan) {
          handlePlanSelect(recommendedPlan._id);
        } else {
          handlePlanSelect(response.data.plans[0]._id);
        }
      }
    } catch (error) {
      toast.error('Error al cargar planes disponibles');
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
        setFormData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: type === 'checkbox' ? checked : value
          }
        }));
      } else if (parts.length === 3) {
        // Para manejar estructuras más profundas, como fiscalInfo.direccion.calle
        const [section, subsection, field] = parts;
        setFormData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [subsection]: {
              ...prev[section][subsection],
              [field]: type === 'checkbox' ? checked : value
            }
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleDomainChange = (e, index) => {
    const newDomains = [...formData.domains];
    newDomains[index] = e.target.value;
    setFormData(prev => ({
      ...prev,
      domains: newDomains
    }));
  };

  const addDomain = () => {
    setFormData(prev => ({
      ...prev,
      domains: [...prev.domains, '']
    }));
  };

  const removeDomain = (index) => {
    const newDomains = formData.domains.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      domains: newDomains.length ? newDomains : ['']
    }));
  };

  const handlePlanSelect = (planId) => {
    // Encontrar el plan seleccionado
    const plan = availablePlans.find(p => p._id === planId);
    
    if (plan) {
      setSelectedPlan(plan);
      
      // Actualizar formData con la información del plan seleccionado
      setFormData(prev => ({
        ...prev,
        subscription: {
          ...prev.subscription,
          planId: planId,
          isUnlimited: plan.limits?.isUnlimitedUsers || false
          // Ya no manejamos maxUsers aquí, se obtiene directamente del plan
        }
      }));
    }
  };

  const handleNextStep = (e) => {
    // Prevenir el comportamiento predeterminado (envío del formulario)
    if (e) {
      console.log("🛑 CreateClientModal: Previniendo envío del formulario en handleNextStep", e.type);
      e.preventDefault();
      e.stopPropagation();
    } else {
      console.warn("⚠️ CreateClientModal: handleNextStep llamado sin evento");
    }
    
    console.log("🔍 CreateClientModal: Avanzando del paso", step, "al paso", step + 1);
    console.log("🔍 CreateClientModal: Estado actual del formData:", formData);
    
    // Si estamos en el paso 2 y no hay dominios válidos, saltar directamente al paso 4
    if (step === 2) {
      const validDomains = formData.domains.filter(d => d.trim() !== '');
      if (validDomains.length === 0) {
        console.log("⚠️ CreateClientModal: No hay dominios válidos. Saltando directamente al paso 4");
        toast.info('No hay dominios configurados, saltando la configuración de banner');
        setStep(4);
        return;
      }
    }
    
    // Validaciones básicas antes de avanzar al siguiente paso
    if (step === 1) {
      if (!formData.name.trim()) {
        toast.error('El nombre del cliente es requerido');
        return;
      }
      if (!formData.contactEmail.trim()) {
        toast.error('El email de contacto es requerido');
        return;
      }
      
      // Ya no requerimos dominios obligatoriamente
      // La validación se hará después de avanzar al paso 2
    }
    
    if (step === 2 && !formData.subscription.planId) {
      toast.error('Debe seleccionar un plan de suscripción');
      return;
    }
    
    // Si estamos en el paso 2 y no hay dominios válidos, saltar directamente al paso 4 (administrador)
    if (step === 2) {
      const validDomains = formData.domains.filter(d => d.trim() !== '');
      if (validDomains.length === 0) {
        console.log("⚠️ CreateClientModal: No hay dominios válidos. Saltando directamente al paso 4");
        toast.info('No hay dominios configurados, saltando la configuración de banner');
        
        // Desactivar configuración de banner y envío de script por email ya que no hay dominios
        setFormData(prev => ({
          ...prev,
          configureBanner: false,
          sendScriptByEmail: false // Desactivar envío de script sin dominios
        }));
        
        // Saltar al paso 4 directamente
        setStep(4);
        return;
      }
    }
    
    if (step === 3 && formData.configureBanner) {
      // Validaciones para la configuración del banner si está activada
      if (!formData.bannerConfig?.templateId) {
        toast.error('Debe seleccionar una plantilla base para el banner');
        return;
      }
      // El nombre se genera automáticamente en el nuevo componente
      console.log("🔍 CreateClientModal: Configuración de banner válida, avanzando al paso 4", formData.bannerConfig);
    }
    
    // Guardar el paso anterior para realizar un seguimiento
    const previousStep = step;
    
    // Incrementar el paso de forma explícita
    setStep(prevStep => {
      const newStep = prevStep + 1;
      console.log(`⏭️ CreateClientModal: Cambiando de paso ${prevStep} a ${newStep}`);
      return newStep;
    });
    
    // Verificar después del estado actualizado
    setTimeout(() => {
      console.log(`✅ CreateClientModal: Verificación post-actualización - Paso anterior: ${previousStep}, Paso actual: ${step}`);
    }, 0);
  };

  const handlePrevStep = (e) => {
    // Prevenir el comportamiento predeterminado (envío del formulario)
    if (e) {
      console.log("🛑 CreateClientModal: Previniendo envío del formulario en handlePrevStep", e.type);
      e.preventDefault();
      e.stopPropagation();
    } else {
      console.warn("⚠️ CreateClientModal: handlePrevStep llamado sin evento");
    }
    
    console.log("🔍 CreateClientModal: Retrocediendo del paso", step);
    
    // Guardar el paso anterior para realizar un seguimiento
    const previousStep = step;
    
    // Si estamos en el paso 4 y no hay dominios válidos, volver al paso 2 directamente
    // ya que el paso 3 es para configuración de banner, que no se puede hacer sin dominios
    if (step === 4) {
      const validDomains = formData.domains.filter(d => d.trim() !== '');
      if (validDomains.length === 0) {
        console.log("🛒 CreateClientModal: No hay dominios válidos, retrocediendo del paso 4 al paso 2");
        
        setStep(2); // Volver directamente al paso 2
        
        // Verificar después del estado actualizado
        setTimeout(() => {
          console.log(`✅ CreateClientModal: Verificación post-actualización - Paso anterior: ${previousStep}, Paso actual: 2`);
        }, 0);
        
        return; // Salir de la función para evitar el decremento normal
      }
    }
    
    // Decrementar el paso de forma explícita cuando no hay condiciones especiales
    setStep(prevStep => {
      const newStep = prevStep - 1;
      console.log(`⏮️ CreateClientModal: Cambiando de paso ${prevStep} a ${newStep}`);
      return newStep;
    });
    
    // Verificar después del estado actualizado
    setTimeout(() => {
      console.log(`✅ CreateClientModal: Verificación post-actualización - Paso anterior: ${previousStep}, Paso actual: ${step}`);
    }, 0);
  };

  const handleSubmit = async (e) => {
    console.log("🚀 CreateClientModal: handleSubmit llamado, previniendo envío por defecto");
    e.preventDefault();
    
    // Validación final antes de enviar
    if (!formData.adminUser.name.trim() || !formData.adminUser.email.trim()) {
      console.log("❌ CreateClientModal: Validación fallida - Nombre y email del administrador requeridos");
      toast.error('Nombre y email del administrador son requeridos');
      return;
    }
    
    // Filtrar dominios vacíos
    const cleanedDomains = formData.domains.filter(domain => domain.trim() !== '');
    console.log(`🔍 CreateClientModal: Dominios válidos después de filtrar: ${cleanedDomains.length}`);
    
    // Actualizar sendScriptByEmail según la disponibilidad de dominios
    if (cleanedDomains.length === 0) {
      // Sin dominios, desactivar envío de script
      setFormData(prev => ({
        ...prev,
        sendScriptByEmail: false
      }));
    }
    
    if (cleanedDomains.length === 0 && formData.sendScriptByEmail) {
      console.log("❌ CreateClientModal: Validación fallida - No hay dominios válidos pero sendScriptByEmail=true");
      toast.error('Debe proporcionar al menos un dominio válido para enviar el script por email');
      setStep(1); // Regresar al paso de datos del cliente
      return;
    }
    
    // Asegurarse de que hay un email para el cliente
    if (!formData.contactEmail || !formData.contactEmail.trim()) {
      console.log("❌ CreateClientModal: Validación fallida - Email del cliente requerido");
      toast.error('El email de contacto del cliente es requerido');
      setStep(1);
      return;
    }

    // Si está habilitada la configuración del banner, validar datos necesarios
    if (formData.configureBanner) {
      if (!formData.bannerConfig?.templateId) {
        toast.error('Debe seleccionar una plantilla base para el banner');
        setStep(3); // Regresar al paso de configuración del banner
        return;
      }
      // El nombre se genera automáticamente en el nuevo componente
    }
    
    // Preparar datos finales
    const clientData = {
      ...formData,
      domains: cleanedDomains,
    };
    
    // Si hay configuración de banner, verificar y limpiar las imágenes vacías
    if (clientData.configureBanner && clientData.bannerConfig && clientData.bannerConfig.images) {
      // Filtrar las imágenes vacías (los objetos vacíos no son archivos válidos)
      const cleanedImages = {};
      
      Object.entries(clientData.bannerConfig.images).forEach(([key, value]) => {
        // Solo incluir si es un objeto File o tiene propiedades
        if (value instanceof File || (value && Object.keys(value).length > 0)) {
          cleanedImages[key] = value;
        }
      });
      
      // Reemplazar las imágenes con las limpias
      clientData.bannerConfig.images = cleanedImages;
      
      console.log("🧹 CreateClientModal: Limpiando imágenes vacías", {
        antes: Object.keys(formData.bannerConfig.images).length,
        después: Object.keys(cleanedImages).length
      });
    }
    
    // Asegurar que email y contactEmail estén correctamente establecidos
    if (!clientData.email || clientData.email !== clientData.contactEmail) {
      clientData.email = clientData.contactEmail.trim();
    }
    
    
    setIsLoading(true);
    
    // Mostrar toast de proceso iniciado
    toast.info('Iniciando creación del cliente...', { autoClose: 2000 });
    
    try {
      // Mostrar toast de progreso
      const progressToast = toast.loading('Creando cliente y dominios...', { autoClose: false });
      
      const result = await onClientCreated(clientData);
      
      // Actualizar toast de progreso a completado
      toast.update(progressToast, { 
        render: 'Cliente creado exitosamente', 
        type: 'success', 
        isLoading: false, 
        autoClose: 3000 
      });
      
      // Banner y dominios se gestionan en el componente padre
      // Mostrar feedback adicional si se configuró un banner
      if (formData.configureBanner) {
        toast.success(`Banner "${formData.bannerConfig.name}" configurado para ${cleanedDomains.length} dominio(s)`);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating client:', error);
      
      // Manejo detallado de errores según el tipo
      let errorMessage = 'Ha ocurrido un error durante la creación. Por favor inténtelo de nuevo.';
      
      if (error.response) {
        // Error de respuesta del servidor
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
          case 400:
            errorMessage = data.message || 'Datos inválidos. Revise la información e inténtelo nuevamente.';
            break;
          case 409:
            errorMessage = data.message || 'Ya existe un cliente con ese email o dominio.';
            break;
          case 422:
            errorMessage = data.message || 'Error de validación. Revise todos los campos.';
            break;
          case 500:
            errorMessage = 'Error interno del servidor. Por favor contacte al administrador.';
            break;
          default:
            errorMessage = data.message || `Error ${status}: ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Error de red
        errorMessage = 'Error de conexión. Verifique su conexión a internet e inténtelo nuevamente.';
      } else if (error.message) {
        // Error de configuración u otro
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { autoClose: 5000 });
      
      // Si es error de validación, regresar al paso apropiado
      if (error.response?.status === 400 || error.response?.status === 422) {
        // Intentar identificar qué paso tiene el error
        const errorMsg = error.response.data.message?.toLowerCase() || '';
        if (errorMsg.includes('email') || errorMsg.includes('dominio') || errorMsg.includes('name')) {
          setStep(1);
        } else if (errorMsg.includes('plan') || errorMsg.includes('subscription')) {
          setStep(2);
        } else if (errorMsg.includes('banner') || errorMsg.includes('template')) {
          setStep(3);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Crear Cliente</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Pasos de progreso */}
        <div className="px-4 pt-4">
          {(() => {
            const hasValidDomains = formData.domains.some(d => d.trim() !== '');
            const showBannerStep = hasValidDomains;
            
            return (
              <div className="flex items-center justify-between mb-6">
                <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    1
                  </div>
                  <span className="ml-2 text-sm font-medium">Datos del cliente</span>
                </div>
                <div className="flex-grow mx-4 h-0.5 bg-gray-200">
                  <div className={`h-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} style={{ width: `${step > 1 ? '100%' : '0%'}` }}></div>
                </div>
                <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    2
                  </div>
                  <span className="ml-2 text-sm font-medium">Plan de suscripción</span>
                </div>
                
                {/* Paso 3: Solo mostrar si hay dominios válidos */}
                {showBannerStep && (
                  <>
                    <div className="flex-grow mx-4 h-0.5 bg-gray-200">
                      <div className={`h-full ${step >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`} style={{ width: `${step > 2 ? '100%' : '0%'}` }}></div>
                    </div>
                    <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        3
                      </div>
                      <span className="ml-2 text-sm font-medium">Banner de cookies</span>
                    </div>
                  </>
                )}
                
                <div className="flex-grow mx-4 h-0.5 bg-gray-200">
                  <div className={`h-full ${step >= 4 ? 'bg-blue-500' : 'bg-gray-200'}`} style={{ width: `${step > (showBannerStep ? 3 : 2) ? '100%' : '0%'}` }}></div>
                </div>
                <div className={`flex items-center ${step >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {showBannerStep ? '4' : '3'}
                  </div>
                  <span className="ml-2 text-sm font-medium">Configuración de administrador</span>
                </div>
              </div>
            );
          })()}
        </div>
        
        <form onSubmit={handleSubmit} id="createClientForm">
          <div className="p-4">
            {/* Añadir un campo oculto para prevenir comportamientos no deseados del formulario */}
            <input type="hidden" name="preventAutoSubmit" value="true" />
            
            {/* Paso 1: Datos básicos del cliente */}
            {step === 1 && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del cliente *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 p-2 rounded"
                    placeholder="Ingrese el nombre del cliente"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email de contacto *
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    className="w-full border border-gray-300 p-2 rounded"
                    placeholder="contacto@cliente.com"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Dominios (opcional)
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
                </div>

                {/* Información fiscal */}
                <div className="mt-6">
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
              </div>
            )}
            
            {/* Paso 2: Plan de suscripción */}
            {step === 2 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Seleccione un plan de suscripción</h3>
                
                {isLoadingPlans ? (
                  <div className="flex justify-center items-center h-60">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : availablePlans.length > 0 ? (
                  <SubscriptionPlanCards 
                    plans={availablePlans} 
                    selectedPlanId={formData.subscription.planId}
                    onSelectPlan={handlePlanSelect}
                  />
                ) : (
                  <div className="bg-yellow-50 p-4 rounded text-yellow-700">
                    <p>No hay planes de suscripción disponibles. Cree planes en la sección de gestión de planes.</p>
                  </div>
                )}
                
                {selectedPlan && (
                  <div className="mt-6 bg-gray-50 p-4 rounded">
                    <h4 className="font-medium text-gray-700 mb-2">Detalles del plan seleccionado</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><span className="font-medium">Nombre:</span> {selectedPlan.name}</p>
                        <p><span className="font-medium">Usuarios máximos:</span> {selectedPlan.limits?.isUnlimitedUsers ? 'Ilimitados' : selectedPlan.limits?.maxUsers}</p>
                        <p><span className="font-medium">Dominios máximos:</span> {selectedPlan.limits?.isUnlimitedDomains ? 'Ilimitados' : selectedPlan.limits?.maxDomains}</p>
                      </div>
                      <div>
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            name="subscription.isUnlimited"
                            id="isUnlimited"
                            checked={formData.subscription.isUnlimited}
                            onChange={handleChange}
                            className="mr-2"
                          />
                          <label htmlFor="isUnlimited" className="text-sm font-medium text-gray-700">
                            Suscripción sin fecha de vencimiento
                          </label>
                        </div>
                        
                        <p className="text-xs text-gray-500 italic mt-2">
                          Los límites de usuarios y dominios se establecen según el plan seleccionado.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Paso 3: Configuración del banner */}
            {step === 3 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Configuración del Banner de Cookies</h3>
                
                {/* Checkbox para configurar banner */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.configureBanner}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          configureBanner: e.target.checked,
                          bannerConfig: e.target.checked ? prev.bannerConfig : null
                        }));
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Configurar banner de cookies personalizado
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Si no marca esta opción, el cliente podrá configurar su banner posteriormente desde su panel de control.
                      </p>
                    </div>
                  </label>
                </div>
                
                {/* Configuración del banner (solo si está marcado) */}
                {formData.configureBanner && (
                  <SimpleBannerConfigStep 
                    formData={formData} 
                    onChange={(field, value) => {
                      setFormData(prev => ({
                        ...prev,
                        [field]: value
                      }));
                    }}
                    selectedDomain={formData.domains[0] || ''}
                  />
                )}
                
                {/* Mensaje cuando no se configura banner */}
                {!formData.configureBanner && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-500 mt-0.5">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">
                          Banner no configurado
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          El cliente podrá configurar su banner de cookies más tarde desde su panel de administración. 
                          Se le proporcionará acceso completo a todas las plantillas y opciones de personalización.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Paso 4: Configuración del administrador */}
            {step === 4 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Configuración del administrador</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Establezca la información del usuario administrador para este cliente.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del administrador *
                    </label>
                    <input
                      type="text"
                      name="adminUser.name"
                      value={formData.adminUser.name}
                      onChange={handleChange}
                      className="w-full border border-gray-300 p-2 rounded"
                      placeholder="Nombre completo"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email del administrador *
                    </label>
                    <input
                      type="email"
                      name="adminUser.email"
                      value={formData.adminUser.email}
                      onChange={handleChange}
                      className="w-full border border-gray-300 p-2 rounded"
                      placeholder="admin@empresa.com"
                      required
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      name="adminUser.sendInvitation"
                      id="sendInvitation"
                      checked={formData.adminUser.sendInvitation}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label htmlFor="sendInvitation" className="text-sm font-medium text-gray-700">
                      Enviar invitación por email
                    </label>
                  </div>
                  
                  {/* Mostrar opción de enviar script por email solo si hay dominios con contenido */}
                  {formData.domains.some(domain => domain.trim()) && (
                    <div className="flex items-center mb-2 ml-6">
                      <input
                        type="checkbox"
                        name="sendScriptByEmail"
                        id="sendScriptByEmail"
                        checked={formData.sendScriptByEmail}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <label htmlFor="sendScriptByEmail" className="text-sm font-medium text-gray-700">
                        Enviar script por email
                      </label>
                    </div>
                  )}
                  
                  {/* Mostrar mensaje si no hay dominios */}
                  {!formData.domains.some(domain => domain.trim()) && (
                    <div className="text-yellow-600 text-sm ml-6 mb-2">
                      <span className="inline-block mr-1">⚠️</span>
                      No se puede enviar el script por email porque no se han configurado dominios.
                    </div>
                  )}
                  
                  {!formData.adminUser.sendInvitation && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        name="adminUser.password"
                        value={formData.adminUser.password}
                        onChange={handleChange}
                        className="w-full border border-gray-300 p-2 rounded"
                        placeholder="Mínimo 8 caracteres"
                        minLength="8"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Si no establece una contraseña, se generará automáticamente.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-50 p-4 rounded text-sm text-blue-700 mb-4">
                  <p>
                    Al crear este cliente, se creará automáticamente una cuenta de administrador con los datos proporcionados.
                    {formData.adminUser.sendInvitation 
                      ? ' Se enviará una invitación al email del administrador para completar el registro.'
                      : ' El administrador podrá iniciar sesión inmediatamente con el email y contraseña proporcionados.'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t p-4 flex justify-between">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    console.log("👈 CreateClientModal: Botón Anterior presionado");
                    handlePrevStep(e);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Anterior
                </button>
              )}
            </div>
            <div>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    console.log("👉 CreateClientModal: Botón Siguiente presionado para paso " + step);
                    handleNextStep(e);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={isLoading}
                  onClick={(e) => console.log("✅ CreateClientModal: Botón Crear Cliente presionado (submit)")}
                >
                  {isLoading ? 'Creando...' : 'Crear Cliente'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClientModal;