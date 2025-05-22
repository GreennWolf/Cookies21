import React, { useState, useEffect } from 'react';

/**
 * Componente para controlar las propiedades de borde
 * (ancho, estilo, color) de forma centralizada
 */
const BorderControl = ({
  borderWidth,
  borderStyle,
  borderColor,
  onBorderChange
}) => {
  // Estados locales para las propiedades
  const [width, setWidth] = useState(parseInt(borderWidth) || 0);
  const [style, setStyle] = useState(borderStyle || 'none');
  const [color, setColor] = useState(borderColor || '#000000');
  
  // Actualizar estado local cuando cambian los props
  useEffect(() => {
    setWidth(parseInt(borderWidth) || 0);
    setStyle(borderStyle || 'none');
    setColor(borderColor || '#000000');
  }, [borderWidth, borderStyle, borderColor]);
  
  // Manejar cambio en el ancho del borde
  const handleWidthChange = (e) => {
    const newWidth = parseInt(e.target.value);
    setWidth(newWidth);
    onBorderChange('borderWidth', `${newWidth}px`);
    
    // Si el borde está en 'none' y se aumenta el ancho, cambiar a 'solid'
    if (newWidth > 0 && style === 'none') {
      setStyle('solid');
      onBorderChange('borderStyle', 'solid');
    }
    
    // Si el borde se pone en 0, cambiar a 'none'
    if (newWidth === 0 && style !== 'none') {
      setStyle('none');
      onBorderChange('borderStyle', 'none');
    }
  };
  
  // Manejar cambio en el estilo del borde
  const handleStyleChange = (e) => {
    const newStyle = e.target.value;
    setStyle(newStyle);
    onBorderChange('borderStyle', newStyle);
    
    // Si se cambia a 'none', poner el ancho en 0
    if (newStyle === 'none' && width !== 0) {
      setWidth(0);
      onBorderChange('borderWidth', '0px');
    }
    
    // Si se cambia desde 'none' a otro estilo y el ancho es 0, poner un ancho mínimo
    if (newStyle !== 'none' && width === 0) {
      setWidth(1);
      onBorderChange('borderWidth', '1px');
    }
  };
  
  // Manejar cambio en el color del borde
  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setColor(newColor);
    onBorderChange('borderColor', newColor);
    
    // Si se cambia el color y el borde está en 'none', cambiar a 'solid'
    if (style === 'none') {
      setStyle('solid');
      onBorderChange('borderStyle', 'solid');
      
      // Si además el ancho es 0, ponerlo en 1px
      if (width === 0) {
        setWidth(1);
        onBorderChange('borderWidth', '1px');
      }
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-medium">Ancho de borde</label>
        <div className="flex items-center gap-1">
          <input
            type="range"
            min="0"
            max="10"
            value={width}
            onChange={handleWidthChange}
            className="flex-1"
          />
          <span className="w-8 text-center text-xs">
            {width}px
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        <label className="block text-xs font-medium">Estilo de borde</label>
        <select
          value={style}
          onChange={handleStyleChange}
          className="w-full p-1 text-xs border rounded"
        >
          <option value="none">Ninguno</option>
          <option value="solid">Sólido</option>
          <option value="dashed">Guiones</option>
          <option value="dotted">Punteado</option>
          <option value="double">Doble</option>
        </select>
      </div>
      
      <div className="space-y-1">
        <label className="block text-xs font-medium">Color de borde</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={handleColorChange}
            className="w-6 h-6 rounded cursor-pointer"
          />
          <input
            type="text"
            value={color}
            onChange={handleColorChange}
            className="flex-1 p-1 text-xs border rounded"
          />
        </div>
      </div>
      
      {/* Vista previa del borde */}
      <div className="pt-2">
        <label className="block text-xs font-medium mb-1">Vista previa</label>
        <div 
          className="h-12 rounded bg-white border"
          style={{
            borderWidth: `${width}px`,
            borderStyle: style,
            borderColor: color
          }}
        />
      </div>
    </div>
  );
};

export default BorderControl;