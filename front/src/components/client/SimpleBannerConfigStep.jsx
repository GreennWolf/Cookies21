import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getSystemTemplates } from '../../api/bannerTemplate';
import BannerThumbnail from '../banner/BannerThumbnail';
import BrowserSimulatorPreview from './BrowserSimulatorPreview';
import InteractiveBannerPreview from './InteractiveBannerPreview';

const SimpleBannerConfigStep = ({ formData, onChange, selectedDomain }) => {
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewMode, setPreviewMode] = useState('simulator'); // 'simulator' o 'editor'
  const [bannerComponents, setBannerComponents] = useState({
    acceptButton: null,
    rejectButton: null,
    preferencesButton: null,
    otherButtons: [],
    texts: [],
    images: [],
    containers: []
  });
  const [customizations, setCustomizations] = useState({
    backgroundColor: '#ffffff',
    acceptButton: { backgroundColor: '#10b981', textColor: '#ffffff' },
    rejectButton: { backgroundColor: '#ef4444', textColor: '#ffffff' },
    preferencesButton: { backgroundColor: '#6b7280', textColor: '#ffffff' },
    textColor: '#374151',
    otherButtons: {},
    images: {},
    // NUEVO: Almacenar cambios de posición/tamaño por separado
    componentUpdates: {}
  });

  const previewRef = useRef(null);

  // Cargar plantillas disponibles
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Función para normalizar template (eliminar min/max dimensions)
  const normalizeTemplate = (template) => {
    if (!template) return null;
    
    const normalized = JSON.parse(JSON.stringify(template));
    
    // Limpiar min/max de todos los componentes
    if (normalized.components) {
      normalized.components = normalized.components.map(component => {
        const cleanComponent = { ...component };
        
        // Limpiar estilos de todos los dispositivos
        if (cleanComponent.style) {
          Object.keys(cleanComponent.style).forEach(device => {
            if (cleanComponent.style[device]) {
              delete cleanComponent.style[device].minWidth;
              delete cleanComponent.style[device].maxWidth;
              delete cleanComponent.style[device].minHeight;
              delete cleanComponent.style[device].maxHeight;
            }
          });
        }
        
        return cleanComponent;
      });
    }
    
    return normalized;
  };

  // NUEVA: Función para pre-procesar template como si viniera del editor
  const preprocessTemplateForConsistency = (template) => {
    if (!template) return null;
    
    const processed = JSON.parse(JSON.stringify(template));
    
    if (processed.components) {
      processed.components = processed.components.map(component => {
        const processedComponent = { ...component };
        
        // Aplicar conversión inteligente de porcentajes para componentes hijos
        if (processedComponent.parentId && processedComponent.style) {
          // Buscar el contenedor padre
          const parentComponent = processed.components.find(c => c.id === processedComponent.parentId);
          if (parentComponent) {
            Object.keys(processedComponent.style).forEach(device => {
              const deviceStyle = processedComponent.style[device];
              const parentStyle = parentComponent.style?.[device] || {};
              
              if (deviceStyle) {
                // Simular el cálculo que hace el editor
                const processedStyle = { ...deviceStyle };
                
                // Convertir porcentajes basados en dimensiones reales del padre MÁS GENEROSAS
                let estimatedParentWidth = 200; // default más generoso
                let estimatedParentHeight = 450; // default más generoso
                
                // Calcular dimensiones reales del padre si están disponibles
                if (parentStyle.width && typeof parentStyle.width === 'string') {
                  if (parentStyle.width.includes('%')) {
                    // El padre es porcentaje del banner (usar dimensiones más generosas)
                    const parentPercent = parseFloat(parentStyle.width);
                    estimatedParentWidth = (parentPercent * 900) / 100; // banner más ancho: 900px
                  } else if (parentStyle.width.includes('px')) {
                    estimatedParentWidth = parseFloat(parentStyle.width) * 1.1; // 10% más generoso
                  }
                }
                
                if (parentStyle.height && typeof parentStyle.height === 'string') {
                  if (parentStyle.height.includes('%')) {
                    // El padre es porcentaje del banner (usar dimensiones más generosas)
                    const parentPercent = parseFloat(parentStyle.height);
                    estimatedParentHeight = (parentPercent * 450) / 100; // banner más alto: 450px
                  } else if (parentStyle.height.includes('px')) {
                    estimatedParentHeight = parseFloat(parentStyle.height) * 1.15; // 15% más generoso para altura
                  }
                }
                
                console.log(`🔧 Pre-proceso ${component.id} - Dimensiones padre estimadas:`, {
                  parentId: component.parentId,
                  estimatedParentWidth,
                  estimatedParentHeight,
                  originalParentStyle: parentStyle
                });
                
                // Convertir porcentajes del hijo a píxeles con ajustes para legibilidad
                if (processedStyle.width && typeof processedStyle.width === 'string' && processedStyle.width.includes('%')) {
                  const percentValue = parseFloat(processedStyle.width);
                  let pixelValue = (percentValue * estimatedParentWidth) / 100;
                  
                  // Asegurar tamaño mínimo para legibilidad del texto
                  if (component.type === 'text' && pixelValue < 120) {
                    pixelValue = Math.max(120, pixelValue * 1.2); // mínimo 120px o 20% más
                  }
                  
                  processedStyle.width = `${Math.round(pixelValue)}px`;
                  console.log(`📐 Pre-proceso width: ${component.id} - ${percentValue}% → ${Math.round(pixelValue)}px`);
                }
                
                if (processedStyle.height && typeof processedStyle.height === 'string' && processedStyle.height.includes('%')) {
                  const percentValue = parseFloat(processedStyle.height);
                  let pixelValue = (percentValue * estimatedParentHeight) / 100;
                  
                  // Asegurar altura mínima para legibilidad del texto
                  if (component.type === 'text' && pixelValue < 40) {
                    pixelValue = Math.max(40, pixelValue * 1.3); // mínimo 40px o 30% más
                  }
                  
                  processedStyle.height = `${Math.round(pixelValue)}px`;
                  console.log(`📐 Pre-proceso height: ${component.id} - ${percentValue}% → ${Math.round(pixelValue)}px`);
                }
                
                processedComponent.style[device] = processedStyle;
              }
            });
          }
        }
        
        return processedComponent;
      });
    }
    
    console.log('🔧 Template pre-procesado para consistencia:', {
      originalComponents: template.components?.length || 0,
      processedComponents: processed.components?.length || 0
    });
    
    return processed;
  };

  // Función para aplicar customizations al template
  const applyCustomizations = (template, customizations) => {
    if (!template) return null;
    
    // CRÍTICO: Normalizar template primero para eliminar min/max
    const normalizedTemplate = normalizeTemplate(template);
    
    // NUEVO: Pre-procesar para consistencia si NO hay componentUpdates (primera carga)
    const hasComponentUpdates = customizations.componentUpdates && Object.keys(customizations.componentUpdates).length > 0;
    let templateToUse = normalizedTemplate;
    
    if (!hasComponentUpdates) {
      console.log('🆕 PRIMERA CARGA: Pre-procesando template para consistencia...');
      templateToUse = preprocessTemplateForConsistency(normalizedTemplate);
    } else {
      console.log('🔄 SEGUNDA CARGA: Usando template con componentUpdates...');
    }
    
    console.log('🧹 Template preparado:', {
      originalComponents: template.components?.length || 0,
      finalComponents: templateToUse.components?.length || 0,
      isFirstLoad: !hasComponentUpdates
    });
    
    const customizedTemplate = JSON.parse(JSON.stringify(templateToUse));
    
    // Aplicar customizations a cada componente
    const applyToComponents = (components) => {
      return components.map(component => {
        const newComponent = { ...component };
        
        // NUEVO: Aplicar componentUpdates (resize/drag) PRIMERO
        const componentUpdate = customizations.componentUpdates?.[component.id];
        if (componentUpdate) {
          console.log(`🔄 APLICANDO componentUpdate a ${component.id}:`, componentUpdate);
          console.log(`🔄 Componente ANTES:`, { 
            position: component.position, 
            style: component.style?.desktop 
          });
          
          // Aplicar cambios de posición (estructura: { desktop: {...}, tablet: {...}, mobile: {...} })
          if (componentUpdate.position) {
            newComponent.position = {
              ...newComponent.position,
              desktop: {
                ...newComponent.position?.desktop,
                ...componentUpdate.position.desktop
              },
              tablet: {
                ...newComponent.position?.tablet,
                ...componentUpdate.position.tablet
              },
              mobile: {
                ...newComponent.position?.mobile,
                ...componentUpdate.position.mobile
              }
            };
          }
          
          // Aplicar cambios de estilo (tamaño, etc.) (estructura: { desktop: {...}, tablet: {...}, mobile: {...} })
          if (componentUpdate.style) {
            newComponent.style = {
              ...newComponent.style,
              desktop: {
                ...newComponent.style?.desktop,
                ...componentUpdate.style.desktop
              },
              tablet: {
                ...newComponent.style?.tablet,
                ...componentUpdate.style.tablet
              },
              mobile: {
                ...newComponent.style?.mobile,
                ...componentUpdate.style.mobile
              }
            };
          }
          
          console.log(`🔄 Componente DESPUÉS:`, { 
            position: newComponent.position, 
            style: newComponent.style?.desktop 
          });
        }
        
        // Aplicar estilos según tipo de componente
        if (component.type === 'button') {
          const action = component.action?.type;
          let buttonCustomization = null;
          
          // Determinar qué customization aplicar
          if (action === 'accept_all' || ['acceptBtn', 'acceptAll'].includes(component.id)) {
            buttonCustomization = customizations.acceptButton;
          } else if (action === 'reject_all' || ['rejectBtn', 'rejectAll'].includes(component.id)) {
            buttonCustomization = customizations.rejectButton;
          } else if (action === 'show_preferences' || ['preferencesBtn', 'preferencesButton'].includes(component.id)) {
            buttonCustomization = customizations.preferencesButton;
          } else if (customizations.otherButtons[component.id]) {
            buttonCustomization = customizations.otherButtons[component.id];
          }
          
          // Aplicar estilos del botón PRESERVANDO los cambios de resize
          if (buttonCustomization) {
            // Solo actualizar propiedades de color, NO dimensiones ni posición
            if (!newComponent.style) newComponent.style = {};
            if (!newComponent.style.desktop) newComponent.style.desktop = {};
            
            newComponent.style.desktop.backgroundColor = buttonCustomization.backgroundColor;
            newComponent.style.desktop.color = buttonCustomization.textColor;
          }
        } else if (component.type === 'text') {
          // Aplicar color de texto general PRESERVANDO los cambios de resize
          // Solo actualizar color, NO dimensiones ni posición
          if (!newComponent.style) newComponent.style = {};
          if (!newComponent.style.desktop) newComponent.style.desktop = {};
          
          newComponent.style.desktop.color = customizations.textColor;
        } else if (component.type === 'image') {
          // Aplicar customizations de imagen PRESERVANDO la imagen original
          const imageCustomization = customizations.images[component.id];
          
          // SIEMPRE procesar la URL de la imagen original para que se vea
          if (component.content && typeof component.content === 'string') {
            let imageUrl = component.content;
            console.log('🖼️ SimpleBanner: Procesando imagen:', { componentId: component.id, originalContent: imageUrl });
            
            // Procesar diferentes tipos de URLs
            if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('/')) {
                // URL absoluta relativa al servidor
                imageUrl = `${window.location.origin}${imageUrl}`;
              } else {
                // Ruta relativa, asumimos que es del servidor
                imageUrl = `${window.location.origin}/${imageUrl}`;
              }
              console.log('🔗 SimpleBanner: URL procesada:', { componentId: component.id, processedUrl: imageUrl });
            }
            
            // IMPORTANTE: SIEMPRE asignar _previewUrl para que la imagen se vea en TODOS los dispositivos
            newComponent.style = {
              ...newComponent.style,
              desktop: {
                ...newComponent.style?.desktop,
                _previewUrl: imageUrl
              },
              tablet: {
                ...newComponent.style?.tablet,
                _previewUrl: imageUrl
              },
              mobile: {
                ...newComponent.style?.mobile,
                _previewUrl: imageUrl
              }
            };
            console.log('✅ SimpleBanner: _previewUrl asignada para todos los dispositivos:', imageUrl);
          }
          
          // Luego aplicar customizations si las hay
          if (imageCustomization) {
            // Aplicar customizations
            if (imageCustomization.position) {
              newComponent.position = {
                ...newComponent.position,
                desktop: imageCustomization.position
              };
            }
            if (imageCustomization.size) {
              newComponent.style = {
                ...newComponent.style,
                desktop: {
                  ...newComponent.style?.desktop,
                  width: imageCustomization.size.width,
                  height: imageCustomization.size.height
                }
              };
            }
            // Manejo correcto de nuevas imágenes
            if (imageCustomization.file || imageCustomization.tempUrl) {
              // Marcar el componente para que el backend sepa que debe procesar una nueva imagen
              newComponent._hasCustomImage = true;
              newComponent._customImageId = component.id;
              
              // Crear ObjectURL para el archivo si existe
              let previewUrl = imageCustomization.tempUrl;
              if (imageCustomization.file && !previewUrl) {
                previewUrl = URL.createObjectURL(imageCustomization.file);
              }
              
              // Usar _previewUrl para el preview (como en BannerPreview)
              newComponent.style = {
                ...newComponent.style,
                desktop: {
                  ...newComponent.style?.desktop,
                  _previewUrl: previewUrl
                },
                tablet: {
                  ...newComponent.style?.tablet,
                  _previewUrl: previewUrl
                },
                mobile: {
                  ...newComponent.style?.mobile,
                  _previewUrl: previewUrl
                }
              };
              
              // También almacenar en el sistema global para compatibilidad
              if (imageCustomization.file) {
                if (!window._imageFiles) window._imageFiles = {};
                window._imageFiles[component.id] = imageCustomization.file;
              }
            }
            // Nota: La URL original ya fue procesada arriba, no necesitamos repetir el proceso aquí
          }
        }
        
        // Procesar hijos si los tiene
        if (newComponent.children && Array.isArray(newComponent.children)) {
          newComponent.children = applyToComponents(newComponent.children);
        }
        
        return newComponent;
      });
    };
    
    // Aplicar a todos los componentes
    customizedTemplate.components = applyToComponents(customizedTemplate.components || []);
    
    // Aplicar color de fondo al layout
    if (customizedTemplate.layout) {
      Object.keys(customizedTemplate.layout).forEach(device => {
        customizedTemplate.layout[device] = {
          ...customizedTemplate.layout[device],
          backgroundColor: customizations.backgroundColor
        };
      });
    }
    
    return customizedTemplate;
  };

  // Analizar componentes cuando se selecciona una plantilla
  useEffect(() => {
    if (selectedTemplate) {
      analyzeTemplateComponents(selectedTemplate);
    }
  }, [selectedTemplate]);

  // Memoizar template personalizado
  const customizedTemplate = useMemo(() => {
    if (!selectedTemplate) return null;
    const result = applyCustomizations(selectedTemplate, customizations);
    
    // DEBUG: Verificar que las imágenes tengan _previewUrl Y componentUpdates
    if (result && result.components) {
      const imageComponents = result.components.filter(c => c.type === 'image');
      console.log('🖼️ CustomizedTemplate: Imágenes procesadas:', imageComponents.map(img => ({
        id: img.id,
        content: img.content,
        hasPreviewUrl: !!img.style?.desktop?._previewUrl,
        previewUrl: img.style?.desktop?._previewUrl
      })));
      
      // DEBUG: Verificar TODOS los componentes con componentUpdates
      const allComponents = result.components;
      console.log('🔄 CustomizedTemplate: TODOS los componentes con updates aplicados:', allComponents.map(comp => ({
        id: comp.id,
        type: comp.type,
        position: comp.position?.desktop,
        style: { 
          width: comp.style?.desktop?.width,
          height: comp.style?.desktop?.height,
          backgroundColor: comp.style?.desktop?.backgroundColor
        },
        hasComponentUpdate: !!(customizations.componentUpdates?.[comp.id])
      })));
    }
    
    return result;
  }, [selectedTemplate, customizations]);

  // Función para manejar la carga de imágenes
  const handleImageUpload = (componentId, file) => {
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }
    
    console.log(`📷 Subiendo imagen para componente ${componentId}:`, file.name);
    
    // Crear URL temporal para preview inmediato
    const tempUrl = URL.createObjectURL(file);
    
    // Actualizar customizations con la URL temporal
    setCustomizations(prev => ({
      ...prev,
      images: {
        ...prev.images,
        [componentId]: {
          ...prev.images[componentId],
          tempUrl: tempUrl,
          file: file,
          fileName: file.name
        }
      }
    }));
    
    toast.success('Imagen actualizada correctamente');
    
    // El useEffect se encargará de actualizar el formData cuando customizations cambien
  };

  // Actualizar formData cuando cambien las customizations
  useEffect(() => {
    if (selectedTemplate && formData.bannerConfig && customizedTemplate) {
      // Recopilar todas las imágenes de las customizations
      const imageFiles = {};
      const imageSettings = {};
      
      // Extraer archivos de imagen de customizations
      Object.entries(customizations.images || {}).forEach(([componentId, imageData]) => {
        if (imageData.file instanceof File) {
          imageFiles[componentId] = imageData.file;
          imageSettings[componentId] = {
            fileName: imageData.fileName,
            hasCustomImage: true,
            tempUrl: imageData.tempUrl
          };
          console.log(`✅ Imagen detectada para componente ${componentId}:`, imageData.fileName);
        }
      });
      
      console.log('📤 Enviando bannerConfig con imágenes:', Object.keys(imageFiles));
      
      onChange('bannerConfig', {
        ...formData.bannerConfig,
        customizations: customizations,
        customizedTemplate: customizedTemplate,
        images: Object.keys(imageFiles).length > 0 ? imageFiles : formData.bannerConfig.images,
        imageSettings: Object.keys(imageSettings).length > 0 ? imageSettings : formData.bannerConfig.imageSettings
      });
    }
  }, [customizedTemplate, customizations]);

  // Función para crear una plantilla básica temporal cuando no hay plantillas del sistema
  const createBasicTemplate = () => {
    return {
      _id: 'basic-template-temp',
      name: 'Plantilla Básica Temporal',
      type: 'system',
      status: 'active',
      layout: {
        width: '100%',
        height: 'auto',
        maxWidth: '500px',
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999
      },
      components: [
        {
          id: 'mainContainer',
          type: 'container',
          style: {
            desktop: {
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb'
            }
          },
          children: [
            {
              id: 'title',
              type: 'text',
              content: {
                texts: {
                  en: 'We use cookies',
                  es: 'Usamos cookies'
                }
              },
              style: {
                desktop: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '12px'
                }
              }
            },
            {
              id: 'description',
              type: 'text',
              content: {
                texts: {
                  en: 'This website uses cookies to ensure you get the best experience.',
                  es: 'Este sitio web utiliza cookies para garantizar la mejor experiencia.'
                }
              },
              style: {
                desktop: {
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '16px',
                  lineHeight: '1.5'
                }
              }
            },
            {
              id: 'buttonContainer',
              type: 'container',
              style: {
                desktop: {
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }
              },
              children: [
                {
                  id: 'rejectBtn',
                  type: 'button',
                  content: {
                    texts: {
                      en: 'Reject',
                      es: 'Rechazar'
                    }
                  },
                  action: {
                    type: 'reject_all'
                  },
                  style: {
                    desktop: {
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }
                  }
                },
                {
                  id: 'acceptBtn',
                  type: 'button',
                  content: {
                    texts: {
                      en: 'Accept All',
                      es: 'Aceptar Todo'
                    }
                  },
                  action: {
                    type: 'accept_all'
                  },
                  style: {
                    desktop: {
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }
                  }
                }
              ]
            }
          ]
        }
      ],
      theme: {
        colors: {
          primary: '#10b981',
          secondary: '#ef4444',
          background: '#ffffff',
          text: '#1f2937'
        }
      }
    };
  };

  const fetchTemplates = async () => {
    console.log('🔍 SimpleBannerConfigStep: Iniciando carga de plantillas del sistema');
    setIsLoadingTemplates(true);
    try {
      console.log('📡 SimpleBannerConfigStep: Llamando a getSystemTemplates');
      const response = await getSystemTemplates('en');
      console.log('📦 SimpleBannerConfigStep: Respuesta de getSystemTemplates:', response);
      
      const templates = response.data?.templates || [];
      console.log(`✅ SimpleBannerConfigStep: ${templates.length} plantillas cargadas:`, templates);
      
      setAvailableTemplates(templates);
      
      // Auto-seleccionar la primera plantilla
      if (templates.length > 0) {
        console.log('🎯 SimpleBannerConfigStep: Auto-seleccionando primera plantilla:', templates[0]);
        selectTemplate(templates[0]);
      } else {
        console.warn('⚠️ SimpleBannerConfigStep: No se encontraron plantillas del sistema');
        toast.warning('No se encontraron plantillas del sistema disponibles. Contacte al administrador para crear plantillas del sistema.');
        
        // Crear una plantilla básica temporal para que el componente funcione
        const basicTemplate = createBasicTemplate();
        setAvailableTemplates([basicTemplate]);
        selectTemplate(basicTemplate);
      }
    } catch (error) {
      console.error('❌ SimpleBannerConfigStep: Error al cargar plantillas:', error);
      console.error('❌ SimpleBannerConfigStep: Error response:', error.response);
      console.error('❌ SimpleBannerConfigStep: Error message:', error.message);
      toast.error('Error al cargar plantillas del sistema: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    
    // Actualizar formData con la plantilla seleccionada
    onChange('configureBanner', true);
    onChange('bannerConfig', {
      templateId: template._id,
      name: `Banner para ${selectedDomain}`,
      selectedTemplate: template,
      customizations: customizations
    });
  };

  const analyzeTemplateComponents = (template) => {
    if (!template || !template.components) {
      console.warn('Template sin componentes:', template);
      return;
    }

    const components = template.components || [];
    const analysis = {
      acceptButton: null,
      rejectButton: null,
      preferencesButton: null,
      otherButtons: [],
      texts: [],
      images: [],
      containers: []
    };

    // Función recursiva para analizar componentes (incluye hijos de contenedores)
    const analyzeComponent = (component, parentContainer = null) => {
      if (!component || !component.type) {
        console.warn('Componente inválido:', component);
        return;
      }

      // Detectar botones
      if (component.type === 'button') {
        const action = component.action?.type;
        const id = component.id;
        
        // Prioridad: acción > ID
        if (action === 'accept_all' || ['acceptBtn', 'acceptAll'].includes(id)) {
          analysis.acceptButton = { ...component, parentContainer };
        } else if (action === 'reject_all' || ['rejectBtn', 'rejectAll'].includes(id)) {
          analysis.rejectButton = { ...component, parentContainer };
        } else if (action === 'show_preferences' || ['preferencesBtn', 'preferencesButton'].includes(id)) {
          analysis.preferencesButton = { ...component, parentContainer };
        } else {
          analysis.otherButtons.push({ ...component, parentContainer });
        }
      }
      // Detectar textos
      else if (component.type === 'text') {
        analysis.texts.push({ ...component, parentContainer });
      }
      // Detectar imágenes (independiente de si están en contenedor)
      else if (component.type === 'image') {
        analysis.images.push({ ...component, parentContainer });
      }
      // Detectar contenedores
      else if (component.type === 'container') {
        analysis.containers.push(component);
        
        // Analizar hijos del contenedor recursivamente
        if (component.children && Array.isArray(component.children)) {
          component.children.forEach(child => {
            // Los hijos pueden ser objetos completos o referencias por ID
            let childComponent = child;
            if (typeof child === 'string') {
              // Si es string, buscar el componente por ID
              childComponent = components.find(c => c.id === child);
            }
            if (childComponent) {
              analyzeComponent(childComponent, component);
            }
          });
        }
      }
    };

    // Analizar componentes raíz (que no tienen parentId)
    const rootComponents = components.filter(c => !c.parentId);
    rootComponents.forEach(component => {
      analyzeComponent(component);
    });

    console.log('Análisis de componentes:', analysis);
    setBannerComponents(analysis);
    
    // Inicializar customizations con valores del template
    const newCustomizations = {
      // Color de fondo del banner del template
      backgroundColor: template.layout?.desktop?.backgroundColor || '#ffffff',
      // Colores de los botones principales del template
      acceptButton: {
        backgroundColor: analysis.acceptButton?.style?.desktop?.backgroundColor || '#10b981',
        textColor: analysis.acceptButton?.style?.desktop?.color || '#ffffff'
      },
      rejectButton: {
        backgroundColor: analysis.rejectButton?.style?.desktop?.backgroundColor || '#ef4444',
        textColor: analysis.rejectButton?.style?.desktop?.color || '#ffffff'
      },
      preferencesButton: {
        backgroundColor: analysis.preferencesButton?.style?.desktop?.backgroundColor || '#6b7280',
        textColor: analysis.preferencesButton?.style?.desktop?.color || '#ffffff'
      },
      // Color de texto general (tomar del primer texto encontrado)
      textColor: analysis.texts[0]?.style?.desktop?.color || '#374151',
      otherButtons: {},
      images: {}
    };
    
    // Inicializar customizations para otros botones con sus valores actuales
    analysis.otherButtons.forEach(button => {
      newCustomizations.otherButtons[button.id] = {
        backgroundColor: button.style?.desktop?.backgroundColor || '#3b82f6',
        textColor: button.style?.desktop?.color || '#ffffff'
      };
    });
    
    // Inicializar customizations para imágenes con sus valores actuales
    analysis.images.forEach(image => {
      newCustomizations.images[image.id] = {
        position: image.position?.desktop || { top: '0%', left: '0%' },
        size: {
          width: image.style?.desktop?.width || '100px',
          height: image.style?.desktop?.height || '100px'
        },
        currentImage: image.content || null
      };
    });
    
    setCustomizations(newCustomizations);
  };

  const updateCustomization = (type, field, value, buttonId = null) => {
    const newCustomizations = { ...customizations };
    
    if (type === 'otherButtons' && buttonId) {
      if (!newCustomizations.otherButtons[buttonId]) {
        newCustomizations.otherButtons[buttonId] = {};
      }
      newCustomizations.otherButtons[buttonId][field] = value;
    } else if (type === 'images' && buttonId) {
      if (!newCustomizations.images[buttonId]) {
        newCustomizations.images[buttonId] = {};
      }
      newCustomizations.images[buttonId][field] = value;
    } else {
      if (field) {
        if (!newCustomizations[type]) {
          newCustomizations[type] = {};
        }
        newCustomizations[type][field] = value;
      } else {
        newCustomizations[type] = value;
      }
    }
    
    setCustomizations(newCustomizations);
    
    // Para cambios inmediatos como colores, sí necesitamos llamar onChange
    // pero sin pasar customizations para evitar el bucle
    if (formData.bannerConfig) {
      onChange('bannerConfig', {
        ...formData.bannerConfig,
        customizations: newCustomizations
      });
    }
  };


  // Manejador que NO modifica selectedTemplate, sino que guarda cambios en customizations
  const handleComponentUpdate = useCallback((componentId, updates) => {
    if (!selectedTemplate) return;
    
    console.log('🔄 HandleComponentUpdate:', { componentId, updates });
    console.log('🔄 Updates estructura:', {
      hasPosition: !!updates.position,
      hasStyle: !!updates.style,
      positionKeys: updates.position ? Object.keys(updates.position) : [],
      styleKeys: updates.style ? Object.keys(updates.style) : []
    });
    
    // NO modificar selectedTemplate, sino guardar cambios en customizations
    setCustomizations(prevCustomizations => {
      const newCustomizations = { ...prevCustomizations };
      
      // Inicializar componentUpdates si no existe
      if (!newCustomizations.componentUpdates) {
        newCustomizations.componentUpdates = {};
      }
      
      // Guardar los updates para este componente
      if (!newCustomizations.componentUpdates[componentId]) {
        newCustomizations.componentUpdates[componentId] = {};
      }
      
      // Merge los updates manteniendo los anteriores
      // CORRECCIÓN: updates.position y updates.style ya vienen con estructura { deviceView: {...} }
      if (updates.position) {
        if (!newCustomizations.componentUpdates[componentId].position) {
          newCustomizations.componentUpdates[componentId].position = {};
        }
        // Merge por dispositivo
        Object.keys(updates.position).forEach(device => {
          newCustomizations.componentUpdates[componentId].position[device] = {
            ...newCustomizations.componentUpdates[componentId].position[device],
            ...updates.position[device]
          };
        });
      }
      
      if (updates.style) {
        if (!newCustomizations.componentUpdates[componentId].style) {
          newCustomizations.componentUpdates[componentId].style = {};
        }
        // Merge por dispositivo
        Object.keys(updates.style).forEach(device => {
          newCustomizations.componentUpdates[componentId].style[device] = {
            ...newCustomizations.componentUpdates[componentId].style[device],
            ...updates.style[device]
          };
        });
      }
      
      console.log('💾 Guardando component updates:', newCustomizations.componentUpdates);
      
      return newCustomizations;
    });
    
    // El resto se maneja automáticamente cuando customizedTemplate se recalcula
  }, [selectedTemplate]);

  const ColorPicker = ({ label, value, onChange, compact = false }) => {
    const [localColor, setLocalColor] = useState(value);
    const colorPickerRef = useRef(null);
    
    // Sincronizar con valor externo cuando cambie
    useEffect(() => {
      setLocalColor(value);
    }, [value]);
    
    const handleColorChange = (newColor) => {
      setLocalColor(newColor);
      onChange(newColor);
    };
    
    return (
      <div className={compact ? "mb-2" : "mb-3"}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Contenedor visible con el color actual */}
            <div 
              className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer overflow-hidden"
              onClick={() => colorPickerRef.current?.click()}
              style={{
                backgroundColor: localColor
              }}
            >
              {/* Input de color oculto */}
              <input
                ref={colorPickerRef}
                type="color"
                value={localColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </div>
          </div>
          <input
            type="text"
            value={localColor}
            onChange={(e) => {
              const value = e.target.value;
              // Validar formato hex
              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                setLocalColor(value);
                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                  onChange(value);
                }
              }
            }}
            className="text-xs border border-gray-300 px-2 py-1 rounded font-mono"
            style={{ width: '80px' }}
            placeholder="#ffffff"
          />
        </div>
      </div>
    );
  };

  const ButtonColorControls = ({ button, type, customization, label }) => {
    if (!button) return null;
    
    return (
      <div className="bg-white p-3 rounded-lg border">
        <h6 className="font-medium text-gray-700 mb-3 text-sm">{label}</h6>
        <div className="space-y-3">
          <ColorPicker
            label="Color de fondo"
            value={customization?.backgroundColor || '#3b82f6'}
            onChange={(value) => updateCustomization(type, 'backgroundColor', value)}
            compact={true}
          />
          <ColorPicker
            label="Color de texto"
            value={customization?.textColor || '#ffffff'}
            onChange={(value) => updateCustomization(type, 'textColor', value)}
            compact={true}
          />
        </div>
      </div>
    );
  };

  if (isLoadingTemplates) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Configuración del Banner de Cookies</h3>
        <p className="text-sm text-gray-600 mb-4">
          Selecciona una plantilla base y personaliza los colores, textos e imágenes según las necesidades del cliente.
        </p>
      </div>

      {/* Selector de plantillas */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3">Seleccionar Plantilla Base</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableTemplates.map((template) => (
            <div
              key={template._id}
              className={`relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                selectedTemplate?._id === template._id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => selectTemplate(template)}
            >
              <div className="aspect-video bg-gray-100">
                <BannerThumbnail 
                  bannerConfig={template} 
                  className="w-full h-full"
                  deviceView="desktop"
                />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {template.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vista previa del banner al 100% width */}
      {selectedTemplate && (
        <div className="space-y-6">
          {/* Preview del banner en simulador de navegador */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-700">Vista Previa del Banner</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode('simulator')}
                  className={`px-3 py-1 text-xs rounded ${
                    previewMode === 'simulator' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Vista Real
                </button>
                <button
                  onClick={() => setPreviewMode('editor')}
                  className={`px-3 py-1 text-xs rounded ${
                    previewMode === 'editor' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Modo Edición
                </button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg bg-gray-100 overflow-hidden">
              {previewMode === 'simulator' ? (
                <BrowserSimulatorPreview 
                  bannerConfig={customizedTemplate} 
                  deviceView="desktop"
                  height="500px"
                />
              ) : (
                <div className="bg-white p-4" style={{ minHeight: '400px' }}>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ minHeight: '360px' }}>
                    <InteractiveBannerPreview 
                      bannerConfig={customizedTemplate} 
                      deviceView="desktop"
                      height="350px"
                      onUpdateComponent={handleComponentUpdate}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controles de personalización - debajo del preview */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Personalización</h4>
            
            {/* Colores generales - primera fila */}
            <div className="bg-gray-50 p-4 rounded-lg border mb-6">
              <h5 className="font-medium text-gray-700 mb-3">Colores Generales</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker
                  label="Fondo del banner"
                  value={customizations.backgroundColor}
                  onChange={(value) => updateCustomization('backgroundColor', null, value)}
                  compact={true}
                />
                {bannerComponents.texts.length > 0 && (
                  <ColorPicker
                    label="Color de textos"
                    value={customizations.textColor}
                    onChange={(value) => updateCustomization('textColor', null, value)}
                    compact={true}
                  />
                )}
              </div>
            </div>

            {/* Botones de consentimiento - segunda fila, 100% width */}
            <div className="bg-gray-50 p-4 rounded-lg border mb-6">
              <h5 className="font-medium text-gray-700 mb-3">Botones de Consentimiento</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ButtonColorControls
                  button={bannerComponents.acceptButton}
                  type="acceptButton"
                  customization={customizations.acceptButton}
                  label="Botón Aceptar Todo"
                />
                
                <ButtonColorControls
                  button={bannerComponents.rejectButton}
                  type="rejectButton"
                  customization={customizations.rejectButton}
                  label="Botón Rechazar Todo"
                />
                
                <ButtonColorControls
                  button={bannerComponents.preferencesButton}
                  type="preferencesButton"
                  customization={customizations.preferencesButton}
                  label="Botón de Preferencias"
                />
              </div>
            </div>

            {/* Sección de imágenes debajo */}
            {bannerComponents.images.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h5 className="font-medium text-gray-700 mb-3">Imágenes del Banner</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bannerComponents.images.map((image, index) => {
                    const imageCustomization = customizations.images[image.id] || {};
                    // Priorizar la imagen personalizada sobre la original
                    const currentImageUrl = imageCustomization.tempUrl || 
                                          imageCustomization.file ? URL.createObjectURL(imageCustomization.file) : 
                                          image.content || '';
                    
                    return (
                      <div key={image.id} className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-sm font-medium text-gray-700">
                            Imagen {index + 1}
                          </h6>
                          {!image.parentContainer && (
                            <span className="text-xs text-blue-600 font-medium">
                              Posición libre
                            </span>
                          )}
                        </div>
                        
                        {/* Preview de la imagen */}
                        <div className="relative mb-3">
                          <div className="aspect-video bg-gray-100 rounded border-2 border-dashed border-gray-300 overflow-hidden">
                            {currentImageUrl ? (
                              <img
                                src={currentImageUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                Sin imagen
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Controles de la imagen */}
                        <div className="space-y-3">
                          {/* Upload */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Cambiar imagen
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleImageUpload(image.id, file);
                                }
                              }}
                              className="text-xs border border-gray-300 rounded w-full p-2"
                            />
                          </div>
                          
                          {/* Información de posicionamiento */}
                          {!image.parentContainer && (
                            <div className="bg-blue-50 p-2 rounded text-xs">
                              <p className="text-blue-700 font-medium mb-1">
                                💡 Posicionamiento libre
                              </p>
                              <p className="text-blue-600">
                                Esta imagen se puede arrastrar y redimensionar directamente en la vista previa
                              </p>
                            </div>
                          )}
                          
                          {image.parentContainer && (
                            <div className="bg-gray-50 p-2 rounded text-xs">
                              <p className="text-gray-700 font-medium mb-1">
                                📦 Dentro de contenedor
                              </p>
                              <p className="text-gray-600">
                                Posición controlada por: {image.parentContainer.id}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Otros botones */}
            {bannerComponents.otherButtons.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border mt-6">
                <h5 className="font-medium text-gray-700 mb-3">Otros Botones</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bannerComponents.otherButtons.map((button) => (
                    <ButtonColorControls
                      key={button.id}
                      button={button}
                      type="otherButtons"
                      customization={customizations.otherButtons[button.id]}
                      label={button.content || button.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleBannerConfigStep;