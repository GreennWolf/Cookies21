import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal para configurar la visibilidad y posición de los paneles
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Object} props.panels - Configuración de los paneles
 * @param {Function} props.onPanelVisibilityChange - Callback cuando cambia la visibilidad de un panel
 * @param {Function} props.onPanelWidthChange - Callback cuando cambia el ancho de un panel
 * @param {Function} props.onResetPanels - Callback para restablecer la configuración de paneles
 */
const PanelConfigModal = ({
  isOpen,
  onClose,
  panels,
  onPanelVisibilityChange,
  onPanelWidthChange,
  onResetPanels
}) => {
  if (!isOpen) return null;
  
  // Opciones predefinidas de anchura para los paneles
  const widthOptions = [
    { label: 'Estrecho', value: '200px' },
    { label: 'Medio', value: '280px' },
    { label: 'Ancho', value: '350px' }
  ];
  
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
            Configura qué paneles quieres mostrar y sus dimensiones.
          </p>
          
          <div className="panel-list">
            {Object.entries(panels).map(([id, panel]) => (
              <div key={id} className="panel-config-item">
                <div className="panel-visibility">
                  <input
                    type="checkbox"
                    id={`toggle-${id}`}
                    checked={panel.visible}
                    onChange={() => onPanelVisibilityChange(id, !panel.visible)}
                    className="visibility-checkbox"
                  />
                  <label htmlFor={`toggle-${id}`} className="panel-label">
                    {panel.title}
                  </label>
                </div>
                
                {panel.resizable && panel.visible && (
                  <div className="panel-width-control">
                    <label htmlFor={`width-${id}`} className="width-label">Ancho:</label>
                    <select
                      id={`width-${id}`}
                      value={panel.width}
                      onChange={(e) => onPanelWidthChange(id, e.target.value)}
                      className="width-select"
                    >
                      {widthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="modal-tips">
            <h3 className="tips-title">Consejos:</h3>
            <ul className="tips-list">
              <li>Puedes colapsar cualquier panel haciendo clic en el botón de flecha en su encabezado.</li>
              <li>Los paneles redimensionables pueden ajustarse arrastrando su borde.</li>
              <li>El botón de vista previa oculta todos los paneles temporalmente.</li>
            </ul>
          </div>
        </div>
        
        <div className="modal-footer">
          {onResetPanels && (
            <button 
              onClick={onResetPanels} 
              className="btn-secondary"
              aria-label="Restablecer"
            >
              Restablecer predeterminado
            </button>
          )}
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
        
        .panel-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .panel-config-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background-color: #f9f9f9;
        }
        
        .panel-visibility {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .visibility-checkbox {
          width: 1rem;
          height: 1rem;
        }
        
        .panel-label {
          font-weight: 500;
          font-size: 0.9375rem;
        }
        
        .panel-width-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-left: 1.5rem;
        }
        
        .width-label {
          font-size: 0.8125rem;
          color: #6b7280;
        }
        
        .width-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 0.8125rem;
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
        
        .btn-secondary {
          padding: 0.5rem 1rem;
          background-color: #ffffff;
          color: #6b7280;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .btn-secondary:hover {
          background-color: #f9f9f9;
        }
      `}</style>
    </div>
  );
};

export default PanelConfigModal;