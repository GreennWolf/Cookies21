import React, { useState, useEffect } from 'react';
import RenewalRequestModal from '../subscription/RenewalRequestModal';

const SubscriptionAlert = ({ subscriptionInactive, subscriptionMessage, subscriptionStatus, className = "", clientId = null }) => {
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  useEffect(() => {
    // Verificar si hay un error de suscripción guardado
    const checkSubscriptionError = () => {
      const errorData = localStorage.getItem('subscription_error');
      if (errorData) {
        try {
          const error = JSON.parse(errorData);
          // Solo mostrar errores recientes (últimos 5 minutos)
          const errorTime = new Date(error.timestamp);
          const now = new Date();
          const diffMinutes = (now - errorTime) / (1000 * 60);
          
          if (diffMinutes <= 5) {
            setSubscriptionError(error);
          } else {
            // Limpiar errores antiguos
            localStorage.removeItem('subscription_error');
          }
        } catch (e) {
          localStorage.removeItem('subscription_error');
        }
      }
    };

    // Verificar al cargar
    checkSubscriptionError();

    // Escuchar eventos de suscripción inactiva
    const handleSubscriptionInactive = (event) => {
      const { reason, message } = event.detail;
      setSubscriptionError({
        reason,
        message,
        timestamp: new Date().toISOString()
      });
    };

    window.addEventListener('subscription:inactive', handleSubscriptionInactive);

    return () => {
      window.removeEventListener('subscription:inactive', handleSubscriptionInactive);
    };
  }, []);

  const handleDismiss = () => {
    setSubscriptionError(null);
    localStorage.removeItem('subscription_error');
  };

  const getAlertContent = (reason) => {
    switch (reason) {
      case 'EXPIRED':
        return {
          title: '⚠️ Suscripción Expirada',
          message: 'Tu suscripción ha expirado. Renueva tu plan para continuar usando todas las funcionalidades.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        };
      case 'CANCELLED':
        return {
          title: '❌ Suscripción Cancelada',
          message: 'Tu suscripción ha sido cancelada. Reactiva tu plan para continuar usando el servicio.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        };
      case 'SUSPENDED':
        return {
          title: '⏸️ Cuenta Suspendida',
          message: 'Tu cuenta ha sido suspendida. Contacta al soporte técnico para más información.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'CLIENT_INACTIVE':
        return {
          title: '⛔ Cuenta Inactiva',
          message: 'Tu cuenta está inactiva. Contacta al administrador para reactivarla.',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          buttonColor: 'bg-gray-600 hover:bg-gray-700'
        };
      case 'NOT_STARTED':
        return {
          title: '⏳ Suscripción No Iniciada',
          message: 'Tu suscripción aún no ha comenzado. Verifica las fechas de tu plan.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        };
      default:
        return {
          title: '📖 Modo Solo Lectura',
          message: 'Tu suscripción no está activa. Puedes ver la información pero no realizar cambios.',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          buttonColor: 'bg-blue-600 hover:bg-blue-700'
        };
    }
  };

  // Determinar qué información mostrar (props o localStorage)
  const currentSubscriptionInfo = subscriptionInactive && subscriptionStatus ? {
    reason: subscriptionStatus.reason,
    message: subscriptionMessage || subscriptionStatus.message
  } : subscriptionError;

  if (!currentSubscriptionInfo) {
    return null;
  }

  const alertContent = getAlertContent(currentSubscriptionInfo.reason);

  return (
    <>
      <div className={`${alertContent.bgColor} ${alertContent.borderColor} border rounded-lg p-4 mb-4 ${alertContent.textColor}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">
              {alertContent.title}
            </h3>
            <p className="text-sm mb-3">
              {currentSubscriptionInfo.message || alertContent.message}
            </p>
            <div className="flex flex-wrap gap-2">
              {(currentSubscriptionInfo.reason === 'EXPIRED' || currentSubscriptionInfo.reason === 'CANCELLED') && (
                <button 
                  className={`px-4 py-2 ${alertContent.buttonColor} text-white rounded text-sm font-medium transition`}
                  onClick={() => setShowRenewalModal(true)}
                >
                  {currentSubscriptionInfo.reason === 'CANCELLED' ? 'Reactivar Suscripción' : 'Renovar Suscripción'}
                </button>
              )}
              {(currentSubscriptionInfo.reason === 'CLIENT_INACTIVE' || currentSubscriptionInfo.reason === 'SUSPENDED') && (
                <button 
                  className={`px-4 py-2 ${alertContent.buttonColor} text-white rounded text-sm font-medium transition`}
                  onClick={() => setShowRenewalModal(true)}
                >
                  Contactar Soporte
                </button>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
            title="Cerrar alerta"
          >
            ×
          </button>
        </div>
      </div>
      
      {/* Modal de solicitud de renovación */}
      <RenewalRequestModal
        isOpen={showRenewalModal}
        onClose={() => setShowRenewalModal(false)}
        subscriptionStatus={currentSubscriptionInfo ? { reason: currentSubscriptionInfo.reason } : subscriptionStatus}
        clientId={clientId}
        onRequestSent={() => {
          // Actualizar la alerta para mostrar que la solicitud fue enviada
          setSubscriptionError(null);
          localStorage.removeItem('subscription_error');
        }}
      />
    </>
  );
};

export default SubscriptionAlert;