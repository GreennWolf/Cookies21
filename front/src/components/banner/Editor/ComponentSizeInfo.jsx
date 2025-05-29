import React, { useState, useEffect, useCallback } from 'react';

const ComponentSizeInfo = ({ componentId }) => {
  const [dimensions, setDimensions] = useState({ 
    width: 0, 
    height: 0, 
    widthPercent: 0, 
    heightPercent: 0,
    containerWidth: 0,
    containerHeight: 0
  });
  const [updating, setUpdating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Función para calcular y actualizar las dimensiones
  const updateDimensions = useCallback(() => {
    try {
      const componentEl = document.querySelector(`[data-id="${componentId}"]`);
      if (!componentEl) return;
      
      const containerEl = componentEl.closest('.banner-container');
      if (!containerEl) return;
      
      const compRect = componentEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      
      // Calcular dimensiones en píxeles y porcentajes
      const widthPx = compRect.width;
      const heightPx = compRect.height;
      const widthPercent = (widthPx / containerRect.width) * 100;
      const heightPercent = (heightPx / containerRect.height) * 100;
      
      // Obtener estilos computados
      const computedStyle = window.getComputedStyle(componentEl);
      const paddingTop = parseInt(computedStyle.paddingTop) || 0;
      const paddingRight = parseInt(computedStyle.paddingRight) || 0;
      const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
      const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
      const borderWidth = parseInt(computedStyle.borderWidth) || 0;
      
      setDimensions({
        width: widthPx,
        height: heightPx,
        widthPercent,
        heightPercent,
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        computedStyle: {
          paddingTop,
          paddingRight,
          paddingBottom,
          paddingLeft,
          borderWidth,
          boxSizing: computedStyle.boxSizing,
          position: computedStyle.position,
          display: computedStyle.display
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error al calcular dimensiones:", error);
      }
    }
  }, [componentId]);

  // Actualizar dimensiones al montar el componente y cuando cambia el ID
  useEffect(() => {
    updateDimensions();
    
    // Configurar un intervalo para actualizar periódicamente las dimensiones
    // Esto es útil cuando el componente cambia de tamaño por otras razones
    const interval = setInterval(() => {
      if (!updating) {
        setUpdating(true);
        updateDimensions();
        setUpdating(false);
      }
    }, 1000); // Actualizar cada segundo
    
    return () => clearInterval(interval);
  }, [componentId, updateDimensions, updating]);

  return (
    <div className="mt-2 border-t pt-2">
      <div className="flex justify-between items-center mb-1">
        <div className="text-xs font-medium">Dimensiones Reales</div>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          {showDetails ? 'Menos detalles' : 'Más detalles'}
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-1">
        <div className="text-xs">
          <span className="font-medium">Ancho:</span>
          <span className="ml-1">{dimensions.widthPercent.toFixed(2)}% ({Math.round(dimensions.width)}px)</span>
        </div>
        <div className="text-xs">
          <span className="font-medium">Alto:</span>
          <span className="ml-1">{dimensions.heightPercent.toFixed(2)}% ({Math.round(dimensions.height)}px)</span>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
          <div className="grid grid-cols-2 gap-1 mb-1">
            <div>
              <span className="font-medium">Contenedor:</span>
              <span className="ml-1">{Math.round(dimensions.containerWidth)}x{Math.round(dimensions.containerHeight)}px</span>
            </div>
            <div>
              <span className="font-medium">Box sizing:</span>
              <span className="ml-1">{dimensions.computedStyle?.boxSizing || 'content-box'}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-1 mb-1">
            <div>
              <span className="font-medium">Position:</span>
              <span className="ml-1">{dimensions.computedStyle?.position || 'static'}</span>
            </div>
            <div>
              <span className="font-medium">Display:</span>
              <span className="ml-1">{dimensions.computedStyle?.display || 'block'}</span>
            </div>
          </div>
          
          <div className="mt-1">
            <span className="font-medium">Padding:</span>
            <span className="ml-1">
              {dimensions.computedStyle?.paddingTop || 0}px (T) 
              {dimensions.computedStyle?.paddingRight || 0}px (R) 
              {dimensions.computedStyle?.paddingBottom || 0}px (B) 
              {dimensions.computedStyle?.paddingLeft || 0}px (L)
            </span>
          </div>
          
          <div className="mt-1">
            <span className="font-medium">Border:</span>
            <span className="ml-1">{dimensions.computedStyle?.borderWidth || 0}px</span>
          </div>
        </div>
      )}
      
      <button 
        onClick={updateDimensions}
        className="mt-1 text-xs text-blue-500 hover:text-blue-700 flex items-center"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
          <path d="M23 4V10H17M1 20V14H7M20.49 15C19.2214 19.4886 14.8328 22.2718 10.1286 21.9951C5.42439 21.7184 1.566 18.4011 0.784396 13.8085C0.00279453 9.21599 2.49467 4.73068 6.89856 2.89671C11.3025 1.06274 16.2646 2.33536 19.07 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Actualizar
      </button>
    </div>
  );
};

export default ComponentSizeInfo;