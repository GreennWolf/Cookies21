import React from 'react';
import { Box, Layout, Grid3x3, Target } from 'lucide-react';

/**
 * Indicador visual para zonas de drop en contenedores
 * FASE 4 - Componente especializado para feedback de drag & drop
 */
function DropZoneIndicator({ 
  displayMode, 
  position, 
  showPosition = true,
  size = 'normal' // 'small', 'normal', 'large'
}) {
  const sizeClasses = {
    small: { indicator: 16, icon: 12, text: 'text-xs' },
    normal: { indicator: 20, icon: 14, text: 'text-sm' },
    large: { indicator: 24, icon: 16, text: 'text-base' }
  };
  
  const currentSize = sizeClasses[size] || sizeClasses.normal;
  
  // Obtener el ícono apropiado según el modo
  const getIcon = () => {
    switch (displayMode) {
      case 'flex':
        return <Layout size={currentSize.icon} />;
      case 'grid':
        return <Grid3x3 size={currentSize.icon} />;
      case 'libre':
      default:
        return <Target size={currentSize.icon} />;
    }
  };
  
  // Obtener el color apropiado según el modo
  const getColor = () => {
    switch (displayMode) {
      case 'flex':
        return '#10b981'; // Verde
      case 'grid':
        return '#8b5cf6'; // Morado
      case 'libre':
      default:
        return '#3b82f6'; // Azul
    }
  };
  
  const color = getColor();
  
  return (
    <>
      {/* Indicador de posición circular */}
      {showPosition && position && (
        <div
          style={{
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${currentSize.indicator}px`,
            height: `${currentSize.indicator}px`,
            backgroundColor: `${color}CC`, // Con transparencia
            border: `2px solid ${color}`,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1000,
            animation: 'pulse 1.5s infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ color: 'white' }}>
            {getIcon()}
          </div>
        </div>
      )}
      
      {/* Información del modo de drop */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: `${color}E6`, // Con más transparencia
        color: 'white',
        padding: size === 'small' ? '3px 6px' : '6px 12px',
        borderRadius: '6px',
        fontSize: currentSize.text,
        fontWeight: 'bold',
        pointerEvents: 'none',
        zIndex: 1001,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}>
        {getIcon()}
        <span>
          {displayMode === 'libre' && 'Posición libre'}
          {displayMode === 'flex' && 'Flexbox'}
          {displayMode === 'grid' && 'Grid'}
        </span>
      </div>
    </>
  );
}

export default DropZoneIndicator;