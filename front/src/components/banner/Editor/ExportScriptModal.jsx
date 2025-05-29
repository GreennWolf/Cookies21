import React, { useState } from 'react';
import { X, ClipboardCopy, Check } from 'lucide-react';

/**
 * Modal para exportar el script del banner
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {string} props.script - El script a mostrar y copiar
 */
const ExportScriptModal = ({
  isOpen,
  onClose,
  script
}) => {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;
  
  const handleCopyScript = () => {
    navigator.clipboard.writeText(script)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Error al copiar el script:', err);
        alert('No se pudo copiar el script. Por favor, selecciónalo manualmente.');
      });
  };
  
  return (
    <div className="export-script-modal-overlay">
      <div className="export-script-modal">
        <div className="modal-header">
          <h2>Exportar Script del Banner</h2>
          <button onClick={onClose} className="close-button" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        
        <div className="modal-content">
          <p className="modal-description">
            Copia este script y colócalo en el <code>&lt;head&gt;</code> de tu sitio web para integrar el banner de cookies.
          </p>
          
          <div className="script-container">
            <div className="script-header">
              <span className="script-label">Script HTML</span>
              <button 
                onClick={handleCopyScript} 
                className="copy-button"
                title="Copiar al portapapeles"
              >
                {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="script-content">
              <code>{script}</code>
            </pre>
          </div>
          
          <div className="modal-tips">
            <h3 className="tips-title">Instrucciones de integración:</h3>
            <ol className="tips-list">
              <li>Copia el script completo haciendo clic en el botón "Copiar".</li>
              <li>Pega el script en la sección <code>&lt;head&gt;</code> de tu sitio web.</li>
              <li>El banner se cargará automáticamente cuando los visitantes accedan a tu sitio.</li>
              <li>El banner se mostrará solo una vez por sesión a menos que el usuario borre sus cookies.</li>
            </ol>
            <p className="note">
              <strong>Nota:</strong> Los cambios que hagas en el banner después de copiar este script se aplicarán automáticamente en tu sitio web.
            </p>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose} 
            className="btn-primary"
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .export-script-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1100;
        }
        
        .export-script-modal {
          background-color: #ffffff;
          border-radius: 8px;
          width: 700px;
          max-width: 90%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .close-button:hover {
          background-color: #f0f0f0;
        }
        
        .modal-content {
          padding: 1rem;
          overflow-y: auto;
          flex: 1;
        }
        
        .modal-description {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #4b5563;
          font-size: 0.9375rem;
        }
        
        .modal-description code {
          background-color: #f1f5f9;
          padding: 0.125rem 0.25rem;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.875rem;
        }
        
        .script-container {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        
        .script-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background-color: #f8f8f8;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .script-label {
          font-weight: 500;
          font-size: 0.875rem;
          color: #4b5563;
        }
        
        .copy-button {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background-color: #f0f9ff;
          color: #0369a1;
          border: 1px solid #bae6fd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .copy-button:hover {
          background-color: #e0f2fe;
        }
        
        .script-content {
          background-color: #f9fafb;
          padding: 1rem;
          margin: 0;
          overflow-x: auto;
          white-space: pre-wrap;
          font-family: monospace;
          font-size: 0.8125rem;
          line-height: 1.5;
          color: #334155;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .modal-tips {
          margin-top: 1rem;
          padding: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background-color: #f0f9ff;
        }
        
        .tips-title {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0369a1;
        }
        
        .tips-list {
          margin: 0;
          padding-left: 1.5rem;
          font-size: 0.875rem;
          color: #4b5563;
        }
        
        .tips-list li {
          margin-bottom: 0.5rem;
        }
        
        .tips-list code {
          background-color: #f1f5f9;
          padding: 0.125rem 0.25rem;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.8125rem;
        }
        
        .note {
          margin-top: 1rem;
          font-size: 0.8125rem;
          color: #4b5563;
          padding-left: 0.25rem;
        }
        
        .modal-footer {
          padding: 1rem;
          border-top: 1px solid #e0e0e0;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        
        .btn-primary {
          padding: 0.5rem 1rem;
          background-color: #4a6cf7;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .btn-primary:hover {
          background-color: #3a5ce5;
        }
      `}</style>
    </div>
  );
};

export default ExportScriptModal;