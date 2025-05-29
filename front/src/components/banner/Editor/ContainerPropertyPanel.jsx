import React, { useState } from 'react';
import { Box, Grid3x3, Layout, Move, Info, Sparkles, RotateCcw } from 'lucide-react';

/**
 * Panel especializado para configurar propiedades de contenedores
 * FASE 3 - Componente dedicado para una mejor organización de controles
 */
// Presets predefinidos para contenedores
const CONTAINER_PRESETS = {
  flex: {
    'horizontal-center': {
      name: 'Horizontal Centrado',
      description: 'Elementos en fila, centrados horizontalmente',
      config: {
        displayMode: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px'
      }
    },
    'horizontal-spaced': {
      name: 'Horizontal Espaciado',
      description: 'Elementos distribuidos con espacio entre ellos',
      config: {
        displayMode: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px'
      }
    },
    'vertical-stack': {
      name: 'Pila Vertical',
      description: 'Elementos apilados verticalmente',
      config: {
        displayMode: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        gap: '12px'
      }
    }
  },
  grid: {
    'two-columns': {
      name: '2 Columnas',
      description: 'Diseño en 2 columnas iguales',
      config: {
        displayMode: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'auto',
        justifyItems: 'flex-start',
        alignItems: 'flex-start',
        gap: '15px'
      }
    },
    'three-columns': {
      name: '3 Columnas',
      description: 'Diseño en 3 columnas iguales',
      config: {
        displayMode: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'auto',
        justifyItems: 'center',
        alignItems: 'flex-start',
        gap: '12px'
      }
    },
    'responsive-cards': {
      name: 'Tarjetas Responsivas',
      description: 'Tarjetas que se adaptan al espacio disponible',
      config: {
        displayMode: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gridTemplateRows: 'auto',
        justifyItems: 'stretch',
        alignItems: 'flex-start',
        gap: '20px'
      }
    }
  }
};

function ContainerPropertyPanel({ 
  component, 
  deviceView, 
  onContainerConfigChange 
}) {
  // Obtener configuración actual del contenedor
  const containerConfig = component.containerConfig?.[deviceView] || {};
  const displayMode = containerConfig.displayMode || 'libre';
  
  // Estado para mostrar/ocultar presets
  const [showPresets, setShowPresets] = useState(false);

  // Función para aplicar un preset
  const applyPreset = (preset) => {
    console.log(`🎨 Aplicando preset: ${preset.name}`, preset.config);
    
    try {
      Object.entries(preset.config).forEach(([key, value]) => {
        console.log(`   - Configurando ${key}: ${value}`);
        onContainerConfigChange(key, value);
      });
    } catch (error) {
      console.error('❌ Error al aplicar preset:', error);
    }
    
    setShowPresets(false);
  };

  // Función para resetear a modo libre
  const resetToLibre = () => {
    console.log('🔄 Reseteando contenedor a modo libre');
    try {
      onContainerConfigChange('displayMode', 'libre');
      console.log('✅ Contenedor reseteado a modo libre');
    } catch (error) {
      console.error('❌ Error al resetear a modo libre:', error);
    }
    setShowPresets(false);
  };

  // Función para detectar si un preset está activo
  const getActivePreset = () => {
    if (displayMode === 'libre') return null;
    
    const allPresets = displayMode === 'flex' ? CONTAINER_PRESETS.flex : CONTAINER_PRESETS.grid;
    
    for (const [key, preset] of Object.entries(allPresets)) {
      const isMatch = Object.entries(preset.config).every(([configKey, configValue]) => {
        if (configKey === 'displayMode') return true; // Ya sabemos que coincide
        return containerConfig[configKey] === configValue;
      });
      
      if (isMatch) return { key, preset };
    }
    
    return null;
  };

  const activePreset = getActivePreset();

  return (
    <div className="space-y-4 border-t pt-4">
      {/* Encabezado del panel con botones de acción */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box size={16} className="text-blue-600" />
          <h4 className="font-medium text-sm text-gray-800">Configuración de Contenedor</h4>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Botón de presets */}
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showPresets 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
            title="Plantillas predefinidas"
          >
            <Sparkles size={14} />
          </button>
          
          {/* Botón de reset */}
          {displayMode !== 'libre' && (
            <button
              onClick={resetToLibre}
              className="p-1.5 rounded-lg border bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Resetear a modo libre"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Panel de presets desplegable */}
      {showPresets && (
        <div className="space-y-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-700">
            <Sparkles size={14} />
            <span className="font-medium text-sm">Plantillas Predefinidas</span>
          </div>
          
          {/* Presets de Flexbox */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Flexbox</h5>
            <div className="space-y-1">
              {Object.entries(CONTAINER_PRESETS.flex).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(preset)}
                  className="w-full p-2 text-left bg-white border border-gray-200 rounded hover:bg-green-50 hover:border-green-200 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-800 group-hover:text-green-700">
                        {preset.name}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-green-600">
                        {preset.description}
                      </div>
                    </div>
                    <Layout size={14} className="text-gray-400 group-hover:text-green-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Presets de Grid */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Grid</h5>
            <div className="space-y-1">
              {Object.entries(CONTAINER_PRESETS.grid).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(preset)}
                  className="w-full p-2 text-left bg-white border border-gray-200 rounded hover:bg-purple-50 hover:border-purple-200 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-800 group-hover:text-purple-700">
                        {preset.name}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-purple-600">
                        {preset.description}
                      </div>
                    </div>
                    <Grid3x3 size={14} className="text-gray-400 group-hover:text-purple-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={() => setShowPresets(false)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cerrar plantillas
            </button>
          </div>
        </div>
      )}

      {/* Indicador de preset activo */}
      {activePreset && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Plantilla activa: {activePreset.preset.name}
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-0.5">
            {activePreset.preset.description}
          </p>
        </div>
      )}

      {/* Selector de modo de display */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Modo de Visualización</label>
        <div className="grid grid-cols-3 gap-2">
          
          {/* Modo Libre */}
          <button
            onClick={() => {
              console.log('🖱️ Click en botón modo libre');
              onContainerConfigChange('displayMode', 'libre');
            }}
            className={`group relative p-3 text-xs border-2 rounded-lg flex flex-col items-center gap-2 transition-all duration-200 ${
              displayMode === 'libre'
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-600'
            }`}
            title="Posicionamiento libre - Los componentes pueden colocarse en cualquier posición"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <rect x="3" y="3" width="6" height="6" rx="1"/>
              <rect x="15" y="8" width="6" height="6" rx="1"/>
              <rect x="8" y="15" width="6" height="6" rx="1"/>
            </svg>
            <span className="font-medium">Libre</span>
            <span className="text-xs text-gray-500 text-center leading-tight">Posición absoluta</span>
            
            {/* Indicador de modo activo */}
            {displayMode === 'libre' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            )}
          </button>
          
          {/* Modo Flex */}
          <button
            onClick={() => {
              console.log('🖱️ Click en botón modo flex');
              onContainerConfigChange('displayMode', 'flex');
            }}
            className={`group relative p-3 text-xs border-2 rounded-lg flex flex-col items-center gap-2 transition-all duration-200 ${
              displayMode === 'flex'
                ? 'bg-green-50 border-green-300 text-green-700 shadow-sm'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-600'
            }`}
            title="Diseño flexible - Los componentes se organizan automáticamente"
          >
            <Layout size={20} className="flex-shrink-0" />
            <span className="font-medium">Flex</span>
            <span className="text-xs text-gray-500 text-center leading-tight">Diseño flexible</span>
            
            {/* Indicador de modo activo */}
            {displayMode === 'flex' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            )}
          </button>
          
          {/* Modo Grid */}
          <button
            onClick={() => {
              console.log('🖱️ Click en botón modo grid');
              onContainerConfigChange('displayMode', 'grid');
            }}
            className={`group relative p-3 text-xs border-2 rounded-lg flex flex-col items-center gap-2 transition-all duration-200 ${
              displayMode === 'grid'
                ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-600'
            }`}
            title="Diseño en cuadrícula - Los componentes se organizan en filas y columnas"
          >
            <Grid3x3 size={20} className="flex-shrink-0" />
            <span className="font-medium">Grid</span>
            <span className="text-xs text-gray-500 text-center leading-tight">Cuadrícula</span>
            
            {/* Indicador de modo activo */}
            {displayMode === 'grid' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Controles específicos para modo Flex */}
      {displayMode === 'flex' && (
        <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <Layout size={14} />
            <span className="font-medium text-sm">Configuración Flexbox</span>
          </div>
          
          {/* Dirección del flex */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Dirección</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onContainerConfigChange('flexDirection', 'row')}
                className={`p-2 text-sm border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  (containerConfig.flexDirection || 'row') === 'row'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Move size={14} className="rotate-0" />
                <span>Fila</span>
              </button>
              <button
                onClick={() => onContainerConfigChange('flexDirection', 'column')}
                className={`p-2 text-sm border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  (containerConfig.flexDirection || 'row') === 'column'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Move size={14} className="rotate-90" />
                <span>Columna</span>
              </button>
            </div>
          </div>

          {/* Justificar contenido */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Justificar Contenido</label>
            <select
              value={containerConfig.justifyContent || 'flex-start'}
              onChange={(e) => onContainerConfigChange('justifyContent', e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="flex-start">Inicio</option>
              <option value="center">Centro</option>
              <option value="flex-end">Final</option>
              <option value="space-between">Espacio Entre</option>
              <option value="space-around">Espacio Alrededor</option>
              <option value="space-evenly">Espacio Uniforme</option>
            </select>
          </div>

          {/* Alinear elementos */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Alinear Elementos</label>
            <select
              value={containerConfig.alignItems || 'stretch'}
              onChange={(e) => onContainerConfigChange('alignItems', e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="stretch">Estirar</option>
              <option value="flex-start">Inicio</option>
              <option value="center">Centro</option>
              <option value="flex-end">Final</option>
              <option value="baseline">Línea Base</option>
            </select>
          </div>

          {/* Espaciado (Gap) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Espaciado (Gap)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="50"
                value={parseInt(containerConfig.gap) || 10}
                onChange={(e) => onContainerConfigChange('gap', `${e.target.value}px`)}
                className="flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider-green"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${((parseInt(containerConfig.gap) || 10) * 2)}%, #dcfce7 ${((parseInt(containerConfig.gap) || 10) * 2)}%, #dcfce7 100%)`
                }}
              />
              <span className="w-12 text-center text-sm font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                {parseInt(containerConfig.gap) || 10}px
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Controles específicos para modo Grid */}
      {displayMode === 'grid' && (
        <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 text-purple-700">
            <Grid3x3 size={14} />
            <span className="font-medium text-sm">Configuración Grid</span>
          </div>
          
          {/* Columnas */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Columnas</label>
            <select
              value={containerConfig.gridTemplateColumns || 'repeat(2, 1fr)'}
              onChange={(e) => onContainerConfigChange('gridTemplateColumns', e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="1fr">1 Columna</option>
              <option value="repeat(2, 1fr)">2 Columnas</option>
              <option value="repeat(3, 1fr)">3 Columnas</option>
              <option value="repeat(4, 1fr)">4 Columnas</option>
              <option value="repeat(auto-fit, minmax(150px, 1fr))">Auto-ajustar (mín. 150px)</option>
              <option value="repeat(auto-fit, minmax(200px, 1fr))">Auto-ajustar (mín. 200px)</option>
            </select>
          </div>

          {/* Filas */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Filas</label>
            <select
              value={containerConfig.gridTemplateRows || 'auto'}
              onChange={(e) => onContainerConfigChange('gridTemplateRows', e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="auto">Automático</option>
              <option value="repeat(2, 1fr)">2 Filas Iguales</option>
              <option value="repeat(3, 1fr)">3 Filas Iguales</option>
              <option value="repeat(4, 1fr)">4 Filas Iguales</option>
              <option value="100px auto">Fija (100px) + Auto</option>
              <option value="auto 100px">Auto + Fija (100px)</option>
              <option value="1fr 2fr">Proporción 1:2</option>
            </select>
          </div>

          {/* Grid de controles de alineación */}
          <div className="grid grid-cols-2 gap-3">
            {/* Justificar elementos */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Justificar</label>
              <select
                value={containerConfig.justifyItems || 'flex-start'}
                onChange={(e) => onContainerConfigChange('justifyItems', e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="flex-start">Inicio</option>
                <option value="center">Centro</option>
                <option value="flex-end">Final</option>
                <option value="stretch">Estirar</option>
                <option value="baseline">Línea base</option>
              </select>
            </div>

            {/* Alinear elementos */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Alinear</label>
              <select
                value={containerConfig.alignItems || 'flex-start'}
                onChange={(e) => onContainerConfigChange('alignItems', e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="flex-start">Inicio</option>
                <option value="center">Centro</option>
                <option value="flex-end">Final</option>
                <option value="stretch">Estirar</option>
                <option value="baseline">Línea base</option>
              </select>
            </div>
          </div>

          {/* Espaciado (Gap) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Espaciado (Gap)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="50"
                value={parseInt(containerConfig.gap) || 10}
                onChange={(e) => onContainerConfigChange('gap', `${e.target.value}px`)}
                className="flex-1 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider-purple"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((parseInt(containerConfig.gap) || 10) * 2)}%, #e9d5ff ${((parseInt(containerConfig.gap) || 10) * 2)}%, #e9d5ff 100%)`
                }}
              />
              <span className="w-12 text-center text-sm font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded">
                {parseInt(containerConfig.gap) || 10}px
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Información para modo libre */}
      {displayMode === 'libre' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Modo Libre Activado</p>
              <p className="text-blue-600 leading-relaxed">
                En este modo, los componentes se posicionan de forma absoluta. Puedes arrastrarlos libremente 
                dentro del contenedor y usar los controles de posición para ajustes precisos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Información del dispositivo actual */}
      <div className="pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Configuración para: <span className="font-medium capitalize text-gray-700">{deviceView}</span>
        </div>
      </div>
    </div>
  );
}

export default ContainerPropertyPanel;