import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Componente de panel colapsable/retráctil
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.id - ID único del panel
 * @param {string} props.title - Título a mostrar en el encabezado
 * @param {React.ReactNode} props.children - Contenido del panel
 * @param {boolean} props.defaultExpanded - Estado inicial (expandido o colapsado)
 * @param {string} props.position - Posición del panel ('left' o 'right')
 * @param {string} props.width - Ancho del panel (ej: '250px' o '20%')
 * @param {Function} props.onToggle - Callback cuando el panel cambia de estado
 * @param {boolean} props.resizable - Si el panel puede ser redimensionado
 * @param {string} props.minWidth - Ancho mínimo si es redimensionable
 * @param {string} props.maxWidth - Ancho máximo si es redimensionable
 * @param {string} props.className - Clases CSS adicionales
 */
const CollapsiblePanel = ({
  id,
  title,
  children,
  defaultExpanded = true,
  position = 'left',
  width = '250px',
  onToggle,
  resizable = false,
  minWidth = '150px',
  maxWidth = '400px',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);
  const dragStartX = useRef(0);
  const startWidth = useRef(0);

  // Efecto para restaurar el estado desde localStorage si existe
  useEffect(() => {
    const savedState = localStorage.getItem(`panel_${id}_expanded`);
    if (savedState !== null) {
      setIsExpanded(savedState === 'true');
    } else {
      // Si no hay estado guardado, usar el valor por defecto
      setIsExpanded(defaultExpanded);
    }
    
    if (resizable) {
      const savedWidth = localStorage.getItem(`panel_${id}_width`);
      if (savedWidth) {
        setCurrentWidth(savedWidth);
      }
    }
    
    // Escuchar eventos de forzar expansión
    const handleForceExpand = (e) => {
      if (e.detail && e.detail.panelId === id) {
        setIsExpanded(true);
      }
    };
    
    window.addEventListener('panel:forceExpand', handleForceExpand);
    
    // Limpieza al desmontar
    return () => {
      window.removeEventListener('panel:forceExpand', handleForceExpand);
    };
  }, [id, resizable, defaultExpanded]);

  // Manejar cambio de estado expandido/colapsado
  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(`panel_${id}_expanded`, newState.toString());
    
    if (onToggle) {
      onToggle(newState);
    }
  };

  // Iniciar redimensionado
  const handleDragStart = (e) => {
    if (!resizable) return;
    
    setIsDragging(true);
    dragStartX.current = e.clientX;
    startWidth.current = panelRef.current.offsetWidth;
    
    // Prevenir selección de texto durante el redimensionado
    document.body.style.userSelect = 'none';
    
    // Agregar listeners globales para manejar el movimiento y finalización
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  // Manejar movimiento durante redimensionado
  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - dragStartX.current;
    // Si está a la derecha, el delta debe ser negativo para crecer hacia la izquierda
    const adjustedDelta = position === 'right' ? -deltaX : deltaX;
    
    // Calcular nuevo ancho
    let newWidth = startWidth.current + adjustedDelta;
    
    // Aplicar límites
    const minWidthPx = parseInt(minWidth, 10);
    const maxWidthPx = parseInt(maxWidth, 10);
    
    if (newWidth < minWidthPx) newWidth = minWidthPx;
    if (newWidth > maxWidthPx) newWidth = maxWidthPx;
    
    setCurrentWidth(`${newWidth}px`);
  };

  // Finalizar redimensionado
  const handleDragEnd = () => {
    setIsDragging(false);
    document.body.style.userSelect = '';
    
    // Guardar nuevo ancho en localStorage
    localStorage.setItem(`panel_${id}_width`, currentWidth);
    
    // Eliminar listeners globales
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  return (
    <div 
      ref={panelRef}
      className={`collapsible-panel ${isExpanded ? 'expanded' : 'collapsed'} panel-${position} ${className}`}
      style={{ width: isExpanded ? currentWidth : 'auto' }}
      data-panel-id={id}
    >
      <div className="panel-header">
        <h3 className="panel-title">{title}</h3>
        <button 
          className="panel-toggle"
          onClick={handleToggle}
          aria-label={isExpanded ? 'Colapsar panel' : 'Expandir panel'}
          title={isExpanded ? 'Colapsar panel' : 'Expandir panel'}
        >
          {position === 'left' ? 
            (isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />) : 
            (isExpanded ? <ChevronRight size={16} /> : <ChevronLeft size={16} />)
          }
        </button>
      </div>
      
      {isExpanded && (
        <>
          <div className="panel-content">
            {children}
          </div>
          
          {resizable && (
            <div 
              className={`panel-resizer panel-resizer-${position}`} 
              onMouseDown={handleDragStart}
              title="Redimensionar panel"
            />
          )}
        </>
      )}
      
      <style>{`
        .collapsible-panel {
          display: flex !important;
          flex-direction: column !important;
          background-color: #ffffff !important;
          height: 100% !important;
          transition: width 0.3s ease !important;
          position: relative !important;
          overflow: hidden !important;
          z-index: 100 !important; /* Asegurar que esté por encima de otros elementos */
        }
        
        .panel-left {
          border-right: 1px solid #e0e0e0;
        }
        
        .panel-right {
          border-left: 1px solid #e0e0e0;
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e0e0e0;
          background-color: #f8f8f8;
          min-width: ${isExpanded ? 'auto' : '0'};
        }
        
        .panel-title {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: ${isExpanded ? 'block' : 'none'};
        }
        
        .collapsed .panel-header {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          height: 100%;
          min-height: 100px;
          width: 40px;
          padding: 1rem 0.5rem;
          justify-content: flex-end;
        }
        
        .collapsed.panel-right .panel-header {
          transform: none;
        }
        
        /* Corregir orientación de las flechas en modo colapsado */
        .collapsed .panel-toggle {
          transform: rotate(180deg);
        }
        
        .collapsed.panel-right .panel-toggle {
          transform: none;
        }
        
        .panel-toggle {
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
        
        .panel-toggle:hover {
          background-color: #f0f0f0;
        }
        
        .panel-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: ${id === 'properties' ? '0' : '0.5rem'};
        }
        
        .panel-resizer {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 5px;
          cursor: col-resize;
          z-index: 10;
          user-select: none;
        }
        
        .panel-resizer-left {
          right: 0;
        }
        
        .panel-resizer-right {
          left: 0;
        }
        
        .panel-resizer:hover {
          background-color: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default CollapsiblePanel;