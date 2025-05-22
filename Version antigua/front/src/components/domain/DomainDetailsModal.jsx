/* /src/components/domain/DomainDetailsModal.jsx */
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const DomainDetailsModal = ({ domain, onClose }) => {
  // Cerrar el modal con Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!domain) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">Detalles del Dominio</h2>
        <div className="space-y-6">
          <div>
            <strong>Dominio:</strong> {domain.domain}
          </div>
          <div>
            <strong>Estado:</strong> {domain.status}
          </div>
          <div>
            <strong>Configuración de Diseño:</strong>
            <ul className="list-disc ml-6 mt-2">
              <li className='p-2'>
                <span className="font-semibold">Color Primario:</span>{' '}
                <span
                  style={{ backgroundColor: domain.settings?.design?.theme?.primary || '#235C88' }}
                  className="px-2 py-1 rounded text-white"
                >
                  {domain.settings?.design?.theme?.primary || '#235C88'}
                </span>
              </li>
              <li className='p-2'>
                <span className="font-semibold">Color Secundario:</span>{' '}
                <span
                  style={{ backgroundColor: domain.settings?.design?.theme?.secondary || '#F0F0F0' }}
                  className="px-2 py-1 rounded"
                >
                  {domain.settings?.design?.theme?.secondary || '#F0F0F0'}
                </span>
              </li>
              <li className='p-2'>
                <span className="font-semibold">Color de Fondo:</span>{' '}
                <span
                  style={{ backgroundColor: domain.settings?.design?.theme?.background || '#F0F0F0' }}
                  className="px-2 py-1 rounded"
                >
                  {domain.settings?.design?.theme?.background || '#F0F0F0'}
                </span>
              </li>
              <li className='p-2'>
                <span className="font-semibold">Color de Texto:</span>{' '}
                <span
                  style={{ backgroundColor: domain.settings?.design?.theme?.text || '#181818' }}
                  className="px-2 py-1 rounded text-white"
                >
                  {domain.settings?.design?.theme?.text || '#181818'}
                </span>
              </li>
              <li className='p-2'>
                <span className="font-semibold">Posición:</span> {domain.settings?.design?.position}
              </li>
              <li className='p-2'>
                <span className="font-semibold">Layout:</span> {domain.settings?.design?.layout}
              </li>
            </ul>
          </div>
          <div>
            <strong>Configuración de Escaneo:</strong>
            <ul className="list-disc ml-6 mt-2">
              <li>
                <span className="font-semibold">Auto Detectar:</span>{' '}
                {domain.settings?.scanning?.autoDetect ? 'Sí' : 'No'}
              </li>
              <li>
                <span className="font-semibold">Intervalo:</span>{' '}
                {domain.settings?.scanning?.interval} horas
              </li>
              <li>
                <span className="font-semibold">Último Escaneo:</span>{' '}
                {domain.settings?.scanning?.lastScan
                  ? new Date(domain.settings.scanning.lastScan).toLocaleString()
                  : 'Nunca'}
              </li>
            </ul>
          </div>
          {/* Aquí podrías agregar más secciones, por ejemplo: propósitos, vendors, configuración del banner, etc. */}
        </div>
      </div>
    </div>
  );
};

DomainDetailsModal.propTypes = {
  domain: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DomainDetailsModal;
