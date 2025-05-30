import React from 'react';

const CancelScanConfirmModal = ({ isOpen, onClose, onConfirm, scanInfo }) => {
  if (!isOpen) return null;

  // Sanitizar los datos del scan para evitar errores de renderizado
  const sanitizedScanInfo = scanInfo ? {
    status: typeof scanInfo.status === 'string' ? scanInfo.status : 'En progreso',
    progress: typeof scanInfo.progress === 'number' ? scanInfo.progress : null,
    scanType: typeof scanInfo.scanType === 'string' ? scanInfo.scanType : null,
    startTime: scanInfo.startTime || null,
    urlsScanned: typeof scanInfo.urlsScanned === 'number' ? scanInfo.urlsScanned : null,
    currentUrl: typeof scanInfo.currentUrl === 'string' ? scanInfo.currentUrl : null
  } : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Cancelar Escaneo
              </h3>
              <p className="text-sm text-gray-500">
                Esta acción no se puede deshacer
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-4">
            ¿Estás seguro que quieres cancelar el escaneo en progreso?
          </p>
          
          {sanitizedScanInfo && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <span className="font-medium">Estado:</span> {sanitizedScanInfo.status}
                </div>
                {sanitizedScanInfo.progress !== null && (
                  <div>
                    <span className="font-medium">Progreso:</span> {sanitizedScanInfo.progress}%
                  </div>
                )}
                <div>
                  <span className="font-medium">Tipo:</span> {
                    sanitizedScanInfo.scanType === 'full' ? 'Análisis Completo' : 
                    sanitizedScanInfo.scanType === 'quick' ? 'Escaneo Rápido' : 
                    sanitizedScanInfo.scanType || 'N/A'
                  }
                </div>
                {sanitizedScanInfo.startTime && (
                  <div>
                    <span className="font-medium">Iniciado:</span> {
                      new Date(sanitizedScanInfo.startTime).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    }
                  </div>
                )}
                {sanitizedScanInfo.urlsScanned !== null && (
                  <div>
                    <span className="font-medium">URLs Escaneadas:</span> {sanitizedScanInfo.urlsScanned}
                  </div>
                )}
                {sanitizedScanInfo.currentUrl && (
                  <div>
                    <span className="font-medium">URL Actual:</span> 
                    <span className="ml-1 text-xs break-all">{sanitizedScanInfo.currentUrl}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Nota importante:</p>
                <p>El escaneo se detendrá inmediatamente y los resultados parciales se perderán.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            No, continuar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            Sí, cancelar escaneo
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelScanConfirmModal;