/* /src/components/domain/DomainModal.jsx */
import React, { useEffect } from 'react';
import DomainForm from './DomainForm';

const DomainModal = ({ onClose }) => {
  // Cerrar el modal al presionar Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative max-h-[80vh] overflow-y-auto">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          onClick={() => onClose()}
        >
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">Crear Dominio</h2>
        <DomainForm onSuccess={(newDomain) => onClose(newDomain)} />
      </div>
    </div>
  );
};

export default DomainModal;
