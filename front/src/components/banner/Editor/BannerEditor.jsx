import React, { useEffect, useState, useRef } from 'react';
import { useBannerEditor} from './hooks/useBannerEditor';
import BannerSidebar from './BannerSidebar';
import BannerCanvas from './BannerCanvas';
import BannerPropertyPanel from './BannerPropertyPanel';
import BannerPreview from './BannerPreview.jsx';
import handleWidthValueChangeFn from './handleWidthValueChange';
import handleFloatingMarginChange from './handleFloatingMarginChange';
import { Save, Eye, Undo, Redo, Monitor, Smartphone, Tablet, ChevronLeft, X, Code, ClipboardCopy, Trash2 } from 'lucide-react';
import { exportEmbeddableScript, cleanupUnusedImages } from '../../../api/bannerTemplate';
import { useAuth } from '../../../contexts/AuthContext';

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
  const { hasRole } = useAuth();
  const isOwner = hasRole('owner');
  
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
    updateContainerConfig, // NUEVO - FASE 2: Función para actualizar configuración de contenedor
    addChildToContainer, // NUEVO - FASE 4: Función para agregar hijo a contenedor
    // NUEVAS FUNCIONES para componentes hijos
    deleteChildComponent, // Eliminar componente hijo
    removeChildFromContainer, // Remover hijo de contenedor (hacerlo independiente)
    updateChildContent, // Actualizar contenido de componente hijo
    updateChildStyleForDevice, // Actualizar estilo de componente hijo
    updateChildPositionForDevice, // Actualizar posición de componente hijo
    updateChildPosition, // NUEVO - FASE 4: Función para actualizar posición de componente hijo
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
  const [floatingMargin, setFloatingMargin] = useState('20');
  const [floatingCorner, setFloatingCorner] = useState('bottom-right');
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [sidebarMode, setSidebarMode] = useState('components'); // 'components' o 'properties'
  const [bannerName, setBannerName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSystemTemplate, setIsSystemTemplate] = useState(false);
  
  // Estado para la limpieza de imágenes
  const [isCleaningImages, setIsCleaningImages] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  
  // Estados para el modal de exportación de script
  const [scriptExport, setScriptExport] = useState({ show: false, script: '' });
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  
  // Refs para evitar problemas
  const saveInProgressRef = useRef(false);
  const dimensionsInitializedRef = useRef(false);

  // Listener para eventos personalizados de configuración de contenedor - FASE 2
  useEffect(() => {
    const handleContainerConfigUpdate = (event) => {
      const { componentId, containerConfig } = event.detail;
      console.log(`🔧 EDITOR: Evento de actualización de contenedor recibido para ${componentId}:`, containerConfig);
      updateContainerConfig(componentId, containerConfig);
    };

    window.addEventListener('container:config:update', handleContainerConfigUpdate);
    
    return () => {
      window.removeEventListener('container:config:update', handleContainerConfigUpdate);
    };
  }, [updateContainerConfig]);

  // Este efecto maneja la inicialización con initialConfig
  useEffect(() => {
    if (initialConfig) {
      // console.log('🔄 BannerEditor recibió initialConfig:', initialConfig);
      // Inicializar sin seleccionar automáticamente un componente
      setInitialConfig(initialConfig, false); // Segundo parámetro false para no autoseleccionar
      setBannerName(initialConfig.name || '');
    }
  }, [initialConfig, setInitialConfig]);

  // Este efecto actualiza las dimensiones cuando cambia el dispositivo
  useEffect(() => {
    // Resetear la referencia cuando cambia el dispositivo para permitir actualizaciones
    dimensionsInitializedRef.current = false;
  }, [deviceView]);
  
  // Este efecto actualiza las dimensiones cuando cambia bannerConfig
  useEffect(() => {
    if (!bannerConfig?.layout?.[deviceView]) return;
    
    // Extraer valores actuales
    const currentLayout = bannerConfig.layout[deviceView];
    
    // Procesar dimensiones (siempre, para que funcione el cambio de dispositivo)
    const parsedWidth = parseDimension(currentLayout?.width);
    setWidthValue(parsedWidth.value);
    setWidthUnit(parsedWidth.unit);

    const parsedHeight = parseDimension(currentLayout?.height);
    setHeightValue(parsedHeight.value);
    setHeightUnit(parsedHeight.unit);
    
    // Para banners flotantes, actualizar posición y margen
    let cornerValue = currentLayout?.floatingCorner;
    
    // Si no hay floatingCorner, buscar en position si es válido
    if (!cornerValue && currentLayout?.position) {
      const position = currentLayout.position;
      if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(position)) {
        cornerValue = position;
      }
    }
    
    // Valor por defecto
    if (!cornerValue) {
      cornerValue = 'bottom-right';
    }
    
    // Obtener el margen
    const currentFloatingMargin = currentLayout?.floatingMargin || 
                                 currentLayout?.['data-floating-margin'] || '20';
    
    // Actualizar estados locales
    setFloatingMargin(currentFloatingMargin);
    setFloatingCorner(cornerValue);
    
    // Solo realizar sincronización de valores una vez, para evitar ciclos infinitos
    if (currentLayout?.type === 'floating' && !dimensionsInitializedRef.current) {
      // Marcar que ya se inicializó
      dimensionsInitializedRef.current = true;
      
      // Usar un timeout para agrupar estos cambios y reducir la cantidad de re-renders
      setTimeout(() => {
        // Estos handleUpdateLayoutForDevice no deberían ejecutarse en cada render
        handleUpdateLayoutForDevice(deviceView, 'floatingCorner', cornerValue);
        handleUpdateLayoutForDevice(deviceView, 'data-floating-corner', cornerValue);
        handleUpdateLayoutForDevice(deviceView, 'position', cornerValue);
        handleUpdateLayoutForDevice(deviceView, 'floatingMargin', currentFloatingMargin);
        handleUpdateLayoutForDevice(deviceView, 'data-floating-margin', currentFloatingMargin);
      }, 0);
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
    
    // Obtener el tipo de banner actual
    const bannerType = bannerConfig.layout[deviceView]?.type || 'banner';
    
    if (unit === 'auto') {
      setWidthValue('');
      handleUpdateLayoutForDevice(deviceView, 'width', 'auto');
      // También eliminar los data-attributes relacionados
      handleUpdateLayoutForDevice(deviceView, 'data-width', null);
    } else if (unit === '%') {
      // Establecer valores fijos según el tipo de banner
      let fixedWidthPercent;
      
      if (bannerType === 'modal') {
        fixedWidthPercent = 90;
      } else if (bannerType === 'floating') {
        fixedWidthPercent = 40;
      } else { // banner estándar
        fixedWidthPercent = 100;
      }
      
      setWidthValue(fixedWidthPercent.toString());
      handleUpdateLayoutForDevice(deviceView, 'width', `${fixedWidthPercent}%`);
      handleUpdateLayoutForDevice(deviceView, 'data-width', fixedWidthPercent.toString());
    } else if (widthValue !== '') {
      // Convertir el valor actual si es válido
      const numValue = parseFloat(widthValue);
      if (!isNaN(numValue) && numValue > 0) {
        handleUpdateLayoutForDevice(deviceView, 'width', `${numValue}${unit}`);
        handleUpdateLayoutForDevice(deviceView, 'data-width', numValue.toString());
      } else if (bannerType === 'modal') {
        // Calcular aproximadamente el 90% del tamaño de la ventana
        const approxWidth = Math.round(window.innerWidth * 0.9);
        setWidthValue(approxWidth.toString());
        handleUpdateLayoutForDevice(deviceView, 'width', `${approxWidth}px`);
      } else if (bannerType === 'floating') {
        // Calcular aproximadamente el 40% del tamaño de la ventana
        const approxWidth = Math.round(window.innerWidth * 0.4);
        setWidthValue(approxWidth.toString());
        handleUpdateLayoutForDevice(deviceView, 'width', `${approxWidth}px`);
      } else {
        handleUpdateLayoutForDevice(deviceView, 'width', `${widthValue}${unit}`);
      }
    }
  };

  // Usar la función modularizada pero vinculada al contexto de este componente
  const handleWidthValueChange = (e) => {
    // Crear un contexto con los estados y funciones necesarias
    const context = {
      setWidthValue,
      bannerConfig,
      deviceView,
      widthUnit,
      handleUpdateLayoutForDevice
    };
    
    // Llamar a la función importada con el contexto correcto
    handleWidthValueChangeFn.call(context, e);
  };

  const handleHeightUnitChange = (e) => {
    const unit = e.target.value;
    setHeightUnit(unit);
    
    // Obtener el tipo de banner actual
    const bannerType = bannerConfig.layout[deviceView]?.type || 'banner';
    
    if (unit === 'auto') {
      setHeightValue('');
      handleUpdateLayoutForDevice(deviceView, 'height', 'auto');
      // También eliminar los data-attributes relacionados
      handleUpdateLayoutForDevice(deviceView, 'data-height', null);
    } else if (unit === '%') {
      // Establecer valores predeterminados según el tipo de banner
      let defaultHeightPercent;
      
      if (bannerType === 'modal') {
        defaultHeightPercent = 60;
      } else if (bannerType === 'floating') {
        defaultHeightPercent = 40;
      } else { // banner estándar
        defaultHeightPercent = 'auto';
        
        // Para banners estándar, configurar auto manteniendo la unidad como % en la interfaz
        handleUpdateLayoutForDevice(deviceView, 'height', 'auto');
        return;
      }
      
      setHeightValue(defaultHeightPercent.toString());
      handleUpdateLayoutForDevice(deviceView, 'height', `${defaultHeightPercent}%`);
      handleUpdateLayoutForDevice(deviceView, 'data-height', defaultHeightPercent.toString());
    } else if (heightValue !== '') {
      // Convertir el valor actual si es válido
      const numValue = parseFloat(heightValue);
      if (!isNaN(numValue) && numValue > 0) {
        const minHeight = 30; // Mínimo de 30px
        const limitedValue = Math.max(minHeight, numValue);
        setHeightValue(limitedValue.toString());
        handleUpdateLayoutForDevice(deviceView, 'height', `${limitedValue}${unit}`);
        handleUpdateLayoutForDevice(deviceView, 'data-height', limitedValue.toString());
      } else {
        // Establecer un valor predeterminado para altura en píxeles
        const defaultHeight = bannerType === 'modal' ? 300 : 
                             bannerType === 'floating' ? 200 : 100;
        setHeightValue(defaultHeight.toString());
        handleUpdateLayoutForDevice(deviceView, 'height', `${defaultHeight}${unit}`);
        handleUpdateLayoutForDevice(deviceView, 'data-height', defaultHeight.toString());
      }
    } else {
      // Si no hay valor pero se cambia a una unidad específica, establecer un valor predeterminado
      const defaultHeight = bannerType === 'modal' ? 300 : 
                          bannerType === 'floating' ? 200 : 100;
      setHeightValue(defaultHeight.toString());
      handleUpdateLayoutForDevice(deviceView, 'height', `${defaultHeight}${unit}`);
      handleUpdateLayoutForDevice(deviceView, 'data-height', defaultHeight.toString());
    }
  };

  const handleHeightValueChange = (e) => {
    const value = e.target.value;
    setHeightValue(value);
    
    // Obtener el tipo de banner actual
    const bannerType = bannerConfig.layout[deviceView]?.type || 'banner';
    
    if (heightUnit !== 'auto') {
      // Para valores porcentuales, aplicar validaciones según tipo de banner
      if (heightUnit === '%') {
        const numValue = parseInt(value);
        
        if (bannerType === 'modal') {
          // Limitar entre 20% y 90%
          const limitedValue = Math.max(20, Math.min(90, numValue || 60));
          setHeightValue(limitedValue.toString());
          handleUpdateLayoutForDevice(deviceView, 'height', `${limitedValue}%`);
          handleUpdateLayoutForDevice(deviceView, 'data-height', limitedValue.toString());
        } else if (bannerType === 'floating') {
          // Limitar entre 20% y 70%
          const limitedValue = Math.max(20, Math.min(70, numValue || 40));
          setHeightValue(limitedValue.toString());
          handleUpdateLayoutForDevice(deviceView, 'height', `${limitedValue}%`);
          handleUpdateLayoutForDevice(deviceView, 'data-height', limitedValue.toString());
        } else { // Banner estándar
          // Permitir cualquier porcentaje entre 10% y 100%
          const limitedValue = Math.max(10, Math.min(100, numValue || 100));
          setHeightValue(limitedValue.toString());
          handleUpdateLayoutForDevice(deviceView, 'height', `${limitedValue}%`);
          handleUpdateLayoutForDevice(deviceView, 'data-height', limitedValue.toString());
        }
      } else {
        // Para píxeles, validar que sea un número positivo
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue > 0) {
          // Mantener un mínimo razonable
          const minHeight = 30; // Mínimo de 30px
          const limitedValue = Math.max(minHeight, numValue);
          setHeightValue(limitedValue.toString());
          handleUpdateLayoutForDevice(deviceView, 'height', `${limitedValue}px`);
          handleUpdateLayoutForDevice(deviceView, 'data-height', limitedValue.toString());
        } else {
          // Si el valor no es válido o está vacío, establecer a auto
          handleUpdateLayoutForDevice(deviceView, 'height', 'auto');
        }
      }
    } else {
      // Si la unidad es auto, configurar a auto en el layout
      handleUpdateLayoutForDevice(deviceView, 'height', 'auto');
    }
  };
  
  // Handler para cambiar el margen del banner flotante
  const handleFloatingMarginValueChange = (e) => {
    const value = e.target.value;
    
    // Validar y convertir el valor
    let numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) numValue = 20;
    if (numValue > 100) numValue = 100;
    numValue = Math.round(numValue);
    const stringValue = numValue.toString();
    
    // Actualizar el estado local primero
    setFloatingMargin(stringValue);
    
    // Actualizar todos los campos relevantes en el modelo con múltiples formatos
    
    // 1. En formato de propiedad principal
    handleUpdateLayoutForDevice(deviceView, 'floatingMargin', stringValue);
    
    // 2. En formato de atributo data para HTML
    handleUpdateLayoutForDevice(deviceView, 'data-floating-margin', stringValue);
    
    // 3. En formato margin directo para CSS
    handleUpdateLayoutForDevice(deviceView, 'margin', `${stringValue}px`);
    
    // Para debugging
    console.log(`Margen flotante actualizado a: ${stringValue}px para dispositivo ${deviceView}`);
    
    // Visualizar el objeto de configuración completo para verificar
    setTimeout(() => {
      console.log('Configuración actualizada del banner:', bannerConfig);
    }, 100);
  };
  
  // Handler para cambiar la esquina de posicionamiento del banner flotante
  const handleFloatingCornerChange = (e) => {
    const value = e.target.value;
    setFloatingCorner(value);
    
    // Guardar la posición en múltiples formatos para máxima compatibilidad
    
    // 1. En formato de propiedad principal
    handleUpdateLayoutForDevice(deviceView, 'floatingCorner', value);
    
    // 2. En formato de atributo data para HTML
    handleUpdateLayoutForDevice(deviceView, 'data-floating-corner', value);
    
    // 3. En formato position para compatibilidad
    handleUpdateLayoutForDevice(deviceView, 'position', value);
    
    console.log(`Posición del banner actualizada a: ${value} para dispositivo ${deviceView}`);
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

  // NUEVAS FUNCIONES HELPER para manejar componentes hijos e principales de forma unificada
  
  // Función para determinar si un componente es hijo (tiene parentId)
  const isChildComponent = (componentId) => {
    // Función recursiva para buscar si un componente es hijo
    const findInComponents = (components) => {
      for (const comp of components) {
        if (comp.children && comp.children.length > 0) {
          for (const child of comp.children) {
            if (child.id === componentId) {
              return true;
            }
            // Buscar recursivamente en hijos anidados
            if (findInComponents([child])) {
              return true;
            }
          }
        }
      }
      return false;
    };
    
    return findInComponents(bannerConfig.components);
  };

  // Función unificada para eliminar componente (hijo o principal)
  const handleDeleteComponent = (componentId) => {
    if (isChildComponent(componentId)) {
      deleteChildComponent(componentId);
    } else {
      deleteComponent(componentId);
    }
  };

  // Función unificada para actualizar contenido (hijo o principal)
  const handleUpdateContent = (componentId, content) => {
    if (isChildComponent(componentId)) {
      updateChildContent(componentId, content);
    } else {
      updateComponentContent(componentId, content);
    }
  };

  // Función unificada para actualizar estilo (hijo o principal)
  const handleUpdateStyle = (componentId, style) => {
    if (isChildComponent(componentId)) {
      updateChildStyleForDevice(componentId, deviceView, style);
    } else {
      updateComponentStyleForDevice(componentId, deviceView, style);
    }
  };

  // Función unificada para actualizar posición (hijo o principal)
  const handleUpdatePosition = (componentId, position) => {
    if (isChildComponent(componentId)) {
      updateChildPositionForDevice(componentId, deviceView, position);
    } else {
      updateComponentPositionForDevice(componentId, deviceView, position);
    }
  };

  const handleSaveClick = async (e) => {
    // Prevenir acción por defecto si existe evento
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    // Verificar si ya hay un guardado en progreso (previene dobles envíos)
    if (saveInProgressRef.current || isSaving) {
      // console.log('⚠️ Ya hay un guardado en progreso, ignorando esta solicitud');
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
      
      // IMPORTANTE: Verificar y actualizar datos de esquinas flotantes antes de guardar
      // Crear copia profunda para no modificar el original directamente
      const configToSave = JSON.parse(JSON.stringify(bannerConfig));
      configToSave.name = bannerName.trim();
      
      // Verificar cada dispositivo
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        // NUEVO: Asegurar que el botón de preferencias tenga el posicionamiento correcto
        const preferencesBtn = configToSave.components.find(comp => comp.id === 'preferencesBtn');
        if (preferencesBtn && preferencesBtn.position && preferencesBtn.position[device]) {
          const prefPosition = preferencesBtn.position[device];
          
          // Si el botón tiene left: 50% o percentX: 50, aplicar transform: 'center'
          if (prefPosition.left === '50%' || prefPosition.percentX === 50 ||
              (typeof prefPosition.percentX === 'string' && parseFloat(prefPosition.percentX) === 50)) {
            
            console.log(`⚠️ GUARDADO: Asegurando transformX: 'center' para botón de preferencias en ${device}`);
            prefPosition.transformX = 'center';
          }
          // Para botones posicionados a la izquierda o derecha, limpiar cualquier valor que pueda desplazarlos
          else if (prefPosition.left === '0px' || prefPosition.left === '0' || 
                   prefPosition.right === '0px' || prefPosition.right === '0') {
            // Asegurar que no hay transformaciones que puedan interferir con el posicionamiento lateral
            console.log(`⚠️ GUARDADO: Limpiando transformaciones para botón lateral en ${device}`);
            prefPosition.transformX = '';
            prefPosition.transform = '';
            
            // Corregir valores que podrían ser problemáticos (30-50px de offset)
            if (prefPosition.left && typeof prefPosition.left === 'string' && prefPosition.left.includes('px')) {
              const leftPx = parseFloat(prefPosition.left);
              if (leftPx >= 30 && leftPx <= 50) {
                console.log(`⚠️ GUARDADO: Corrigiendo offset problemático en left: ${prefPosition.left} -> 0px`);
                prefPosition.left = '0px';
              }
            }
            
            if (prefPosition.right && typeof prefPosition.right === 'string' && prefPosition.right.includes('px')) {
              const rightPx = parseFloat(prefPosition.right);
              if (rightPx >= 30 && rightPx <= 50) {
                console.log(`⚠️ GUARDADO: Corrigiendo offset problemático en right: ${prefPosition.right} -> 0px`);
                prefPosition.right = '0px';
              }
            }
          }
        }
        
        // Verificar floating banner
        if (configToSave.layout[device] && configToSave.layout[device].type === 'floating') {
          // Verificar que la esquina flotante esté correctamente configurada
          const cornerValue = configToSave.layout[device].floatingCorner || 
                            configToSave.layout[device]['data-floating-corner'] ||
                            (configToSave.layout[device].position && 
                             ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(configToSave.layout[device].position) ? 
                             configToSave.layout[device].position : 'bottom-right');
          
          const marginValue = configToSave.layout[device].floatingMargin || 
                            configToSave.layout[device]['data-floating-margin'] || '20';
          
          // Establecer TODOS los valores necesarios
          configToSave.layout[device].floatingCorner = cornerValue;
          configToSave.layout[device]['data-floating-corner'] = cornerValue;
          configToSave.layout[device].position = cornerValue;
          
          configToSave.layout[device].floatingMargin = marginValue;
          configToSave.layout[device]['data-floating-margin'] = marginValue;
          
          console.log(`Asegurando datos de banner flotante para ${device}:`, {
            corner: cornerValue,
            margin: marginValue
          });
        }
      });
      
      let savedTemplate;
      
      // Determinar si es una creación o actualización
      if (initialConfig && initialConfig._id) {
        // Actualizar banner existente usando el hook
        // console.log(`📤 Actualizando banner existente ${initialConfig._id}`);
        savedTemplate = await handleUpdate(initialConfig._id, configToSave);
      } else {
        // Crear nuevo banner usando el hook
        // console.log('📤 Creando nuevo banner');
        // Eliminar _id para evitar conflictos
        const { _id, ...configWithoutId } = configToSave;
        savedTemplate = await handleSave(configWithoutId, isSystemTemplate);
      }
      
      // console.log('✅ Banner guardado con éxito:', savedTemplate);
      
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
      
      // Ya no necesitamos restaurar manualmente el tipo 'system'
      // El backend ahora preserva el tipo de plantilla original
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
      
      // IMPORTANTE: Asegurar que el botón de preferencias tenga la transformación correcta antes de exportar
      console.log('🔍 Verificando transformación del botón de preferencias antes de exportar...');
      const configToExport = JSON.parse(JSON.stringify(bannerConfig));
      let needsUpdate = false;
      
      // Verificar cada dispositivo
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        const preferencesBtn = configToExport.components.find(comp => comp.id === 'preferencesBtn');
        if (preferencesBtn && preferencesBtn.position && preferencesBtn.position[device]) {
          const prefPosition = preferencesBtn.position[device];
          
          // Si el botón tiene left: 50% o percentX: 50, aplicar transform: 'center'
          if ((prefPosition.left === '50%' || prefPosition.percentX === 50) && 
              prefPosition.transformX !== 'center') {
            
            console.log(`⚠️ EXPORTACIÓN: Corrigiendo transformX para botón de preferencias en ${device}`);
            prefPosition.transformX = 'center';
            needsUpdate = true;
          }
        }
      });
      
      // Si se realizaron correcciones, guardar primero y luego exportar
      if (needsUpdate) {
        console.log('⚠️ Se encontraron problemas en el botón de preferencias, guardando correcciones...');
        await handleUpdate(bannerConfig._id, configToExport);
      }
      
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
  
  // Función para limpiar imágenes no utilizadas
  const handleCleanupImages = async () => {
    try {
      // Verificar que el banner tenga ID (está guardado)
      if (!bannerConfig._id) {
        alert("Debes guardar el banner antes de limpiar imágenes.");
        return;
      }
      
      // Si hay operaciones en curso, mostrar alerta
      if (isSaving || saveInProgressRef.current || isCleaningImages) {
        alert("Hay una operación en progreso. Por favor, espera antes de limpiar imágenes.");
        return;
      }
      
      // Pedir confirmación al usuario
      const confirmed = window.confirm(
        "Esta acción eliminará permanentemente todas las imágenes que no estén siendo utilizadas en el banner. ¿Deseas continuar?"
      );
      
      if (!confirmed) return;
      
      // Iniciar proceso de limpieza
      setIsCleaningImages(true);
      setCleanupResult(null);
      setSaveError(null);
      
      // Llamar al endpoint de limpieza
      const response = await cleanupUnusedImages(bannerConfig._id);
      
      if (response.status === 'success') {
        // Mostrar resultado
        setCleanupResult({
          deleted: response.data.deleted,
          kept: response.data.kept
        });
        
        // Limpiar después de unos segundos
        setTimeout(() => {
          setCleanupResult(null);
        }, 5000);
      }
    } catch (error) {
      console.error('Error al limpiar imágenes:', error);
      setSaveError('Error al limpiar imágenes: ' + error.message);
    } finally {
      setIsCleaningImages(false);
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
            
            {/* Botón de limpieza de imágenes (solo visible si el banner ya está guardado) */}
            {bannerConfig._id && (
              <button 
                onClick={handleCleanupImages}
                disabled={isSaving || isCleaningImages || saveInProgressRef.current}
                className={`flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 
                  ${(isSaving || isCleaningImages || saveInProgressRef.current) ? 'opacity-70 cursor-not-allowed' : ''}`}
                title="Limpiar imágenes no utilizadas"
              >
                <Trash2 size={16} />
                <span className="text-sm">{isCleaningImages ? 'Limpiando...' : 'Limpiar imágenes'}</span>
              </button>
            )}
            
            {/* <button 
                onClick={handleExportScript}
                disabled={isSaving || saveInProgressRef.current}
                className={`flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 
                  ${(isSaving || saveInProgressRef.current) ? 'opacity-70 cursor-not-allowed' : ''}`}
                title="Exportar Script"
              >
                <Code size={16} />
                <span className="text-sm">Exportar Script</span>
            </button> */}
            
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
            
            {/* Opción para plantilla del sistema (solo para owners) */}
            {isOwner && !initialConfig?._id && (
              <div className="flex items-center ml-4">
                <input
                  type="checkbox"
                  id="system-template"
                  checked={isSystemTemplate}
                  onChange={(e) => setIsSystemTemplate(e.target.checked)}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="system-template" className="text-sm font-medium text-gray-700">
                  Plantilla del sistema (visible para todos los clientes)
                </label>
              </div>
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
        
        {/* Mostrar resultado de limpieza de imágenes si existe */}
        {cleanupResult && (
          <div className="flex items-center px-4 py-2 bg-green-50 border-t border-b border-green-200">
            <div className="flex-1 text-green-700 text-sm">
              <strong>Limpieza de imágenes completada:</strong> {cleanupResult.deleted} imágenes eliminadas, {cleanupResult.kept} imágenes conservadas.
            </div>
            <button 
              onClick={() => setCleanupResult(null)}
              className="text-green-700 hover:text-green-800"
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
              onChange={(e) => {
                const newType = e.target.value;
                
                // Actualizar tipo
                handleUpdateLayoutForDevice(deviceView, 'type', newType);
                
                // Forzar el ancho correcto según el tipo
                if (newType === 'modal') {
                  setWidthUnit('%');
                  setWidthValue('60');
                  handleUpdateLayoutForDevice(deviceView, 'width', '60%');
                  handleUpdateLayoutForDevice(deviceView, 'min-width', '40%');
                  handleUpdateLayoutForDevice(deviceView, 'max-width', '90%');
                  handleUpdateLayoutForDevice(deviceView, 'data-width', '60');
                } else if (newType === 'floating') {
                  setWidthUnit('%');
                  setWidthValue('50');
                  handleUpdateLayoutForDevice(deviceView, 'width', '50%');
                  handleUpdateLayoutForDevice(deviceView, 'min-width', '40%');
                  handleUpdateLayoutForDevice(deviceView, 'max-width', '70%');
                  handleUpdateLayoutForDevice(deviceView, 'data-width', '50');
                  // Valores por defecto para floating
                  const cornerValue = bannerConfig.layout[deviceView]?.floatingCorner || 
                                   bannerConfig.layout[deviceView]?.['data-floating-corner'] ||
                                   (bannerConfig.layout[deviceView]?.position && 
                                    ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(bannerConfig.layout[deviceView]?.position) ? 
                                    bannerConfig.layout[deviceView]?.position : 'bottom-right');
                                   
                  const marginValue = bannerConfig.layout[deviceView]?.floatingMargin || 
                                    bannerConfig.layout[deviceView]?.['data-floating-margin'] || '20';
                  
                  // IMPORTANTE: Actualizar TODAS las propiedades posibles para máxima compatibilidad
                  console.log(`Configurando banner flotante con esquina: ${cornerValue}, margen: ${marginValue}`);
                  
                  // 1. Propiedades principales
                  handleUpdateLayoutForDevice(deviceView, 'floatingCorner', cornerValue);
                  handleUpdateLayoutForDevice(deviceView, 'floatingMargin', marginValue);
                  
                  // 2. Atributos data para el script
                  handleUpdateLayoutForDevice(deviceView, 'data-floating-corner', cornerValue);
                  handleUpdateLayoutForDevice(deviceView, 'data-floating-margin', marginValue);
                  
                  // 3. Posición estándar (importante para mostrar correctamente en el editor)
                  handleUpdateLayoutForDevice(deviceView, 'position', cornerValue);
                  
                  // Actualizar el estado local
                  setFloatingCorner(cornerValue);
                  setFloatingMargin(marginValue);
                } else { // banner estándar
                  setWidthUnit('%');
                  setWidthValue('100');
                  handleUpdateLayoutForDevice(deviceView, 'width', '100%');
                }
              }}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="banner">Banner</option>
              <option value="modal">Modal</option>
              <option value="floating">Flotante</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Posición:</label>
            {bannerConfig.layout[deviceView]?.type === 'floating' ? (
              <select 
                value={floatingCorner}
                onChange={(e) => {
                  const newCorner = e.target.value;
                  // Actualizar estados ANTES de llamadas a handleUpdateLayoutForDevice
                  setFloatingCorner(newCorner);
                
                  // Secuencia ordenada de actualizaciones para evitar conflictos
                  // 1. Primero actualizar floatingCorner (property principal)
                  handleUpdateLayoutForDevice(deviceView, 'floatingCorner', newCorner);
                  
                  // 2. Actualizar data-attributes para el script
                  handleUpdateLayoutForDevice(deviceView, 'data-floating-corner', newCorner);
                  
                  // 3. Actualizar position para mantener coherencia
                  handleUpdateLayoutForDevice(deviceView, 'position', newCorner);
                  
                  // Imprimir estado para debug
                  console.log(`Posición cambiada a: ${newCorner}`, {
                    floatingCorner: newCorner,
                    'data-floating-corner': newCorner,
                    position: newCorner
                  });
                }}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="top-left">Superior izquierda</option>
                <option value="top-right">Superior derecha</option>
                <option value="bottom-left">Inferior izquierda</option>
                <option value="bottom-right">Inferior derecha</option>
              </select>
            ) : (
              <select 
                value={bannerConfig.layout[deviceView]?.position || 'bottom'}
                onChange={(e) => handleUpdateLayoutForDevice(deviceView, 'position', e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="top">Superior</option>
                <option value="bottom">Inferior</option>
                <option value="center">Centro</option>
              </select>
            )}
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
              disabled={false}
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
                readOnly={false}
                min={bannerConfig.layout[deviceView]?.type === 'modal' || bannerConfig.layout[deviceView]?.type === 'floating' ? 40 : 1}
                max={bannerConfig.layout[deviceView]?.type === 'modal' ? 90 : 
                     bannerConfig.layout[deviceView]?.type === 'floating' ? 70 : 100}
              />
            )}
            {bannerConfig.layout[deviceView]?.type === 'modal' && widthUnit === '%' && (
              <span className="text-xs text-blue-600">Los modales tienen entre 40% y 90% de ancho</span>
            )}
            {bannerConfig.layout[deviceView]?.type === 'floating' && widthUnit === '%' && (
              <span className="text-xs text-blue-600">Los flotantes tienen entre 40% y 70% de ancho</span>
            )}
            {bannerConfig.layout[deviceView]?.type === 'banner' && widthUnit === '%' && (
              <span className="text-xs text-blue-600">Los banners siempre tienen 100% de ancho</span>
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
          
          {/* Configuraciones específicas para banners flotantes - solo el margen */}
          {bannerConfig.layout[deviceView]?.type === 'floating' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Margen:</label>
              <input
                type="number"
                value={floatingMargin}
                onChange={handleFloatingMarginValueChange}
                className="w-20 text-sm border rounded px-2 py-1"
                placeholder="ej: 20"
                min={0}
                max={100}
              />
              <span className="text-xs">px</span>
              <span className="text-xs text-blue-600">Distancia desde el borde de la pantalla</span>
            </div>
          )}
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
                updateStyle={(style) => handleUpdateStyle(selectedComponent.id, style)} // NUEVA: Función unificada
                onUpdateContent={(content) => handleUpdateContent(selectedComponent.id, content)} // NUEVA: Función unificada
                onUpdatePosition={(position) => handleUpdatePosition(selectedComponent.id, position)} // NUEVA: Función unificada
                onUpdateContainer={(componentId, containerConfig) => updateContainerConfig(componentId, containerConfig)} // NUEVO - FASE 2
                onAddChild={addChildToContainer} // NUEVO - FASE 4: Función para agregar hijo a contenedor
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
            <BannerPreview bannerConfig={bannerConfig} profile={{}} />
          ) : (
            <BannerCanvas
              bannerConfig={bannerConfig}
              deviceView={deviceView}
              selectedComponent={selectedComponent}
              setSelectedComponent={handleComponentSelect}
              onAddComponent={addComponent}
              onDeleteComponent={handleDeleteComponent} // NUEVA: Función unificada
              onUpdatePosition={handleUpdatePosition} // NUEVA: Función unificada
              onUpdateContent={handleUpdateContent} // NUEVA: Función unificada
              onUpdateStyle={handleUpdateStyle} // NUEVA: Función unificada
              onAddChild={addChildToContainer} // FASE 4: Función para agregar hijo a contenedor
              onUpdateChildPosition={updateChildPosition} // NUEVA: Función para actualizar posición de hijos
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
      
      {/* Estilos CSS para componentes hijos */}
      <style jsx>{`
        .child-component {
          position: relative;
          transition: all 0.2s ease;
        }
        
        .child-component.selected {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          z-index: 10;
        }
        
        .child-component:hover {
          outline: 1px dashed #6b7280;
          outline-offset: 1px;
        }
        
        .child-component.selected:hover {
          outline: 2px solid #1d4ed8;
          outline-offset: 2px;
        }
        
        /* Evitar que el contenedor se mueva cuando se arrastra un hijo */
        .child-component[data-child-id] {
          pointer-events: all;
        }
        
        /* Indicador visual cuando un componente hijo está siendo arrastrado */
        .child-component.dragging {
          opacity: 0.7;
          transform: scale(1.02);
          z-index: 1000;
        }
      `}</style>
    </div>
  );
}

export default BannerEditor;