import React, { useState } from 'react';
import { X, AlertTriangle, Clock, Zap } from 'lucide-react';

const CancelSubscriptionModal = ({ isOpen, onClose, client, onConfirm, isLoading }) => {
  const [cancellationType, setCancellationType] = useState('end_of_period');
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedReason = reason.trim();
    onConfirm({
      cancelImmediately: cancellationType === 'immediate',
      ...(trimmedReason && { reason: trimmedReason })
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason('');
      setCancellationType('end_of_period');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            Cancelar Suscripción
          </h2>
          {!isLoading && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>¿Estás seguro?</strong> Esta acción cancelará la suscripción de{' '}
            <strong>{client?.companyName}</strong>. Esta operación no se puede deshacer.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de cancelación
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="cancellationType"
                  value="end_of_period"
                  checked={cancellationType === 'end_of_period'}
                  onChange={(e) => setCancellationType(e.target.value)}
                  className="mr-3"
                  disabled={isLoading}
                />
                <Clock className="h-4 w-4 text-blue-500 mr-2" />
                <div>
                  <div className="font-medium">Al final del período</div>
                  <div className="text-sm text-gray-500">
                    La suscripción seguirá activa hasta su fecha de vencimiento
                  </div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="cancellationType"
                  value="immediate"
                  checked={cancellationType === 'immediate'}
                  onChange={(e) => setCancellationType(e.target.value)}
                  className="mr-3"
                  disabled={isLoading}
                />
                <Zap className="h-4 w-4 text-red-500 mr-2" />
                <div>
                  <div className="font-medium">Cancelación inmediata</div>
                  <div className="text-sm text-gray-500">
                    La suscripción se cancelará ahora mismo
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Razón de la cancelación (opcional)
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              placeholder="Ej: Cliente solicitó cancelación, falta de pago, etc."
              maxLength={500}
              disabled={isLoading}
            />
            <div className="text-xs text-gray-500 mt-1">
              {reason.length}/500 caracteres
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cancelando...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Confirmar Cancelación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelSubscriptionModal;