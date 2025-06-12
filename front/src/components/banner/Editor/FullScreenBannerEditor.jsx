import React, { useState, useEffect, useRef } from 'react';
import { useBannerEditor } from './hooks/useBannerEditor';
import { useAuth } from '../../../contexts/AuthContext';
import { Save, Eye, Undo, Redo, Monitor, Smartphone, Tablet, ChevronLeft, X, Trash2, Layers, Settings, Globe } from 'lucide-react';
// import { cleanupUnusedImages } from '../../../api/bannerTemplate'; // ELIMINADO

// Importamos los componentes existentes que reutilizaremos
import BannerCanvas from './BannerCanvas';
import BannerSidebar from './BannerSidebar';
import BannerPropertyPanel from './BannerPropertyPanel';
import BannerPreview from './BannerPreview';
import FullScreenPreview from './FullScreenPreview';
import LayersPanel from './LayersPanel';
import TranslationConfigPanel from './TranslationConfigPanel';

// Importamos nuestros nuevos componentes
import CollapsiblePanel from './CollapsiblePanel';
import PanelConfigModal from './PanelConfigModal';

// Importamos el helper para la selección de componentes
import { ensureComponentsPanelOpen, applyComponentSelectionStyles, initializeComponentStyles } from './componentSelectionHelper';
import { forceExpandComponentsPanel } from './panelHelper';

// Definición de configuración por defecto de los paneles
const DEFAULT_PANELS_CONFIG = {
  tools: { 
    id: 'tools',
    title: 'Herramientas', 
    visible: true, 
    position: 'top',
    resizable: false
  },
  name: { 
    id: 'name',
    title: 'Nombre del Banner', 
    visible: true, 
    position: 'top',
    resizable: false
  },
  properties: { 
    id: 'properties',
    title: 'Propiedades', 
    visible: true, 
    position: 'top',
    resizable: false
  },
  components: { 
    id: 'components',
    title: 'Componentes', 
    visible: true, 
    position: 'left',
    width: '250px',
    resizable: true,
    minWidth: '180px',
    maxWidth: '350px'
  },
  layers: { 
    id: 'layers',
    title: 'Capas', 
    visible: true, 
    position: 'right',
    width: '280px',
    resizable: true,
    minWidth: '220px',
    maxWidth: '400px'
  }
};

// Funciones helper para el localStorage
const savePanelsConfig = (config) => {
  try {
    localStorage.setItem('bannerEditor_panelsConfig', JSON.stringify(config));
  } catch (error) {
    console.error('Error saving panels config to localStorage:', error);
  }
};

const loadPanelsConfig = () => {
  try {
    const savedConfig = localStorage.getItem('bannerEditor_panelsConfig');
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
  } catch (error) {
    console.error('Error loading panels config from localStorage:', error);
  }
  return null;
};

const FullScreenBannerEditor = ({ initialConfig, onSave, onBack }) => {
  // Estado para los paneles con carga desde localStorage
  const [panelsConfig, setPanelsConfig] = useState(() => {
    // Forzar configuración por defecto para asegurar que todos los paneles sean visibles
    const config = DEFAULT_PANELS_CONFIG;
    Object.keys(config).forEach(key => {
      config[key].visible = true;
      config[key].expanded = true;
    });
    return config;
  });
  
  // Estado para el modal de configuración
  const [isPanelConfigOpen, setPanelConfigOpen] = useState(false);
  
  // Estados para guardar/restaurar configuración de paneles en vista previa
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const panelsBeforePreview = useRef(null);
  
  // Recuperamos la funcionalidad del editor actual
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
    updateContainerConfig,
    addChildToContainer,
    moveComponentToContainer,
    moveComponentOutOfContainer,
    reorderContainerChildren,
    deleteChildComponent,
    removeChildFromContainer,
    unattachFromContainer,
    updateChildContent,
    updateChildStyleForDevice,
    updateChildPositionForDevice,
    updateChildPosition,
    handleUpdateLayoutForDevice,
    previewData,
    handlePreview,
    handleSave,
    handleUpdate,
    deviceView,
    setDeviceView,
    showPreview,
    setShowPreview,
    handleToggleComponentVisibility,
    handleToggleComponentLock,
    handleRenameComponent,
    handleReorderComponents,
    // Propiedades de traducción
    isAutoTranslating,
    translationConfig,
    updateTranslationConfig,
    setSourceLanguage,
    setTargetLanguages,
    toggleAutoTranslate
  } = useBannerEditor();

  // Estado para las mismas propiedades que BannerEditor.jsx
  const [widthValue, setWidthValue] = useState('');
  const [widthUnit, setWidthUnit] = useState('auto');
  const [heightValue, setHeightValue] = useState('');
  const [heightUnit, setHeightUnit] = useState('auto');
  const [floatingMargin, setFloatingMargin] = useState('20');
  const [floatingCorner, setFloatingCorner] = useState('bottom-right');
  const [showPropertyPanel, setShowPropertyPanel] = useState(true);
  const [sidebarMode, setSidebarMode] = useState('components');
  const [bannerName, setBannerName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSystemTemplate, setIsSystemTemplate] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [isCleaningImages, setIsCleaningImages] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  
  // Nuevos estados para pasos de movimiento y redimensión
  const [moveStep, setMoveStep] = useState(1);
  const [resizeStep, setResizeStep] = useState(1);
  
  // Refs para evitar problemas
  const saveInProgressRef = useRef(false);
  const dimensionsInitializedRef = useRef(false);
  const selectedComponentRef = useRef(null);

  // Este efecto maneja la inicialización con initialConfig
  useEffect(() => {
    if (initialConfig) {
      setInitialConfig(initialConfig, false);
      setBannerName(initialConfig.name || '');
      setIsSystemTemplate(initialConfig.type === 'system' || initialConfig.isSystemTemplate || false);
    }
  }, [initialConfig, setInitialConfig]);
  
  // Listener para eventos personalizados de configuración de contenedor
  useEffect(() => {
    const handleContainerConfigUpdate = (event) => {
      const { componentId, containerConfig } = event.detail;
      updateContainerConfig(componentId, containerConfig);
    };

    window.addEventListener('container:config:update', handleContainerConfigUpdate);
    
    return () => {
      window.removeEventListener('container:config:update', handleContainerConfigUpdate);
    };
  }, [updateContainerConfig]);

  // Efecto para actualizar las dimensiones cuando cambia el dispositivo
  useEffect(() => {
    dimensionsInitializedRef.current = false;
    
    // Ajustar posiciones de componentes cuando cambia el dispositivo
    setTimeout(() => {
      adjustAllComponentsPositions();
    }, 300); // Dar más tiempo para que cambie el dispositivo
  }, [deviceView]);
  
  // Efecto para actualizar las dimensiones cuando cambia bannerConfig
  useEffect(() => {
    if (!bannerConfig?.layout?.[deviceView]) return;
    
    const currentLayout = bannerConfig.layout[deviceView];
    
    const parsedWidth = parseDimension(currentLayout?.width);
    setWidthValue(parsedWidth.value);
    setWidthUnit(parsedWidth.unit);

    const parsedHeight = parseDimension(currentLayout?.height);
    setHeightValue(parsedHeight.value);
    setHeightUnit(parsedHeight.unit);
    
    let cornerValue = currentLayout?.floatingCorner;
    
    if (!cornerValue && currentLayout?.position) {
      const position = currentLayout.position;
      if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(position)) {
        cornerValue = position;
      }
    }
    
    if (!cornerValue) {
      cornerValue = 'bottom-right';
    }
    
    const currentFloatingMargin = currentLayout?.floatingMargin || 
                               currentLayout?.['data-floating-margin'] || '20';
    
    setFloatingMargin(currentFloatingMargin);
    setFloatingCorner(cornerValue);
    
    if (currentLayout?.type === 'floating' && !dimensionsInitializedRef.current) {
      dimensionsInitializedRef.current = true;
      
      setTimeout(() => {
        handleUpdateLayoutForDevice(deviceView, 'floatingCorner', cornerValue);
        handleUpdateLayoutForDevice(deviceView, 'data-floating-corner', cornerValue);
        handleUpdateLayoutForDevice(deviceView, 'position', cornerValue);
        handleUpdateLayoutForDevice(deviceView, 'floatingMargin', currentFloatingMargin);
        handleUpdateLayoutForDevice(deviceView, 'data-floating-margin', currentFloatingMargin);
      }, 0);
    }
  }, [bannerConfig.layout, deviceView, handleUpdateLayoutForDevice]);
  

  // Efecto para asegurar que el panel de componentes esté abierto cuando se selecciona un componente
  useEffect(() => {
    if (selectedComponent) {
      // Guardar la referencia del estado actual para permitir restaurar manualmente después
      const currentVisibilityState = panelsConfig.components.visible;
      const currentExpandedState = panelsConfig.components.expanded;
      
      // Solo abrir automáticamente si es una nueva selección (primera vez)
      // Usamos una variable de referencia para hacer seguimiento de los componentes seleccionados
      if (!selectedComponentRef.current || selectedComponentRef.current.id !== selectedComponent.id) {
        // Abrir el panel solo si es un nuevo componente seleccionado
        const newConfig = { ...panelsConfig };
        newConfig.components.expanded = true;
        newConfig.components.visible = true;
        setPanelsConfig(newConfig);
        savePanelsConfig(newConfig);
        
        // Usar la función de utilidad para forzar la apertura del panel
        forceExpandComponentsPanel();
        
        // Actualizar referencia del componente seleccionado actual
        selectedComponentRef.current = selectedComponent;
      }
      
      // Aplicar estilos de selección (esto siempre se hace)
      setTimeout(() => {
        applyComponentSelectionStyles(selectedComponent.id);
      }, 50);
    } else {
      // Limpiar referencia cuando no hay componente seleccionado
      selectedComponentRef.current = null;
    }
  }, [selectedComponent]);
  
  // Inicializar estilos de componentes
  useEffect(() => {
    if (bannerConfig && bannerConfig.components && bannerConfig.components.length > 0) {
      // Esperar a que se renderice todo
      setTimeout(() => {
        initializeComponentStyles();
      }, 100);
    }
  }, [bannerConfig.components]);
  
  // Efecto para agregar el event listener para clics fuera del canvas
  useEffect(() => {
    // Crear una función de handler que cierre sobre el estado actual
    const handleOutsideClick = (e) => {
      // Verificar si hay un componente seleccionado
      if (!selectedComponent) return;
      
      // Función para comprobar si el clic fue en un componente
      const isComponentClick = (target) => {
        return target.closest('[data-component-id]') || 
               target.closest('[data-id]') ||
               target.closest('.banner-component') ||
               target.closest('.cursor-move') ||
               target.tagName === 'BUTTON' ||
               target.tagName === 'INPUT' ||
               target.tagName === 'SELECT';
      };
      
      // Función para comprobar si el clic fue en un panel de edición
      const isPanelClick = (target) => {
        return target.closest('.collapsible-panel') || 
               target.closest('.property-group') || 
               target.closest('.banner-properties') ||
               target.closest('.banner-sidebar') ||
               target.closest('.banner-property-panel');
      };
      
      // Casos donde debemos deseleccionar:
      // 1. Clic en el área vacía del canvas
      // 2. Clic en el contenedor del editor
      // 3. Clic en el área de fondo fuera del canvas
      
      // Si no fue en un componente ni en un panel, deseleccionar
      if (!isComponentClick(e.target) && !isPanelClick(e.target)) {
        setSelectedComponent(null);
      }
    };
    
    // Agregar listener al documento para detectar clics en cualquier lugar
    document.addEventListener('mousedown', handleOutsideClick);
    
    // Limpieza al desmontar
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [selectedComponent]); // Añadimos selectedComponent para que se actualice cuando cambie
  
  // Efecto para ajustar las dimensiones cuando cambia el tamaño de la ventana
  useEffect(() => {
    // Función para forzar actualización cuando cambia el tamaño de la ventana
    const handleResize = () => {
      // Forzar rerenderizado para recalcular dimensiones
      setPanelsConfig(prev => ({...prev}));
      
      // Ajustar posiciones de componentes
      adjustAllComponentsPositions();
    };
    
    // Añadir event listener para resize
    window.addEventListener('resize', handleResize);
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Implementamos los handlers para cambiar la visibilidad de los paneles
  const handlePanelVisibilityChange = (panelId, isVisible) => {
    setPanelsConfig(prev => {
      const newConfig = {
        ...prev,
        [panelId]: {
          ...prev[panelId],
          visible: isVisible
        }
      };
      
      // Guardar en localStorage
      savePanelsConfig(newConfig);
      
      return newConfig;
    });
  };

  // Handler para cambiar el ancho de un panel
  const handlePanelWidthChange = (panelId, width) => {
    setPanelsConfig(prev => {
      const newConfig = {
        ...prev,
        [panelId]: {
          ...prev[panelId],
          width: width
        }
      };
      
      // Guardar en localStorage
      savePanelsConfig(newConfig);
      
      return newConfig;
    });
  };

  // Handler para restablecer la configuración predeterminada
  const handleResetPanelsConfig = () => {
    setPanelsConfig(DEFAULT_PANELS_CONFIG);
    savePanelsConfig(DEFAULT_PANELS_CONFIG);
  };

  // Funciones para modo vista previa
  const togglePreviewMode = () => {
    if (!isPreviewMode) {
      // Guardar el estado actual de los paneles
      panelsBeforePreview.current = savePanelsState();
      
      // Ocultar todos los paneles de edición
      const newConfig = { ...panelsConfig };
      Object.keys(newConfig).forEach(key => {
        newConfig[key].visible = false;
      });
      setPanelsConfig(newConfig);
      
      // Activar modo vista previa
      setIsPreviewMode(true);
      
      // Forzar actualización de la interfaz
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    } else {
      // Desactivar modo vista previa
      setIsPreviewMode(false);
      
      // Restaurar la configuración de paneles anterior
      if (panelsBeforePreview.current) {
        const restoredConfig = { ...panelsConfig };
        Object.keys(panelsBeforePreview.current).forEach(key => {
          restoredConfig[key] = { ...panelsBeforePreview.current[key] };
        });
        setPanelsConfig(restoredConfig);
      }
      
      // Forzar actualización de la interfaz
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  };

  // Función helper para parsear dimensiones
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

  // Funciones para manejo de componentes (igual que en BannerEditor.jsx)
  const isChildComponent = (componentId) => {
    const findInComponents = (components) => {
      for (const comp of components) {
        if (comp.children && comp.children.length > 0) {
          for (const child of comp.children) {
            if (child.id === componentId) {
              return true;
            }
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

  const handleDeleteComponent = (componentId) => {
    if (isChildComponent(componentId)) {
      const isEssentialByAction = bannerConfig.components.some(comp => 
        comp.children?.some(child => 
          child.id === componentId && 
          child.action && 
          ['accept_all', 'reject_all', 'show_preferences'].includes(child.action.type)
        )
      );
      const isEssentialById = ['acceptBtn', 'rejectBtn', 'preferencesBtn', 'acceptAll', 'rejectAll', 'preferencesButton'].includes(componentId);
      const isEssential = isEssentialByAction || isEssentialById;
      
      if (isEssential) {
        unattachFromContainer(componentId);
      } else {
        deleteChildComponent(componentId);
      }
    } else {
      deleteComponent(componentId);
    }
  };

  const handleUpdateContent = (componentId, content) => {
    if (isChildComponent(componentId)) {
      updateChildContent(componentId, content);
    } else {
      updateComponentContent(componentId, content);
    }
  };

  const handleUpdateStyle = (componentId, style) => {
    // Encontrar el componente que estamos actualizando
    let component;
    let isChild = false;
    
    if (isChildComponent(componentId)) {
      isChild = true;
      // Buscar componente hijo en la estructura de componentes
      bannerConfig.components.forEach(comp => {
        if (comp.children) {
          comp.children.forEach(child => {
            if (child.id === componentId) {
              component = child;
            }
          });
        }
      });
    } else {
      // Buscar componente raíz
      component = bannerConfig.components.find(comp => comp.id === componentId);
    }
    
    // Aplicar el estilo normalmente
    if (isChild) {
      updateChildStyleForDevice(componentId, deviceView, style);
    } else {
      updateComponentStyleForDevice(componentId, deviceView, style);
    }
    
    // Si se cambia el ancho o alto, necesitamos asegurar que el componente siga dentro del banner
    if (component && (style.width || style.height)) {
      // Dar tiempo a que se aplique el estilo
      setTimeout(() => {
        // Obtener la posición actual
        const currentPosition = component.position?.[deviceView] || { top: '0px', left: '0px' };
        
        // Validar y ajustar la posición con las nuevas dimensiones
        const adjustedPosition = ensureComponentWithinBounds(
          componentId,
          currentPosition,
          style.width || component.style?.[deviceView]?.width || '100px',
          style.height || component.style?.[deviceView]?.height || '100px'
        );
        
        // Aplicar la posición ajustada si es diferente
        if (adjustedPosition.top !== currentPosition.top || adjustedPosition.left !== currentPosition.left) {
          if (isChild) {
            updateChildPositionForDevice(componentId, deviceView, adjustedPosition);
          } else {
            updateComponentPositionForDevice(componentId, deviceView, adjustedPosition);
          }
        }
      }, 50);
    }
  };

  const handleUpdatePosition = (componentId, position) => {
    
    // Comprobar que position es un objeto válido
    if (!position || typeof position !== 'object') {
      console.error('❌ handleUpdatePosition: position no es un objeto válido', position);
      return;
    }
    
    // Encontrar el componente que estamos actualizando
    let component;
    let isChild = false;
    
    if (isChildComponent(componentId)) {
      isChild = true;
      // Buscar componente hijo en la estructura de componentes
      bannerConfig.components.forEach(comp => {
        if (comp.children) {
          comp.children.forEach(child => {
            if (child.id === componentId) {
              component = child;
            }
          });
        }
      });
    } else {
      // Buscar componente raíz
      component = bannerConfig.components.find(comp => comp.id === componentId);
    }
    
    if (component) {
      // Obtener el ancho y alto actual del componente
      const deviceStyle = component.style?.[deviceView] || {};
      const width = deviceStyle.width || '100px';
      const height = deviceStyle.height || '100px';
      
      // Crear una posición segura (con valores por defecto si faltan)
      const safePosition = {
        top: component.position?.[deviceView]?.top || '0%',
        left: component.position?.[deviceView]?.left || '0%',
        ...position
      };
      
      
      // Validar y ajustar la posición
      const adjustedPosition = ensureComponentWithinBounds(componentId, safePosition, width, height);
      
      // Actualizar la posición ajustada
      if (isChild) {
        updateChildPositionForDevice(componentId, deviceView, adjustedPosition);
      } else {
        updateComponentPositionForDevice(componentId, deviceView, adjustedPosition);
      }
    } else {
      // Si no encontramos el componente, actualizar sin ajustar
      if (isChildComponent(componentId)) {
        updateChildPositionForDevice(componentId, deviceView, position);
      } else {
        updateComponentPositionForDevice(componentId, deviceView, position);
      }
    }
  };

  const handleSaveClick = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (saveInProgressRef.current || isSaving) {
      return;
    }
  
    try {
      if (!bannerName.trim()) {
        setNameError(true);
        return;
      }
      
      saveInProgressRef.current = true;
      setIsSaving(true);
      setSaveError(null);
      
      const configToSave = JSON.parse(JSON.stringify(bannerConfig));
      configToSave.name = bannerName.trim();
      
      if (isOwner) {
        configToSave.type = isSystemTemplate ? 'system' : 'custom';
        configToSave.isSystemTemplate = isSystemTemplate;
      }
      
      // Lógica para arreglar posiciones y configuraciones
      // (similar a la del componente BannerEditor original)
      
      // Verificar cada dispositivo
      ['desktop', 'tablet', 'mobile'].forEach(device => {
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
        }
      });
      
      let savedTemplate;
      
      if (initialConfig && initialConfig._id) {
        savedTemplate = await handleUpdate(initialConfig._id, configToSave);
      } else {
        const { _id, ...configWithoutId } = configToSave;
        savedTemplate = await handleSave(configWithoutId, isSystemTemplate);
      }
      
      if (typeof onSave === 'function') {
        onSave(savedTemplate);
      }
  
      if (savedTemplate && savedTemplate._id && (!initialConfig || !initialConfig._id)) {
        setInitialConfig({
          ...configToSave,
          _id: savedTemplate._id
        }, false);
      }
    } catch (error) {
      setSaveError(error.message || 'Error al guardar el banner');
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        saveInProgressRef.current = false;
      }, 500);
    }
  };

  
  // Función auxiliar para encontrar un componente por ID recursivamente
  const findComponentById = (components, componentId) => {
    if (!components || !Array.isArray(components)) return null;
    
    for (const comp of components) {
      if (comp.id === componentId) {
        return comp;
      }
      
      // Buscar en hijos si es contenedor
      if (comp.children && Array.isArray(comp.children)) {
        const found = findComponentById(comp.children, componentId);
        if (found) return found;
      }
    }
    
    return null;
  };

  // Función local para reordenar hijos de un contenedor - Versión para FullScreen
  const reorderContainerChildrenLocal = (containerId, newChildrenOrder) => {
    
    // Función recursiva para encontrar y actualizar el contenedor específico
    const updateComponents = (components) => {
      return components.map(comp => {
        // Si este es el contenedor que buscamos
        if (comp.id === containerId && comp.type === 'container') {
          
          // Crear una copia del componente con los nuevos hijos
          return {
            ...comp,
            children: [...newChildrenOrder]
          };
        }
        
        // Si este componente tiene hijos, buscar recursivamente
        if (comp.children && comp.children.length > 0) {
          const newChildren = updateComponents(comp.children);
          // Solo actualizar si realmente hubo cambios
          if (newChildren !== comp.children) {
            return {
              ...comp,
              children: newChildren
            };
          }
        }
        
        // No es el componente que buscamos, devolverlo sin cambios
        return comp;
      });
    };
    
    // Actualizar los componentes manteniendo la inmutabilidad
    const updatedComponents = updateComponents(bannerConfig.components);
    
    // Si no hubo cambios (contenedor no encontrado), mostrar error
    if (JSON.stringify(updatedComponents) === JSON.stringify(bannerConfig.components)) {
      console.error(`❌ Contenedor ${containerId} no encontrado o no se realizaron cambios`);
      return;
    }
    
    // Actualizar el estado completo del banner
    const updatedBannerConfig = {
      ...bannerConfig,
      components: updatedComponents
    };
    
    // Aplicar la actualización sin historial
    setInitialConfig(updatedBannerConfig, false);
    
    
    // Verificar que el componente seleccionado se actualizó si es necesario
    if (selectedComponent && selectedComponent.id === containerId) {
      // Buscar la versión actualizada del componente
      const updatedContainer = findComponentById(updatedComponents, containerId);
      if (updatedContainer) {
        setSelectedComponent(updatedContainer);
      }
    }
  };
  
  // Función para limpiar imágenes
  const handleCleanupImages = async () => {
    try {
      if (!bannerConfig._id) {
        alert("Debes guardar el banner antes de limpiar imágenes.");
        return;
      }
      
      if (isSaving || saveInProgressRef.current || isCleaningImages) {
        alert("Hay una operación en progreso. Por favor, espera antes de limpiar imágenes.");
        return;
      }
      
      const confirmed = window.confirm(
        "Esta acción eliminará permanentemente todas las imágenes que no estén siendo utilizadas en el banner. ¿Deseas continuar?"
      );
      
      if (!confirmed) return;
      
      setIsCleaningImages(true);
      setCleanupResult(null);
      setSaveError(null);
      
      // Limpieza de imágenes eliminada - se realiza automáticamente al eliminar banners
      toast.error('La limpieza manual de imágenes ha sido deshabilitada');
      
      if (response.status === 'success') {
        setCleanupResult({
          deleted: response.data.deleted,
          kept: response.data.kept
        });
        
        setTimeout(() => {
          setCleanupResult(null);
        }, 5000);
      }
    } catch (error) {
      setSaveError('Error al limpiar imágenes: ' + error.message);
    } finally {
      setIsCleaningImages(false);
    }
  };

  // Handlers para cambio de dimensiones
  const handleWidthUnitChange = (e) => {
    const unit = e.target.value;
    setWidthUnit(unit);
    
    // Obtener el tipo de banner actual
    const bannerType = bannerConfig.layout[deviceView]?.type || 'banner';
    
    if (unit === 'auto') {
      setWidthValue('');
      handleUpdateLayoutForDevice(deviceView, 'width', 'auto');
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

  const handleWidthValueChange = (e) => {
    const value = e.target.value;
    setWidthValue(value);
    
    const bannerType = bannerConfig.layout[deviceView]?.type || 'banner';
    
    if (widthUnit !== 'auto') {
      // Para valores porcentuales, aplicar límites según tipo de banner
      if (widthUnit === '%') {
        const numValue = parseInt(value);
        
        if (bannerType === 'modal') {
          // Limitar entre 40% y 90%
          const limitedValue = Math.max(40, Math.min(90, numValue || 60));
          setWidthValue(limitedValue.toString());
          handleUpdateLayoutForDevice(deviceView, 'width', `${limitedValue}%`);
          handleUpdateLayoutForDevice(deviceView, 'data-width', limitedValue.toString());
        } else if (bannerType === 'floating') {
          // Limitar entre 20% y 70%
          const limitedValue = Math.max(20, Math.min(70, numValue || 40));
          setWidthValue(limitedValue.toString());
          handleUpdateLayoutForDevice(deviceView, 'width', `${limitedValue}%`);
          handleUpdateLayoutForDevice(deviceView, 'data-width', limitedValue.toString());
        } else { // Banner estándar
          // Mantener a 100% para banners estándar
          setWidthValue('100');
          handleUpdateLayoutForDevice(deviceView, 'width', '100%');
          handleUpdateLayoutForDevice(deviceView, 'data-width', '100');
        }
      } else {
        // Para píxeles, validar que sea un número positivo
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue > 0) {
          // Aplicar paso de redimensión
          const adjustedValue = Math.round(numValue / resizeStep) * resizeStep;
          setWidthValue(adjustedValue.toString());
          handleUpdateLayoutForDevice(deviceView, 'width', `${adjustedValue}px`);
          handleUpdateLayoutForDevice(deviceView, 'data-width', adjustedValue.toString());
        } else {
          // Si el valor no es válido, mantener el anterior
          handleUpdateLayoutForDevice(deviceView, 'width', widthValue ? `${widthValue}px` : 'auto');
        }
      }
    } else {
      // Si la unidad es auto, no cambiar nada
      handleUpdateLayoutForDevice(deviceView, 'width', 'auto');
    }
    
    // Ajustar posiciones de todos los componentes para que se mantengan dentro del banner
    adjustAllComponentsPositions();
  };

  const handleHeightUnitChange = (e) => {
    const unit = e.target.value;
    setHeightUnit(unit);
    
    // Obtener el tipo de banner actual
    const bannerType = bannerConfig.layout[deviceView]?.type || 'banner';
    
    if (unit === 'auto') {
      setHeightValue('');
      handleUpdateLayoutForDevice(deviceView, 'height', 'auto');
      handleUpdateLayoutForDevice(deviceView, 'data-height', null);
    } else if (unit === '%') {
      // Establecer valores predeterminados según el tipo de banner
      let defaultHeightPercent;
      
      if (bannerType === 'modal') {
        defaultHeightPercent = 60;
      } else if (bannerType === 'floating') {
        defaultHeightPercent = 40;
      } else { // banner estándar
        // Permitir porcentajes para banners estándar también
        defaultHeightPercent = 20; // 20% para banners estándar como valor por defecto
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
          // Permitir cualquier porcentaje entre 5% y 100%
          const limitedValue = Math.max(5, Math.min(100, numValue || 20));
          setHeightValue(limitedValue.toString());
          handleUpdateLayoutForDevice(deviceView, 'height', `${limitedValue}%`);
          handleUpdateLayoutForDevice(deviceView, 'data-height', limitedValue.toString());
          // Importante: establecer el valor de altura para los banners estándar
          handleUpdateLayoutForDevice(deviceView, 'min-height', '30px');
        }
      } else {
        // Para píxeles, validar que sea un número positivo
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue > 0) {
          // Aplicar paso de redimensión
          const adjustedValue = Math.round(numValue / resizeStep) * resizeStep;
          // Mantener un mínimo razonable
          const minHeight = 30; // Mínimo de 30px
          const limitedValue = Math.max(minHeight, adjustedValue);
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
    
    // Ajustar posiciones de todos los componentes para que se mantengan dentro del banner
    adjustAllComponentsPositions();
  };

  // Handler para margen flotante
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
  };

  // Handler para cambiar esquina flotante
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
  };

  // Handler para cambiar paso de movimiento
  const handleMoveStepChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 20) {
      setMoveStep(value);
      localStorage.setItem('bannerEditor_moveStep', value.toString());
    }
  };

  // Handler para cambiar paso de redimensión
  const handleResizeStepChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 20) {
      setResizeStep(value);
      localStorage.setItem('bannerEditor_resizeStep', value.toString());
    }
  };

  // Función para ajustar canvas según tipo de banner
  const getCanvasClasses = () => {
    let classes = 'banner-canvas';
    
    // Aplicar clase según tipo de banner
    const bannerType = bannerConfig.layout[deviceView]?.type || 'banner';
    classes += ` canvas-${bannerType}`;
    
    // Aplicar clase según dispositivo
    classes += ` canvas-${deviceView}`;
    
    // Aplicar clase si está en modo vista previa
    if (isPreviewMode) {
      classes += ' canvas-preview';
    }
    
    return classes;
  };
  
  // Función para reposicionar todos los componentes después de un cambio de dimensiones
  const adjustAllComponentsPositions = () => {
    // Dar tiempo a que se aplique el cambio de dimensiones
    setTimeout(() => {
      console.log('🔄 FullScreenBannerEditor: adjustAllComponentsPositions ejecutándose para deviceView:', deviceView);
      
      // Ajustar posición de componentes raíz
      bannerConfig.components.forEach(component => {
        if (!component.parentId) { // Solo componentes raíz
          const deviceStyle = component.style?.[deviceView] || {};
          const currentPosition = component.position?.[deviceView] || { top: '0px', left: '0px' };
          
          if (component.id === 'preferencesBtn' || component.id.includes('preferences') || component.action?.type === 'show_preferences') {
            console.log(`📍 PREFERENCIAS Revisando posición del componente ${component.id}:`, JSON.stringify(currentPosition, null, 2));
            console.log(`📍 PREFERENCIAS Style del componente:`, JSON.stringify(deviceStyle, null, 2));
          }
          
          // SKIP: Si es botón de preferencias y tiene posición válida, no ajustar
          const isPreferencesButton = component.id === 'preferencesBtn' || 
                                      component.id.includes('preferences') || 
                                      component.action?.type === 'show_preferences';
          
          if (isPreferencesButton) {
            // Para botones de preferencias, solo validar si realmente están fuera de límites
            const hasValidPosition = currentPosition.top !== '0px' && 
                                   currentPosition.left !== '0px' && 
                                   currentPosition.top !== '0%' && 
                                   currentPosition.left !== '0%';
            
            if (hasValidPosition) {
              console.log(`🔒 PREFERENCIAS ${component.id}: Saltando ajuste, posición válida encontrada`);
              return; // Saltar este componente
            }
          }
          
          const adjustedPosition = ensureComponentWithinBounds(
            component.id,
            currentPosition,
            deviceStyle.width || '100px',
            deviceStyle.height || '100px'
          );
          
          // Aplicar la posición ajustada SOLO si es realmente diferente y está fuera de límites
          if (adjustedPosition.top !== currentPosition.top || adjustedPosition.left !== currentPosition.left) {
            if (isPreferencesButton) {
              console.log(`⚠️ PREFERENCIAS Componente ${component.id} fuera de límites. Aplicando cambio...`);
              console.log(`⚠️ PREFERENCIAS Original:`, JSON.stringify(currentPosition, null, 2));
              console.log(`⚠️ PREFERENCIAS Adjusted:`, JSON.stringify(adjustedPosition, null, 2));
            }
            updateComponentPositionForDevice(component.id, deviceView, adjustedPosition);
          }
        }
        
        // Ajustar posición de componentes hijos si hay
        if (component.children && component.children.length > 0) {
          component.children.forEach(child => {
            const childStyle = child.style?.[deviceView] || {};
            const childPosition = child.position?.[deviceView] || { top: '0px', left: '0px' };
            
            const adjustedChildPosition = ensureComponentWithinBounds(
              child.id,
              childPosition,
              childStyle.width || '100px',
              childStyle.height || '100px'
            );
            
            // Aplicar la posición ajustada SOLO si es realmente diferente
            if (adjustedChildPosition.top !== childPosition.top || adjustedChildPosition.left !== childPosition.left) {
              console.log(`⚠️ Componente hijo ${child.id} fuera de límites. Ajustando de:`, childPosition, 'a:', adjustedChildPosition);
              updateChildPositionForDevice(child.id, deviceView, adjustedChildPosition);
            }
          });
        }
      });
    }, 100);
  };
  
  // Función para validar y ajustar la posición de un componente para que siempre esté dentro del banner
  const ensureComponentWithinBounds = (componentId, position, componentWidth, componentHeight) => {
    // Solo log para botón de preferencias para debugging específico
    if (componentId === 'preferencesBtn' || (componentId && componentId.includes('preferences'))) {
      console.log(`🔧 PREFERENCIAS ensureComponentWithinBounds: ${componentId}`);
      console.log('   originalPosition:', JSON.stringify(position, null, 2));
      console.log('   componentWidth:', componentWidth);
      console.log('   componentHeight:', componentHeight);
    }
    
    // Verificar que position es un objeto válido
    if (!position || typeof position !== 'object') {
      console.error('❌ ensureComponentWithinBounds: position no es un objeto válido', position);
      // Devolver posición por defecto para evitar errores
      return { top: '0%', left: '0%' };
    }
    
    // Obtener dimensiones del banner - intentar múltiples selectores
    const canvas = document.querySelector('.banner-canvas') || 
                   document.querySelector('.fullscreen-preview') || 
                   document.querySelector('[data-canvas="true"]') ||
                   document.querySelector('.preview-container');
    
    let canvasWidth, canvasHeight;
    
    if (!canvas) {
      // Si no hay canvas, usar dimensiones por defecto
      canvasWidth = 1200;
      canvasHeight = 800;
      if (componentId === 'preferencesBtn' || (componentId && componentId.includes('preferences'))) {
        console.log(`⚠️ PREFERENCIAS ${componentId}: Canvas no encontrado, usando dimensiones por defecto: ${canvasWidth}x${canvasHeight}`);
      }
    } else {
      const canvasRect = canvas.getBoundingClientRect();
      canvasWidth = canvasRect.width || 1200;
      canvasHeight = canvasRect.height || 800;
      if (componentId === 'preferencesBtn' || (componentId && componentId.includes('preferences'))) {
        console.log(`✅ PREFERENCIAS ${componentId}: Canvas encontrado, dimensiones: ${canvasWidth}x${canvasHeight}, selector: ${canvas.className}`);
      }
    }
    
    // Crear una copia del objeto position para no modificar el original
    const adjustedPosition = {...position};
    
    // Verificar propiedades necesarias y asignar valores por defecto
    if (!position.hasOwnProperty('top') || position.top === undefined || position.top === null) {
      adjustedPosition.top = '0%';
    }
    
    if (!position.hasOwnProperty('left') || position.left === undefined || position.left === null) {
      adjustedPosition.left = '0%';
    }
    
    // Convertir valores a píxeles para la validación
    let left = 0;
    let top = 0;
    
    try {
      // Manejar valores en porcentaje
      if (typeof position.left === 'string' && position.left.includes('%')) {
        const percentLeft = parseFloat(position.left);
        left = (percentLeft / 100) * canvasWidth;
      } else {
        // Manejar valores en píxeles
        left = parseFloat(position.left);
      }
      
      if (typeof position.top === 'string' && position.top.includes('%')) {
        const percentTop = parseFloat(position.top);
        top = (percentTop / 100) * canvasHeight;
      } else {
        // Manejar valores en píxeles
        top = parseFloat(position.top);
      }
    } catch (error) {
      console.error('❌ Error al parsear valores de posición:', error);
    }
    
    // Si left o top no son números válidos, asignar valores por defecto
    if (isNaN(left)) left = 0;
    if (isNaN(top)) top = 0;
    
    // Convertir width y height a números
    let width = 100;
    let height = 100;
    
    try {
      width = parseFloat(componentWidth) || 100;
      height = parseFloat(componentHeight) || 100;
    } catch (error) {
      console.error('❌ Error al parsear dimensiones del componente:', error);
    }
    
    // Calcular los límites
    const maxLeft = canvasWidth - width;
    const maxTop = canvasHeight - height;
    
    // Detectar si los valores originales están en porcentaje
    const leftIsPercent = typeof position.left === 'string' && position.left.includes('%');
    const topIsPercent = typeof position.top === 'string' && position.top.includes('%');
    
    // Ajustar left si es necesario
    if (left < 0) {
      adjustedPosition.left = leftIsPercent ? '0%' : '0px';
    } else if (left > maxLeft) {
      if (leftIsPercent) {
        // Mantener en porcentaje
        const percentLeft = Math.min(95, (maxLeft / canvasWidth) * 100);
        adjustedPosition.left = `${percentLeft.toFixed(2)}%`;
      } else {
        // Mantener en píxeles
        adjustedPosition.left = `${maxLeft}px`;
      }
    }
    
    // Ajustar top si es necesario
    if (top < 0) {
      adjustedPosition.top = topIsPercent ? '0%' : '0px';
    } else if (top > maxTop) {
      if (topIsPercent) {
        // Mantener en porcentaje
        const percentTop = Math.min(95, (maxTop / canvasHeight) * 100);
        adjustedPosition.top = `${percentTop.toFixed(2)}%`;
      } else {
        // Mantener en píxeles
        adjustedPosition.top = `${maxTop}px`;
      }
    }
    
    // Log del resultado (solo para botón de preferencias)
    const wasAdjusted = adjustedPosition.left !== position.left || adjustedPosition.top !== position.top;
    if (componentId === 'preferencesBtn' || (componentId && componentId.includes('preferences'))) {
      if (wasAdjusted) {
        console.log(`🔧 PREFERENCIAS ${componentId}: Posición ajustada`);
        console.log(`   FROM: left=${position.left}, top=${position.top}`);
        console.log(`   TO: left=${adjustedPosition.left}, top=${adjustedPosition.top}`);
        console.log(`   PIXELS: left=${left}px, top=${top}px`);
        console.log(`   LIMITS: maxLeft=${maxLeft}px, maxTop=${maxTop}px`);
        console.log(`   CANVAS: ${canvasWidth}x${canvasHeight}px`);
        console.log(`   REASON: ${left < 0 || top < 0 ? 'negative position' : 'out of bounds'}`);
      } else {
        console.log(`✅ PREFERENCIAS ${componentId}: Posición válida, no se requiere ajuste`);
        console.log(`   POSITION: left=${position.left}, top=${position.top}`);
        console.log(`   PIXELS: left=${left}px, top=${top}px`);
        console.log(`   LIMITS: maxLeft=${maxLeft}px, maxTop=${maxTop}px`);
        console.log(`   CANVAS: ${canvasWidth}x${canvasHeight}px`);
      }
    }
    
    return adjustedPosition;
  };
  
  // Función para obtener estilos adicionales del canvas según la configuración
  const getCanvasStyles = () => {
    const layout = bannerConfig.layout[deviceView] || {};
    const baseStyles = { 
      flex: 1, 
      overflow: 'auto', 
      position: 'relative' 
    };
    
    // Si el banner tiene altura definida en porcentaje, aplicarla al canvas
    if (layout.height && typeof layout.height === 'string' && layout.height.includes('%')) {
      // Extraer el valor numérico del porcentaje
      const percentValue = parseFloat(layout.height);
      if (!isNaN(percentValue)) {
        // Calcular altura en porcentaje de la ventana
        const viewportHeight = window.innerHeight;
        const calculatedHeight = `${Math.floor(viewportHeight * percentValue / 100)}px`;
        
        // Para banners de tipo estándar, aplicar altura directamente al canvas
        if (layout.type === 'banner') {
          baseStyles.height = calculatedHeight;
          baseStyles.minHeight = calculatedHeight;
        }
      }
    }
    
    return baseStyles;
  };
  
  
  // Función para guardar estado de paneles antes de entrar en vista previa
  const savePanelsState = () => {
    return {
      components: {...panelsConfig.components},
      layers: {...panelsConfig.layers},
      tools: {...panelsConfig.tools},
      properties: {...panelsConfig.properties},
      name: {...panelsConfig.name}
    };
  };

  return (
    <div className={`fullscreen-editor ${isPreviewMode ? 'editor-preview-mode' : ''}`} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', zIndex: 9999, backgroundColor: '#f0f0f0' }}>
      {/* Panel 1: Barra de herramientas superior */}
      {panelsConfig.tools.visible && !isPreviewMode && (
        <div className="editor-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: '#ffffff', borderBottom: '1px solid #e0e0e0', height: '60px' }}>
          <div className="toolbar-left">
            <button onClick={onBack} className="back-button">
              <ChevronLeft size={18} />
              <span>Volver</span>
            </button>
            <h2>Editor de Banner</h2>
          </div>
          
          <div className="toolbar-center">
            <div className="device-selector">
              <button 
                className={`device-button ${deviceView === 'desktop' ? 'active' : ''}`}
                onClick={() => setDeviceView('desktop')}
                title="Vista Escritorio"
              >
                <Monitor size={18} />
              </button>
              <button 
                className={`device-button ${deviceView === 'tablet' ? 'active' : ''}`}
                onClick={() => setDeviceView('tablet')}
                title="Vista Tablet"
              >
                <Tablet size={18} />
              </button>
              <button 
                className={`device-button ${deviceView === 'mobile' ? 'active' : ''}`}
                onClick={() => setDeviceView('mobile')}
                title="Vista Móvil"
              >
                <Smartphone size={18} />
              </button>
            </div>
            
            
            <button 
              onClick={() => setShowLayersPanel(!showLayersPanel)}
              className={`toolbar-button ${showLayersPanel ? 'active' : ''}`}
              title="Panel de Capas"
            >
              <Layers size={18} />
              <span>Capas</span>
            </button>
            
            <button 
              onClick={() => setPanelConfigOpen(true)}
              className="toolbar-button"
              title="Configuración de Paneles"
            >
              <Settings size={18} />
              <span>Paneles</span>
            </button>
          </div>
          
          <div className="toolbar-right">
            <button 
              onClick={togglePreviewMode}
              className={`preview-button ${isPreviewMode ? 'active' : ''}`}
              title="Vista previa"
            >
              <Eye size={18} />
              <span>Vista previa</span>
            </button>
            
            {/* Panel de configuración de traducción */}
            <div className="relative">
              <TranslationConfigPanel
                translationConfig={translationConfig}
                updateTranslationConfig={updateTranslationConfig}
                setSourceLanguage={setSourceLanguage}
                setTargetLanguages={setTargetLanguages}
                toggleAutoTranslate={toggleAutoTranslate}
                isAutoTranslating={isAutoTranslating}
              />
            </div>
            
            {bannerConfig._id && (
              <button 
                onClick={handleCleanupImages}
                disabled={isSaving || isCleaningImages || saveInProgressRef.current}
                className="cleanup-button"
                title="Limpiar imágenes no utilizadas"
              >
                <Trash2 size={18} />
                <span>{isCleaningImages ? 'Limpiando...' : 'Limpiar imágenes'}</span>
              </button>
            )}
            
            
            <button 
              onClick={handleSaveClick}
              disabled={isSaving || saveInProgressRef.current}
              className="save-button"
              title="Guardar"
            >
              <Save size={18} />
              <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Panel 2: Nombre del banner */}
      {panelsConfig.name.visible && !isPreviewMode && (
        <div className="banner-name-panel" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#f8f8f8', borderBottom: '1px solid #e0e0e0' }}>
          <div className="name-input-container">
            <label className="name-label">Nombre del banner:</label>
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
              className={`name-input ${nameError ? 'error' : ''}`}
            />
            {nameError && (
              <span className="name-error">El nombre es obligatorio</span>
            )}
          </div>
          
          {isOwner && (
            <div className="system-template-toggle">
              <input
                type="checkbox"
                id="system-template"
                checked={isSystemTemplate}
                onChange={(e) => setIsSystemTemplate(e.target.checked)}
                className="system-toggle"
              />
              <label htmlFor="system-template" className="system-label">
                Plantilla del sistema (visible para todos los clientes)
              </label>
            </div>
          )}
          
          {saveError && (
            <div className="save-error">
              {saveError}
            </div>
          )}
          
          {cleanupResult && (
            <div className="cleanup-result">
              Limpieza completada: {cleanupResult.deleted} imágenes eliminadas, {cleanupResult.kept} conservadas.
            </div>
          )}
        </div>
      )}
      
      {/* Contenedor principal para los paneles laterales y el canvas */}
      <div className="editor-main" style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', height: isPreviewMode ? '100vh' : 'calc(100vh - 160px)' }}>
        {/* Panel de componentes (izquierda) */}
        {panelsConfig.components.visible && !isPreviewMode && (
          <CollapsiblePanel 
            id="components" 
            title={selectedComponent ? "Propiedades" : "Componentes"} 
            position="left"
            width={panelsConfig.components.width}
            resizable={panelsConfig.components.resizable}
            minWidth={panelsConfig.components.minWidth}
            maxWidth={panelsConfig.components.maxWidth}
            defaultExpanded={true}
            onToggle={(isExpanded) => {
              const newConfig = { ...panelsConfig };
              newConfig.components.expanded = isExpanded;
              setPanelsConfig(newConfig);
              savePanelsConfig(newConfig);
              
              // Si se seleccionó un componente y el panel está cerrado, abrirlo
              if (selectedComponent && !isExpanded) {
                setTimeout(() => {
                  const newConfig = { ...panelsConfig };
                  newConfig.components.expanded = true;
                  setPanelsConfig(newConfig);
                  savePanelsConfig(newConfig);
                }, 0);
              }
            }}
          >
            {selectedComponent ? (
              <BannerPropertyPanel
                component={selectedComponent}
                bannerConfig={bannerConfig}
                deviceView={deviceView}
                onUpdateContent={handleUpdateContent}
                onUpdateStyle={handleUpdateStyle}
                onUpdatePosition={handleUpdatePosition}
                onClose={() => setSelectedComponent(null)}
                onAddChild={addChildToContainer}
                onRemoveChild={removeChildFromContainer}
                onReorderChildren={reorderContainerChildrenLocal}
                onUpdateContainer={updateContainerConfig}
                onSelectComponent={setSelectedComponent}
                onUnattach={unattachFromContainer}
                selectedComponent={selectedComponent}
              />
            ) : (
              <BannerSidebar bannerConfig={bannerConfig} />
            )}
          </CollapsiblePanel>
        )}
        
        {/* Contenedor central (canvas + propiedades del banner) */}
        <div 
          className="editor-center" 
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
          onClick={(e) => {
            // Si se hace clic directamente en el contenedor, deseleccionar
            if (e.target.classList.contains('editor-center')) {
              setSelectedComponent(null);
            }
          }}
        >
          {/* Panel 3: Propiedades del banner */}
          {panelsConfig.properties.visible && !isPreviewMode && (
            <div className="banner-properties" style={{ display: 'flex', padding: '1rem', backgroundColor: '#f8f8f8', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="property-group">
                <label>Tipo:</label>
                <select 
                  value={bannerConfig.layout[deviceView]?.type || 'banner'}
                  onChange={(e) => {
                    handleUpdateLayoutForDevice(deviceView, 'type', e.target.value);
                    
                    // Aplicar valores por defecto según el tipo
                    if (e.target.value === 'modal') {
                      setWidthUnit('%');
                      setWidthValue('60');
                      handleUpdateLayoutForDevice(deviceView, 'width', '60%');
                      handleUpdateLayoutForDevice(deviceView, 'min-width', '40%');
                      handleUpdateLayoutForDevice(deviceView, 'max-width', '90%');
                      handleUpdateLayoutForDevice(deviceView, 'data-width', '60');
                    } else if (e.target.value === 'floating') {
                      setWidthUnit('%');
                      setWidthValue('50');
                      handleUpdateLayoutForDevice(deviceView, 'width', '50%');
                      handleUpdateLayoutForDevice(deviceView, 'min-width', '40%');
                      handleUpdateLayoutForDevice(deviceView, 'max-width', '70%');
                      handleUpdateLayoutForDevice(deviceView, 'data-width', '50');
                      
                      // Valores por defecto para floating
                      handleUpdateLayoutForDevice(deviceView, 'floatingCorner', floatingCorner);
                      handleUpdateLayoutForDevice(deviceView, 'data-floating-corner', floatingCorner);
                      handleUpdateLayoutForDevice(deviceView, 'position', floatingCorner);
                      handleUpdateLayoutForDevice(deviceView, 'floatingMargin', floatingMargin);
                      handleUpdateLayoutForDevice(deviceView, 'data-floating-margin', floatingMargin);
                    } else { // banner estándar
                      setWidthUnit('%');
                      setWidthValue('100');
                      handleUpdateLayoutForDevice(deviceView, 'width', '100%');
                    }
                  }}
                  className="property-select"
                >
                  <option value="banner">Banner</option>
                  <option value="modal">Modal</option>
                  <option value="floating">Flotante</option>
                </select>
              </div>
              
              <div className="property-group">
                <label>Posición:</label>
                {bannerConfig.layout[deviceView]?.type === 'floating' ? (
                  <select 
                    value={floatingCorner}
                    onChange={handleFloatingCornerChange}
                    className="property-select"
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
                    className="property-select"
                  >
                    <option value="top">Superior</option>
                    <option value="bottom">Inferior</option>
                    <option value="center">Centro</option>
                  </select>
                )}
              </div>
              
              <div className="property-group">
                <label>Color de fondo:</label>
                <div className="color-picker-container">
                  <div 
                    className="color-preview" 
                    style={{ 
                      backgroundColor: bannerConfig.layout[deviceView]?.backgroundColor || '#ffffff',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      width: '30px',
                      height: '30px',
                      display: 'inline-block',
                      marginRight: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById('background-color-picker').click()}
                  />
                  <input
                    id="background-color-picker"
                    type="color"
                    value={bannerConfig.layout[deviceView]?.backgroundColor || '#ffffff'}
                    onChange={(e) => handleUpdateLayoutForDevice(deviceView, 'backgroundColor', e.target.value)}
                    className="color-picker"
                    style={{ 
                      opacity: 0,
                      position: 'absolute',
                      width: '1px',
                      height: '1px',
                      overflow: 'hidden'
                    }}
                  />
                  <input 
                    type="text"
                    value={bannerConfig.layout[deviceView]?.backgroundColor || '#ffffff'}
                    onChange={(e) => {
                      // Validar formato de color hexadecimal
                      const colorRegex = /^#([A-Fa-f0-9]{3}){1,2}$/;
                      if (colorRegex.test(e.target.value) || e.target.value.startsWith('#')) {
                        handleUpdateLayoutForDevice(deviceView, 'backgroundColor', e.target.value);
                      }
                    }}
                    className="color-input"
                    style={{
                      width: '80px',
                      padding: '4px 6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>
              
              <div className="property-group">
                <label>Ancho:</label>
                <div className="dimension-control">
                  <select
                    value={widthUnit}
                    onChange={handleWidthUnitChange}
                    className="unit-select"
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
                      className="dimension-input"
                      placeholder="ej: 500"
                      min={bannerConfig.layout[deviceView]?.type === 'modal' || bannerConfig.layout[deviceView]?.type === 'floating' ? 40 : 1}
                      max={bannerConfig.layout[deviceView]?.type === 'modal' ? 90 : 
                           bannerConfig.layout[deviceView]?.type === 'floating' ? 70 : 100}
                    />
                  )}
                </div>
              </div>
              
              <div className="property-group">
                <label>Alto:</label>
                <div className="dimension-control">
                  <select
                    value={heightUnit}
                    onChange={handleHeightUnitChange}
                    className="unit-select"
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
                      className="dimension-input"
                      placeholder="ej: 200"
                    />
                  )}
                </div>
              </div>
              
              {/* Configuraciones específicas para banners flotantes */}
              {bannerConfig.layout[deviceView]?.type === 'floating' && (
                <div className="property-group">
                  <label>Margen:</label>
                  <div className="dimension-control">
                    <input
                      type="number"
                      value={floatingMargin}
                      onChange={handleFloatingMarginValueChange}
                      className="dimension-input"
                      placeholder="ej: 20"
                      min={0}
                      max={100}
                    />
                    <span className="unit-label">px</span>
                  </div>
                  <span className="help-text">Distancia desde el borde de la pantalla</span>
                </div>
              )}
              
              {/* Controles para paso de movimiento y redimensión movidos a un panel específico 
                  para evitar duplicación con los controles del componente seleccionado */}
            </div>
          )}
          
          {/* Canvas del editor */}
          {isPreviewMode ? (
            <FullScreenPreview 
              bannerConfig={bannerConfig}
              deviceView={deviceView}
              onClose={togglePreviewMode}
              onDeviceChange={setDeviceView}
            />
          ) : (
            <div 
              className={getCanvasClasses()} 
              style={getCanvasStyles()}
              onClick={(e) => {
                // Verificar si el clic fue en un componente o en un elemento específico
                const isSpecificElement = e.target.closest('[data-component-id]') || 
                                        e.target.closest('[data-id]') ||
                                        e.target.closest('.banner-component') ||
                                        e.target.closest('.cursor-move') ||
                                        e.target.tagName === 'BUTTON';
                
                // Si no fue en ningún elemento específico, deseleccionar
                if (!isSpecificElement) {
                  setSelectedComponent(null);
                }
              }}
            >
              <BannerCanvas
                bannerConfig={bannerConfig}
                deviceView={deviceView}
                selectedComponent={selectedComponent}
                setSelectedComponent={setSelectedComponent}
                onAddComponent={addComponent}
                onDeleteComponent={handleDeleteComponent}
                onUpdatePosition={handleUpdatePosition}
                onUpdateContent={handleUpdateContent}
                onUpdateStyle={handleUpdateStyle}
                onUpdateChildStyle={updateChildStyleForDevice}
                onAddChild={addChildToContainer}
                onMoveToContainer={moveComponentToContainer}
                onUpdateChildPosition={updateChildPosition}
                onRemoveChild={removeChildFromContainer}
                onUpdateComponent={updateComponentContent}
                onUnattachFromContainer={unattachFromContainer}
                moveStep={moveStep}
                resizeStep={resizeStep}
              />
            </div>
          )}
        </div>
        
        {/* Panel de capas (derecha) */}
        {panelsConfig.layers.visible && showLayersPanel && !isPreviewMode && (
          <CollapsiblePanel 
            id="layers" 
            title="Capas" 
            position="right"
            width={panelsConfig.layers.width}
            resizable={panelsConfig.layers.resizable}
            minWidth={panelsConfig.layers.minWidth}
            maxWidth={panelsConfig.layers.maxWidth}
            onToggle={(isExpanded) => {
              const newConfig = { ...panelsConfig };
              newConfig.layers.expanded = isExpanded;
              setPanelsConfig(newConfig);
              savePanelsConfig(newConfig);
            }}
          >
            <LayersPanel
              bannerConfig={bannerConfig}
              selectedComponent={selectedComponent}
              onSelectComponent={setSelectedComponent}
              onToggleComponentVisibility={handleToggleComponentVisibility}
              onToggleComponentLock={handleToggleComponentLock}
              onRenameComponent={handleRenameComponent}
              onReorderComponents={handleReorderComponents}
              onDeleteComponent={handleDeleteComponent}
              onMoveToContainer={moveComponentToContainer}
              onMoveOutOfContainer={moveComponentOutOfContainer}
              onClose={() => setShowLayersPanel(false)}
            />
          </CollapsiblePanel>
        )}
      </div>
      
      {/* Modal de configuración de paneles */}
      <PanelConfigModal
        isOpen={isPanelConfigOpen}
        onClose={() => setPanelConfigOpen(false)}
        panels={panelsConfig}
        onPanelVisibilityChange={handlePanelVisibilityChange}
        onPanelWidthChange={handlePanelWidthChange}
        onResetPanels={handleResetPanelsConfig}
      />
      
      
      {/* Estilos CSS para el editor a pantalla completa */}
      <style>{`
        .fullscreen-editor {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f5f5f7;
          z-index: 1000;
          overflow: hidden;
        }
        
        /* Estilos para la barra de herramientas */
        .editor-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: #ffffff;
          border-bottom: 1px solid #e0e0e0;
          height: 60px;
        }
        
        .toolbar-left,
        .toolbar-center,
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .back-button,
        .toolbar-button,
        .preview-button,
        .cleanup-button,
        .save-button {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
          background-color: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        
        .back-button:hover,
        .toolbar-button:hover {
          background-color: #f5f5f7;
        }
        
        .toolbar-button.active {
          background-color: #e0e7ff;
          color: #4f46e5;
          border-color: #818cf8;
        }
        
        .preview-button {
          background-color: #4a6cf7;
          color: white;
          border-color: #4a6cf7;
        }
        
        .preview-button:hover {
          background-color: #3a5ce5;
        }
        
        .preview-button.active {
          background-color: #2d4bcc;
        }
        
        .cleanup-button {
          background-color: #f59e0b;
          color: white;
          border-color: #f59e0b;
        }
        
        .cleanup-button:hover {
          background-color: #d97706;
        }
        
        .export-button {
          background-color: #6366f1;
          color: white;
          border-color: #6366f1;
        }
        
        .export-button:hover {
          background-color: #4f46e5;
        }
        
        .save-button {
          background-color: #10b981;
          color: white;
          border-color: #10b981;
        }
        
        .save-button:hover {
          background-color: #059669;
        }
        
        .device-selector {
          display: flex;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .device-button {
          padding: 0.5rem;
          background-color: #ffffff;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .device-button.active {
          background-color: #f0f0f0;
          color: #4a6cf7;
        }
        
        .controls-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-left: 1rem;
          border-left: 1px solid #e0e0e0;
          padding-left: 1rem;
        }
        
        .control-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          white-space: nowrap;
          color: #6b7280;
        }
        
        .step-input {
          width: 2.5rem;
          padding: 0.25rem;
          border: 1px solid #e0e0e0;
          border-radius: 3px;
          font-size: 0.75rem;
          text-align: center;
        }
        
        /* Estilos para el panel de nombre */
        .banner-name-panel {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          padding: 0.75rem 1rem;
          background-color: #f8f8f8;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .name-input-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }
        
        .name-label {
          font-weight: 500;
          font-size: 0.875rem;
          white-space: nowrap;
        }
        
        .name-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        
        .name-input.error {
          border-color: #ef4444;
          background-color: #fee2e2;
        }
        
        .name-error {
          color: #ef4444;
          font-size: 0.75rem;
          margin-left: 0.5rem;
        }
        
        .system-template-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-left: 1.5rem;
        }
        
        .system-label {
          font-size: 0.875rem;
        }
        
        .save-error {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: #fee2e2;
          border: 1px solid #ef4444;
          border-radius: 4px;
          color: #b91c1c;
          font-size: 0.875rem;
        }
        
        .cleanup-result {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: #d1fae5;
          border: 1px solid #10b981;
          border-radius: 4px;
          color: #047857;
          font-size: 0.875rem;
        }
        
        /* Estilos para el contenedor principal */
        .editor-main {
          display: flex;
          flex: 1;
          overflow: hidden;
          position: relative;
          height: calc(100vh - 140px); /* Resta la altura de los paneles superiores */
        }
        
        /* Estilos para el contenedor central */
        .editor-center {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }
        
        /* Estilos para el panel de propiedades del banner */
        .banner-properties {
          padding: 1rem;
          background-color: #f8f8f8;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .property-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .property-group label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
        }
        
        .property-select,
        .dimension-input,
        .unit-select {
          padding: 0.375rem 0.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 0.875rem;
          background-color: #ffffff;
        }
        
        .color-picker-container {
          display: flex;
          align-items: center;
          position: relative;
        }
        
        .color-preview {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .color-preview:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        
        .color-input {
          transition: border-color 0.2s;
        }
        
        .color-input:focus {
          outline: none;
          border-color: #4a6cf7;
        }
        
        .dimension-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .dimension-input {
          width: 4rem;
        }
        
        .unit-label {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .help-text {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }
        
        /* Estilos para el canvas */
        .banner-canvas {
          flex: 1;
          overflow: auto;
          background-color: #f0f0f0;
          display: flex;
          justify-content: center;
          padding: 2rem;
          position: relative;
          min-height: 400px;
          min-width: 600px;
        }
        
        /* Corrección para mostrar todos los elementos */
        .fullscreen-editor {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          display: flex !important;
          flex-direction: column !important;
          z-index: 9999 !important;
          background-color: #f0f0f0 !important;
        }
        
        .editor-toolbar,
        .banner-name-panel,
        .banner-properties {
          display: flex !important;
        }
        
        .editor-main {
          display: flex !important;
          flex: 1 !important;
          overflow: hidden !important;
        }
        
        /* Estilos específicos por tipo de banner en el canvas */
        .canvas-modal {
          background-color: rgba(0, 0, 0, 0.2);
        }
        
        .canvas-floating {
          background-color: #f0f0f0;
        }
        
        /* Estilos específicos por dispositivo */
        .canvas-desktop {
          padding: 2rem;
        }
        
        .canvas-tablet {
          max-width: 900px;
          margin: 0 auto;
          padding: 1.5rem;
        }
        
        .canvas-mobile {
          max-width: 450px;
          margin: 0 auto;
          padding: 1rem;
        }
        
        /* Asegurar que los paneles laterales sean visibles */
        .collapsible-panel {
          display: flex !important;
          z-index: 100;
        }
        
        /* Asegurar que el contenedor principal tenga altura correcta */
        .editor-center {
          flex: 1;
          position: relative;
          z-index: 5;
        }
        
        /* Estilos para el modo vista previa */
        .canvas-preview {
          padding: 0;
          max-width: none;
          margin: 0;
          overflow: hidden;
        }
        
        /* Ajustes para integración con FullScreenPreview */
        .fullscreen-editor .fullscreen-preview {
          z-index: 9999 !important;
        }
        
        /* Asegurar que el componente FullScreenPreview tenga mayor z-index */
        .fullscreen-preview {
          z-index: 9999 !important;
        }
        
        /* Estilo para cuando el editor está en modo vista previa */
        .editor-preview-mode .editor-toolbar,
        .editor-preview-mode .banner-name-panel,
        .editor-preview-mode .banner-properties,
        .editor-preview-mode .collapsible-panel {
          display: none !important;
        }
        
        /* Estilos para el canvas */
      `}</style>
    </div>
  );
}

// Export the component
export default FullScreenBannerEditor;