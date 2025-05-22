import React, { useEffect, useState, useRef } from 'react';
import { useBannerEditor} from './hooks/useBannerEditor';
import BannerSidebar from './BannerSidebar';
import BannerCanvas from './BannerCanvas';
import BannerPropertyPanel from './BannerPropertyPanel';
import BannerPreview from './BannerPreview';
import { Save, Eye, Undo, Redo, Monitor, Smartphone, Tablet, ChevronLeft, X, Code, ClipboardCopy } from 'lucide-react';
import { exportEmbeddableScript } from '../../../api/bannerTemplate';

function parseDimension(dim) {
  if (!dim || dim === 'auto') return { value: '', unit: 'auto' };
  if (dim.endsWith('px')) {
    return { value: dim.slice(0, -2), unit: 'px' };
  } else if (dim.endsWith('%')) {
    return { value: dim.slice(0, -1), unit: '%' };
  } else {
    return { value: dim, unit: 'px' };
  }
}

function BannerEditor({ initialConfig, onSave }) {
  const {
    bannerConfig,
    setInitialConfig,
    selectedComponent,
    setSelectedComponent,
    addComponent,
    deleteComponent,
    updateComponentContent,
    updateComponentStyleForDevice,
    updateComponentPositionForDevice,
    handleUpdateLayoutForDevice,
    previewData,
    handlePreview,
    handleSave,
    handleUpdate,
    deviceView,
    setDeviceView,
    showPreview,
    setShowPreview
  } = useBannerEditor();

  const [widthValue, setWidthValue] = useState('');
  const [widthUnit, setWidthUnit] = useState('auto');
  const [heightValue, setHeightValue] = useState('');
  const [heightUnit, setHeightUnit] = useState('auto');
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [sidebarMode, setSidebarMode] = useState('components'); // 'components' o 'properties'
  const [bannerName, setBannerName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  // Estados para el modal de exportación de script
  const [scriptExport, setScriptExport] = useState({ show: false, script: '' });
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  
  // Ref para evitar llamadas duplicadas
  const saveInProgressRef = useRef(false);

  // Este efecto maneja la inicialización con initialConfig
  useEffect(() => {
    if (initialConfig) {
      console.log('🔄 BannerEditor recibió initialConfig:', initialConfig);
      // Inicializar sin seleccionar automáticamente un componente
      setInitialConfig(initialConfig, false); // Segundo parámetro false para no autoseleccionar
      setBannerName(initialConfig.name || '');
    }
  }, [initialConfig, setInitialConfig]);

  // Este efecto actualiza las dimensiones cuando cambia bannerConfig o deviceView
  useEffect(() => {
    if (bannerConfig?.layout?.[deviceView]) {
      console.log(`📐 Actualizando dimensiones para ${deviceView}:`, bannerConfig.layout[deviceView]);
      
      const parsedWidth = parseDimension(bannerConfig.layout[deviceView]?.width);
      setWidthValue(parsedWidth.value);
      setWidthUnit(parsedWidth.unit);

      const parsedHeight = parseDimension(bannerConfig.layout[deviceView]?.height);
      setHeightValue(parsedHeight.value);
      setHeightUnit(parsedHeight.unit);
    }
  }, [bannerConfig.layout, deviceView]);

  // Este efecto cambia el modo del sidebar cuando se selecciona un componente
  useEffect(() => {
    if (selectedComponent) {
      setSidebarMode('properties');
    }
  }, [selectedComponent]);

  // Este efecto cierra el panel de propiedades cuando se cambia a vista previa
  useEffect(() => {
    if (showPreview) {
      setShowPropertyPanel(false);
    }
  }, [showPreview]);

  const getDeviceWidth = () => {
    switch (deviceView) {
      case 'mobile':
        return 'max-w-sm';
      case 'tablet':
        return 'max-w-2xl';
      default:
        return 'w-full';
    }
  };

  const handleWidthUnitChange = (e) => {
    const unit = e.target.value;
    setWidthUnit(unit);
    if (unit === 'auto') {
      setWidthValue('');
      handleUpdateLayoutForDevice(deviceView, 'width', 'auto');
    } else if (widthValue !== '') {
      handleUpdateLayoutForDevice(deviceView, 'width', `${widthValue}${unit}`);
    }
  };

  const handleWidthValueChange = (e) => {
    const value = e.target.value;
    setWidthValue(value);
    if (widthUnit !== 'auto') {
      handleUpdateLayoutForDevice(deviceView, 'width', value ? `${value}${widthUnit}` : '');
    }
  };

  const handleHeightUnitChange = (e) => {
    const unit = e.target.value;
    setHeightUnit(unit);
    if (unit === 'auto') {
      setHeightValue('');
      handleUpdateLayoutForDevice(deviceView, 'height', 'auto');
    } else if (heightValue !== '') {
      handleUpdateLayoutForDevice(deviceView, 'height', `${heightValue}${unit}`);
    }
  };

  const handleHeightValueChange = (e) => {
    const value = e.target.value;
    setHeightValue(value);
    if (heightUnit !== 'auto') {
      handleUpdateLayoutForDevice(deviceView, 'height', value ? `${value}${heightUnit}` : '');
    }
  };

  const onAddChild = (gridId) => {
    const newChild = {
      id: `child-${Date.now()}`,
      type: 'text',
      content: 'Nuevo Elemento',
      style: {
        desktop: { padding: '8px', border: '1px solid #ccc', fontSize: '14px' },
        tablet: { padding: '8px', border: '1px solid #ccc', fontSize: '12px' },
        mobile: { padding: '8px', border: '1px solid #ccc', fontSize: '10px' }
      },
      position: {
        desktop: { top: '0px', left: '0px' },
        tablet: { top: '0px', left: '0px' },
        mobile: { top: '0px', left: '0px' }
      }
    };
    setInitialConfig(prev => ({
      ...prev,
      components: prev.components.map(comp => {
        if (comp.id === gridId) {
          return {
            ...comp,
            children: comp.children ? [...comp.children, newChild] : [newChild]
          };
        }
        return comp;
      })
    }));
  };

  // Manejador para selección de componente
  const handleComponentSelect = (component) => {
    setSelectedComponent(component);
    setSidebarMode('properties');
  };

  // Manejador para volver al sidebar de componentes
  const handleBackToComponents = () => {
    setSidebarMode('components');
  };

  const handleSaveClick = async (e) => {
    // Prevenir acción por defecto si existe evento
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    // Verificar si ya hay un guardado en progreso (previene dobles envíos)
    if (saveInProgressRef.current || isSaving) {
      console.log('⚠️ Ya hay un guardado en progreso, ignorando esta solicitud');
      return;
    }
  
    try {
      // Validar que hay un nombre
      if (!bannerName.trim()) {
        setNameError(true);
        return;
      }
      
      // Marcar que el guardado está en progreso
      saveInProgressRef.current = true;
      setIsSaving(true);
      setSaveError(null);
      console.log('🔄 Iniciando proceso de guardado...');
      
      // Configuración con nombre actualizado
      const configToSave = {
        ...bannerConfig,
        name: bannerName.trim()
      };
      
      let savedTemplate;
      
      // Determinar si es una creación o actualización
      if (initialConfig && initialConfig._id) {
        // Actualizar banner existente usando el hook
        console.log(`📤 Actualizando banner existente ${initialConfig._id}`);
        savedTemplate = await handleUpdate(initialConfig._id, configToSave);
      } else {
        // Crear nuevo banner usando el hook
        console.log('📤 Creando nuevo banner');
        // Eliminar _id para evitar conflictos
        const { _id, ...configWithoutId } = configToSave;
        savedTemplate = await handleSave(configWithoutId);
      }
      
      console.log('✅ Banner guardado con éxito:', savedTemplate);
      
      // Si hay una función onSave proporcionada, llamarla con el resultado
      if (typeof onSave === 'function') {
        onSave(savedTemplate);
      }
  
      // Actualizar el ID del banner para futuras operaciones
      if (savedTemplate && savedTemplate._id && (!initialConfig || !initialConfig._id)) {
        // Actualizar initialConfig para que futuras operaciones usen updateTemplate
        setInitialConfig({
          ...configToSave,
          _id: savedTemplate._id
        }, false);
      }
    } catch (error) {
      console.error('❌ Error al guardar el banner:', error);
      setSaveError(error.message || 'Error al guardar el banner');
    } finally {
      setIsSaving(false);
      // Desmarcar que el guardado está en progreso después de un pequeño retraso
      setTimeout(() => {
        saveInProgressRef.current = false;
      }, 500);
    }
  };

  const handlePropertyPanelClose = () => {
    setSidebarMode('components');
    setSelectedComponent(null);
  };

  // Función para manejar la exportación del script
  const handleExportScript = async () => {
    try {
      // Verificar que el banner tenga ID (está guardado)
      if (!bannerConfig._id) {
        alert("Debes guardar el banner antes de exportar el script.");
        return;
      }
      
      // Si hay cambios sin guardar, guardar primero
      if (isSaving || saveInProgressRef.current) {
        alert("Hay un guardado en progreso. Por favor, espera antes de exportar.");
        return;
      }
      
      setIsSaving(true); // Mostrar indicador de carga
      
      // Solicitar script al backend utilizando nuestra función del endpoint
      const response = await exportEmbeddableScript(bannerConfig._id);
      
      if (response.status === 'success') {
        // Mostrar modal con el script
        setScriptExport({
          show: true,
          script: response.data.script
        });
      }
    } catch (error) {
      console.error('Error al exportar script:', error);
      // Mostrar mensaje de error
      setSaveError('Error al generar el script de exportación');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Barra superior */}
      <div className="bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="font-semibold">Editor de Banner</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded">
              <button className="p-2 hover:bg-gray-50 disabled:opacity-50" disabled>
                <Undo size={16} />
              </button>
              <button className="p-2 hover:bg-gray-50 disabled:opacity-50 border-l" disabled>
                <Redo size={16} />
              </button>
            </div>
            <div className="flex items-center border rounded">
              <button 
                className={`p-2 hover:bg-gray-50 ${deviceView === 'desktop' ? 'bg-gray-100' : ''}`}
                onClick={() => setDeviceView('desktop')}
                title="Vista Escritorio"
              >
                <Monitor size={16} />
              </button>
              <button 
                className={`p-2 hover:bg-gray-50 border-l ${deviceView === 'tablet' ? 'bg-gray-100' : ''}`}
                onClick={() => setDeviceView('tablet')}
                title="Vista Tablet"
              >
                <Tablet size={16} />
              </button>
              <button 
                className={`p-2 hover:bg-gray-50 border-l ${deviceView === 'mobile' ? 'bg-gray-100' : ''}`}
                onClick={() => setDeviceView('mobile')}
                title="Vista Móvil"
              >
                <Smartphone size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                handlePreview();
                setShowPreview(!showPreview);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded ${showPreview ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50'}`}
              title="Vista previa"
            >
              <Eye size={16} />
              <span className="text-sm">Vista previa</span>
            </button>
            
            <button 
                onClick={handleExportScript}
                disabled={isSaving || saveInProgressRef.current}
                className={`flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 
                  ${(isSaving || saveInProgressRef.current) ? 'opacity-70 cursor-not-allowed' : ''}`}
                title="Exportar Script"
              >
                <Code size={16} />
                <span className="text-sm">Exportar Script</span>
            </button>
            
            <button 
              onClick={handleSaveClick}
              disabled={isSaving || saveInProgressRef.current}
              className={`flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 
                ${(isSaving || saveInProgressRef.current) ? 'opacity-70 cursor-not-allowed' : ''}`}
              title="Guardar"
            >
              <Save size={16} />
              <span className="text-sm">{isSaving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </div>
  
        {/* Barra para el nombre del banner */}
        <div className="flex items-center px-4 py-2 border-t bg-gray-50">
          <div className="flex-1 flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">Nombre del banner:</label>
            <input
              type="text"
              value={bannerName}
              onChange={(e) => {
                setBannerName(e.target.value);
                if (nameError && e.target.value.trim()) {
                  setNameError(false);
                }
              }}
              placeholder="Ingresa un nombre para el banner"
              className={`flex-1 text-sm border rounded px-2 py-1 ${
                nameError ? 'border-red-500 bg-red-50' : ''
              }`}
            />
            {nameError && (
              <span className="text-xs text-red-500 font-medium">El nombre es obligatorio</span>
            )}
          </div>
        </div>
  
        {/* Mostrar error de guardado si existe */}
        {saveError && (
          <div className="flex items-center px-4 py-2 bg-red-50 border-t border-b border-red-200">
            <div className="flex-1 text-red-600 text-sm">
              <strong>Error al guardar:</strong> {saveError}
            </div>
            <button 
              onClick={() => setSaveError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X size={16} />
            </button>
          </div>
        )}
  
        {/* Subbarra de configuración */}
        <div className="flex items-center gap-4 px-4 py-2 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Tipo:</label>
            <select 
              value={bannerConfig.layout[deviceView]?.type || 'banner'}
              onChange={(e) => handleUpdateLayoutForDevice(deviceView, 'type', e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="banner">Banner</option>
              <option value="modal">Modal</option>
              <option value="floating">Flotante</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Posición:</label>
            <select 
              value={bannerConfig.layout[deviceView]?.position || 'bottom'}
              onChange={(e) => handleUpdateLayoutForDevice(deviceView, 'position', e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="top">Superior</option>
              <option value="bottom">Inferior</option>
              <option value="center">Centro</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Color de fondo:</label>
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={bannerConfig.layout[deviceView]?.backgroundColor || '#ffffff'}
                onChange={(e) => handleUpdateLayoutForDevice(deviceView, 'backgroundColor', e.target.value)}
                className="w-8 h-8 p-0 rounded cursor-pointer"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Ancho:</label>
            <select
              value={widthUnit}
              onChange={handleWidthUnitChange}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="auto">Auto</option>
              <option value="px">Píxeles</option>
              <option value="%">Porcentaje</option>
            </select>
            {widthUnit !== 'auto' && (
              <input
                type="number"
                value={widthValue}
                onChange={handleWidthValueChange}
                className="w-20 text-sm border rounded px-2 py-1"
                placeholder="ej: 500"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Alto:</label>
            <select
              value={heightUnit}
              onChange={handleHeightUnitChange}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="auto">Auto</option>
              <option value="px">Píxeles</option>
              <option value="%">Porcentaje</option>
            </select>
            {heightUnit !== 'auto' && (
              <input
                type="number"
                value={heightValue}
                onChange={handleHeightValueChange}
                className="w-20 text-sm border rounded px-2 py-1"
                placeholder="ej: 200"
              />
            )}
          </div>
        </div>
      </div>
  
      {/* Área principal del editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel lateral (muestra componentes o propiedades según el modo) */}
        {sidebarMode === 'components' ? (
          <BannerSidebar bannerConfig={bannerConfig} />
        ) : (
          <div className="w-64 bg-white border-r h-full">
            {/* Cabecera de panel con botón de regreso */}
            <div className="p-3 border-b flex items-center">
              <button
                onClick={handleBackToComponents}
                className="p-1 mr-2 hover:bg-gray-100 rounded text-gray-600"
                title="Volver a componentes"
              >
                <ChevronLeft size={16} />
              </button>
              <h3 className="font-medium text-sm">Propiedades del componente</h3>
            </div>
            
            {/* Panel de propiedades integrado */}
            {selectedComponent && (
              <BannerPropertyPanel
                component={selectedComponent}
                deviceView={deviceView}
                updateStyle={(style) => updateComponentStyleForDevice(selectedComponent.id, deviceView, style)}
                onUpdateContent={(content) => updateComponentContent(selectedComponent.id, content)}
                onUpdatePosition={(position) => updateComponentPositionForDevice(selectedComponent.id, deviceView, position)}
                onClose={handlePropertyPanelClose}
                onAlignElements={null} 
                embedded={true} // Indicar que está integrado en el sidebar
                bannerConfig={bannerConfig}
              />
            )}
          </div>
        )}
        
        {/* Canvas principal */}
        <div className={`flex-1 overflow-auto p-8 ${getDeviceWidth()}`}>
          {showPreview ? (
            <BannerPreview bannerConfig={bannerConfig} />
          ) : (
            <BannerCanvas
              bannerConfig={bannerConfig}
              deviceView={deviceView}
              selectedComponent={selectedComponent}
              setSelectedComponent={handleComponentSelect}
              onAddComponent={addComponent}
              onDeleteComponent={deleteComponent}
              onUpdatePosition={(id, pos) => updateComponentPositionForDevice(id, deviceView, pos)}
              onUpdateContent={updateComponentContent}
              onUpdateStyle={(id, style) => updateComponentStyleForDevice(id, deviceView, style)}
              onAddChild={onAddChild}
            />
          )}
        </div>
      </div>

      {/* Modal para exportar script */}
      {scriptExport.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-medium">Exportar Script</h3>
              <button 
                onClick={() => setScriptExport({show: false, script: ''})}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="mb-4">Copia este script y pégalo en tu sitio web justo antes del cierre de la etiqueta &lt;/body&gt;:</p>
              <div className="bg-gray-100 p-4 rounded relative">
                <pre className="text-sm overflow-auto max-h-96">{scriptExport.script}</pre>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(scriptExport.script);
                    setShowCopiedMessage(true);
                    setTimeout(() => setShowCopiedMessage(false), 2000);
                  }}
                  className="absolute top-2 right-2 p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  title="Copiar al portapapeles"
                >
                  <ClipboardCopy size={16} />
                </button>
              </div>
              {showCopiedMessage && (
                <div className="mt-2 text-sm text-green-600">
                  ¡Script copiado al portapapeles!
                </div>
              )}
              <div className="mt-4 text-sm text-gray-600">
                <p>Instrucciones de instalación:</p>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Copia el script completo</li>
                  <li>Pégalo al final de tu HTML, justo antes de cerrar &lt;/body&gt;</li>
                  <li>El banner aparecerá automáticamente cuando se cargue la página</li>
                </ol>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button 
                onClick={() => setScriptExport({show: false, script: ''})}
                className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BannerEditor;