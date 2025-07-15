import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const CookieDetailsModal = ({ cookie, onClose, onDelete }) => {
  useEffect(() => {
    const handleEsc = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!cookie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800">
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">Detalles de la Cookie</h2>
        <div className="space-y-4">
          <div>
            <strong>Nombre:</strong> {cookie.name}
          </div>
          <div>
            <strong>Proveedor:</strong> {cookie.provider}
          </div>
          <div>
            <strong>Categoría:</strong> {cookie.category}
          </div>
          <div>
            <strong>Descripción:</strong> {cookie.description?.en}
          </div>
          <div>
            <strong>Propósito:</strong> {cookie.purpose?.name || 'N/A'}
          </div>
          {cookie.attributes && (
            <div>
              <strong>Atributos:</strong>
              <ul className="list-disc ml-6">
                <li><strong>Duración:</strong> {cookie.attributes.duration || 'N/A'}</li>
                <li><strong>Tipo:</strong> {cookie.attributes.type || 'N/A'}</li>
                <li><strong>Path:</strong> {cookie.attributes.path || 'N/A'}</li>
                <li><strong>Dominio:</strong> {cookie.attributes.domain || 'N/A'}</li>
                <li><strong>Secure:</strong> {cookie.attributes.secure ? 'Sí' : 'No'}</li>
                <li><strong>HttpOnly:</strong> {cookie.attributes.httpOnly ? 'Sí' : 'No'}</li>
                <li><strong>SameSite:</strong> {cookie.attributes.sameSite || 'N/A'}</li>
              </ul>
            </div>
          )}
          {cookie.detection && (
            <div>
              <strong>Detección:</strong>
              <ul className="list-disc ml-6">
                <li><strong>Método:</strong> {cookie.detection.method || 'N/A'}</li>
                <li><strong>Primera detección:</strong> {cookie.detection.firstDetected ? new Date(cookie.detection.firstDetected).toLocaleString() : 'N/A'}</li>
                <li><strong>Última vez vista:</strong> {cookie.detection.lastSeen ? new Date(cookie.detection.lastSeen).toLocaleString() : 'N/A'}</li>
                <li><strong>Frecuencia:</strong> {cookie.detection.frequency || 'N/A'}</li>
                <li><strong>Patrón:</strong> {cookie.detection.pattern || 'N/A'}</li>
              </ul>
            </div>
          )}
          <div>
            <strong>Script asociado:</strong>
            {cookie.script && cookie.script.type !== 'none' ? (
              <div className="ml-6">
                <div><strong>URL:</strong> {cookie.script.url}</div>
                <div><strong>Tipo:</strong> {cookie.script.type}</div>
                <div><strong>Orden de carga:</strong> {cookie.script.loadOrder}</div>
                {cookie.script.type === 'inline' && (
                  <pre className="bg-gray-100 p-2 mt-2 rounded overflow-x-auto text-xs">
                    {cookie.script.content}
                  </pre>
                )}
              </div>
            ) : (
              'Ninguno'
            )}
          </div>
          <div>
            <strong>Estado:</strong> {cookie.status || 'N/A'}
          </div>
          {cookie.metadata && (
            <div>
              <strong>Metadata:</strong>
              <ul className="list-disc ml-6">
                <li><strong>Creado por:</strong> {cookie.metadata.createdBy || 'N/A'}</li>
                <li><strong>Última modificación por:</strong> {cookie.metadata.lastModifiedBy || 'N/A'}</li>
                <li><strong>Versión:</strong> {cookie.metadata.version || 'N/A'}</li>
              </ul>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => onDelete(cookie._id)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Eliminar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

CookieDetailsModal.propTypes = {
  cookie: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default CookieDetailsModal;