import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createRenewalRequest, checkPendingRequest } from '../../api/subscriptionRenewal';
import { renewalNotificationManager } from '../../utils/renewalNotifications';

const RenewalRequestModal = ({ isOpen, onClose, subscriptionStatus, clientId = null, onRequestSent }) => {
  const [formData, setFormData] = useState({
    requestType: 'renewal',
    message: '',
    contactPreference: 'email',
    urgency: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [checkingPending, setCheckingPending] = useState(true);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Verificar si ya hay una solicitud pendiente al abrir el modal
  useEffect(() => {
    if (isOpen) {
      checkExistingRequest();
      // Determinar el tipo de solicitud basado en el estado de la suscripción
      const requestType = getRequestType(subscriptionStatus?.reason);
      setFormData(prev => ({
        ...prev,
        requestType,
        message: getDefaultMessage(requestType, subscriptionStatus?.reason)
      }));
    }
  }, [isOpen, subscriptionStatus]);

  const checkExistingRequest = async () => {
    try {
      setCheckingPending(true);
      const response = await checkPendingRequest(clientId);
      if (response.data.hasPendingRequest) {
        setPendingRequest(response.data.request);
      }
      // Si requiresClientId es true, no mostrar error ya que es normal para owners
      if (response.data.requiresClientId) {
        console.log('Owner sin clientId específico - no se verifica solicitud pendiente');
      }
    } catch (error) {
      console.error('Error checking pending request:', error);
      // No mostrar error al usuario si falla la verificación, solo registrar en console
    } finally {
      setCheckingPending(false);
    }
  };

  const getRequestType = (reason) => {
    switch (reason) {
      case 'CANCELLED':
        return 'reactivation';
      case 'EXPIRED':
        return 'renewal';
      case 'SUSPENDED':
        return 'support';
      default:
        return 'renewal';
    }
  };

  const getDefaultMessage = (requestType, reason) => {
    const messages = {
      renewal: 'Me gustaría renovar mi suscripción para continuar utilizando los servicios. Por favor, contáctenme para discutir las opciones disponibles.',
      reactivation: 'Solicito la reactivación de mi suscripción que fue cancelada. Estoy interesado en continuar con el servicio.',
      support: 'Mi cuenta está suspendida y necesito asistencia para resolver esta situación. Por favor, contáctenme para obtener más información.',
      upgrade: 'Estoy interesado en actualizar mi plan actual a uno con más funcionalidades.'
    };
    return messages[requestType] || messages.renewal;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.message.trim()) {
      toast.error('Por favor, proporciona un mensaje detallando tu solicitud');
      return;
    }

    if (formData.message.length < 10) {
      toast.error('El mensaje debe tener al menos 10 caracteres');
      return;
    }

    try {
      setLoading(true);
      const response = await createRenewalRequest(formData);
      
      if (response.data.alreadyExists) {
        toast.info(response.message);
        setPendingRequest(response.data.request);
      } else {
        // Mostrar feedback de éxito
        setJustSubmitted(true);
        setPendingRequest(response.data.request);
        toast.success('✅ ' + response.message);
        
        if (onRequestSent) {
          onRequestSent(response.data.request);
        }
        
        // Notificar actualización para el contador del header
        renewalNotificationManager.onRenewalRequestCreated();
        
        // Resetear el formulario
        setFormData({
          requestType: 'renewal',
          message: '',
          contactPreference: 'email',
          urgency: 'medium'
        });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRequestTypeText = (type) => {
    const types = {
      renewal: 'Renovación de Suscripción',
      reactivation: 'Reactivación de Suscripción',
      upgrade: 'Actualización de Plan',
      support: 'Soporte Técnico'
    };
    return types[type] || type;
  };

  const getUrgencyText = (urgency) => {
    const urgencies = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta'
    };
    return urgencies[urgency] || urgency;
  };

  const getStatusText = (status) => {
    const statuses = {
      pending: 'Pendiente',
      in_progress: 'En Proceso',
      completed: 'Completada',
      rejected: 'Rechazada'
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-50',
      in_progress: 'text-blue-600 bg-blue-50',
      completed: 'text-green-600 bg-green-50',
      rejected: 'text-red-600 bg-red-50'
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b p-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {pendingRequest ? 'Estado de tu Solicitud' : 'Solicitar Renovación'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {checkingPending ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Verificando solicitudes...</span>
            </div>
          ) : pendingRequest ? (
            // Mostrar solicitud existente
            <div className="space-y-6">
              {/* Mensaje de éxito si se acaba de enviar */}
              {justSubmitted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        ¡Solicitud Enviada Exitosamente!
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Tu solicitud de renovación ha sido recibida y está siendo procesada por nuestro equipo. Te contactaremos pronto con más información.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Ya tienes una solicitud en proceso
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Tu solicitud de {getRequestTypeText(pendingRequest.requestType).toLowerCase()} está siendo procesada por nuestro equipo.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">Detalles de la Solicitud</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pendingRequest.status)}`}>
                    {getStatusText(pendingRequest.status)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Tipo:</span>
                    <p className="font-medium">{getRequestTypeText(pendingRequest.requestType)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Urgencia:</span>
                    <p className="font-medium">{getUrgencyText(pendingRequest.urgency)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Enviada:</span>
                    <p className="font-medium">{pendingRequest.timeElapsed}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Contacto:</span>
                    <p className="font-medium">{pendingRequest.contactPreference === 'email' ? 'Email' : 'Teléfono'}</p>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 text-sm">Mensaje:</span>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded border">
                    {pendingRequest.message}
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      ¿Qué sigue?
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Nuestro equipo revisará tu solicitud y se contactará contigo dentro de las próximas 24-48 horas. Te notificaremos por email sobre cualquier actualización.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Formulario para nueva solicitud
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Solicitud
                </label>
                <select
                  name="requestType"
                  value={formData.requestType}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="renewal">Renovación de Suscripción</option>
                  <option value="reactivation">Reactivación de Suscripción</option>
                  <option value="upgrade">Actualización de Plan</option>
                  <option value="support">Soporte Técnico</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgencia
                </label>
                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Baja - Puede esperar</option>
                  <option value="medium">Media - Dentro de unos días</option>
                  <option value="high">Alta - Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferencia de Contacto
                </label>
                <select
                  name="contactPreference"
                  value={formData.contactPreference}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="phone">Teléfono</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe tu solicitud, cualquier información adicional que pueda ser útil, y tus expectativas..."
                  maxLength={1000}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {formData.message.length}/1000 caracteres
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      ¿Qué pasa después?
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Tu solicitud será enviada a nuestro equipo de soporte. Te contactaremos por {formData.contactPreference === 'email' ? 'email' : 'teléfono'} dentro de las próximas 24-48 horas para ayudarte con tu {getRequestTypeText(formData.requestType).toLowerCase()}.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.message.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    'Enviar Solicitud'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RenewalRequestModal;