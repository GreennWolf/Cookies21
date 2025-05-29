import React from 'react';
import { X, Monitor } from 'lucide-react';

const SimplePanelConfigModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="panel-config-modal-overlay">
      <div className="panel-config-modal">
        <div className="modal-header">
          <h2>Configuración de Paneles</h2>
          <button onClick={onClose} className="close-button" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        
        <div className="modal-content">
          <p className="modal-description">
            Ajuste la configuración de los paneles del editor
          </p>
          
          <div className="panel-options">
            <div className="option-item">
              <span className="option-label">Panel de Componentes:</span>
              <label className="option-toggle">
                <input type="checkbox" defaultChecked={true} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="option-item">
              <span className="option-label">Panel de Capas:</span>
              <label className="option-toggle">
                <input type="checkbox" defaultChecked={true} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="option-item">
              <span className="option-label">Posición:</span>
              <select className="option-select">
                <option value="right">Derecha</option>
                <option value="left">Izquierda</option>
              </select>
            </div>
          </div>
          
          <div className="modal-tips">
            <h3 className="tips-title">Consejos:</h3>
            <ul className="tips-list">
              <li>Puedes mover el panel de capas al lado que prefieras</li>
              <li>Usa el botón de capas para mostrar/ocultar el panel rápidamente</li>
              <li>El panel de propiedades aparece al seleccionar un componente</li>
            </ul>
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
        .panel-config-modal-overlay {
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
        
        .panel-config-modal {
          background-color: #ffffff;
          border-radius: 8px;
          width: 450px;
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
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .panel-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .option-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background-color: #f9f9f9;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }
        
        .option-label {
          font-weight: 500;
          font-size: 0.9375rem;
        }
        
        .option-toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        
        .option-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }
        
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        .option-toggle input:checked + .toggle-slider {
          background-color: #4a6cf7;
        }
        
        .option-toggle input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }
        
        .option-select {
          padding: 0.375rem 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 0.875rem;
          background-color: white;
        }
        
        .modal-tips {
          margin-top: 1.5rem;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background-color: #f0f9ff;
        }
        
        .tips-title {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0369a1;
        }
        
        .tips-list {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.8125rem;
          color: #4b5563;
        }
        
        .tips-list li {
          margin-bottom: 0.25rem;
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

export default SimplePanelConfigModal;