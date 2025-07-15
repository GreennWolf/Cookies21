import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getSystemTemplates } from '../../api/bannerTemplate';
import BannerThumbnail from '../banner/BannerThumbnail';
import BrowserSimulatorPreview from './BrowserSimulatorPreview';
import InteractiveBannerPreview from './InteractiveBannerPreview';
import useTemplateVariables from '../../hooks/useTemplateVariables';

const SimpleBannerConfigStep = ({ formData, onChange, selectedDomain, client }) => {
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewMode, setPreviewMode] = useState('simulator'); // 'simulator' o 'editor'
  const [currentDevice, setCurrentDevice] = useState('desktop'); // 'desktop', 'tablet', 'mobile'
  const [bannerComponents, setBannerComponents] = useState({
    acceptButton: null,
    rejectButton: null,
    preferencesButton: null,
    otherButtons: [],
    texts: [],
    images: [],
    containers: []
  });
  
  // Flag para saber si ya cargamos desde formData
  const hasInitialFormData = formData.bannerConfig && 
                              formData.bannerConfig.customizations && 
                              Object.keys(formData.bannerConfig.customizations).length > 0 &&
                              formData.bannerConfig.customizations.acceptButton &&
                              formData.bannerConfig.customizations.acceptButton.backgroundColor;
  
  const [customizations, setCustomizations] = useState(() => {
    // Inicializar con valores de formData si existen
    if (hasInitialFormData) {
      console.log('🚀 INICIALIZANDO customizations desde formData existente:', formData.bannerConfig.customizations);
      return formData.bannerConfig.customizations;
    }
    
    console.log('🆕 INICIALIZANDO customizations vacías');
    // Si no, inicializar vacío
    return {
      backgroundColor: '',
      acceptButton: { backgroundColor: '', textColor: '' },
      rejectButton: { backgroundColor: '', textColor: '' },
      preferencesButton: { backgroundColor: '', textColor: '' },
      // textColor general eliminado - solo textos individuales
      otherButtons: {},
      images: {},
      // NUEVO: Almacenar cambios de posición/tamaño por separado
      componentUpdates: {},
      // NUEVO: Textos individuales con colores independientes
      individualTexts: {}
    };
  });

  const previewRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const blobUrlsRef = useRef(new Set());
  
  // Función auxiliar para crear blob URLs de manera segura
  const createSafeBlobUrl = useCallback((file) => {
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.add(url);
    return url;
  }, []);
  
  // Limpiar blob URLs al desmontar el componente
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current.clear();
    };
  }, []);
  
  // Si inicializamos desde formData, marcar como inicializado después del primer render
  useEffect(() => {
    if (hasInitialFormData) {
      hasInitializedRef.current = true;
      console.log('✅ Marcado como inicializado desde formData');
    }
  }, []);

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
              const parentStyle = (parentComponent.style && parentComponent.style[device]) || {};
              
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
      originalComponents: (template.components && template.components.length) || 0,
      processedComponents: (processed.components && processed.components.length) || 0
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
      originalComponents: (template.components && template.components.length) || 0,
      finalComponents: (templateToUse.components && templateToUse.components.length) || 0,
      isFirstLoad: !hasComponentUpdates
    });
    
    const customizedTemplate = JSON.parse(JSON.stringify(templateToUse));
    
    // Aplicar customizations a cada componente
    const applyToComponents = (components) => {
      return components.map(component => {
        const newComponent = { ...component };
        
        // NUEVO: Aplicar componentUpdates (resize/drag) PRIMERO
        const componentUpdate = customizations.componentUpdates && customizations.componentUpdates[component.id];
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
            // APLICAR A LOS 3 DISPOSITIVOS
            if (!newComponent.style) newComponent.style = {};
            
            // Desktop
            if (!newComponent.style.desktop) newComponent.style.desktop = {};
            newComponent.style.desktop.backgroundColor = buttonCustomization.backgroundColor;
            newComponent.style.desktop.color = buttonCustomization.textColor;
            
            // Tablet
            if (!newComponent.style.tablet) newComponent.style.tablet = {};
            newComponent.style.tablet.backgroundColor = buttonCustomization.backgroundColor;
            newComponent.style.tablet.color = buttonCustomization.textColor;
            
            // Mobile
            if (!newComponent.style.mobile) newComponent.style.mobile = {};
            newComponent.style.mobile.backgroundColor = buttonCustomization.backgroundColor;
            newComponent.style.mobile.color = buttonCustomization.textColor;
          }
        } else if (component.type === 'text') {
          // NUEVO: Aplicar colores individuales de textos con prioridad sobre color general
          const individualTextColor = customizations.individualTexts[component.id];
          
          // Obtener color original del componente como fallback
          const originalColor = component.style?.desktop?.color || 
                               component.style?.color || 
                               '#000000';
          
          // Lógica simplificada: individual > original (SIN color general)
          let textColor = originalColor; // Empezar con el color original
          if (individualTextColor?.textColor && individualTextColor.textColor !== '') {
            textColor = individualTextColor.textColor; // Color individual tiene prioridad sobre original
          }
          
          const backgroundColor = individualTextColor?.backgroundColor;
          
          console.log(`🎨 Aplicando color a texto ${component.id}:`, {
            original: originalColor,
            individual: individualTextColor?.textColor,
            final: textColor,
            hasBackground: !!backgroundColor
          });
          
          // Solo actualizar color, NO dimensiones ni posición
          // APLICAR A LOS 3 DISPOSITIVOS
          if (!newComponent.style) newComponent.style = {};
          
          // Desktop
          if (!newComponent.style.desktop) newComponent.style.desktop = {};
          newComponent.style.desktop.color = textColor;
          if (backgroundColor && backgroundColor !== 'transparent') {
            newComponent.style.desktop.backgroundColor = backgroundColor;
          }
          
          // Tablet
          if (!newComponent.style.tablet) newComponent.style.tablet = {};
          newComponent.style.tablet.color = textColor;
          if (backgroundColor && backgroundColor !== 'transparent') {
            newComponent.style.tablet.backgroundColor = backgroundColor;
          }
          
          // Mobile
          if (!newComponent.style.mobile) newComponent.style.mobile = {};
          newComponent.style.mobile.color = textColor;
          if (backgroundColor && backgroundColor !== 'transparent') {
            newComponent.style.mobile.backgroundColor = backgroundColor;
          }
        } else if (component.type === 'image') {
          // Aplicar customizations de imagen PRESERVANDO la imagen original
          const imageCustomization = customizations.images[component.id];
          
          // NUEVO: Verificar si hay una imagen personalizada almacenada (File object)
          let imageUrl = component.content;
          let hasCustomImage = false;
          
          if (imageCustomization instanceof File) {
            // Crear URL temporal para mostrar la imagen personalizada
            imageUrl = createSafeBlobUrl(imageCustomization);
            hasCustomImage = true;
            console.log('🖼️ SimpleBanner: Usando imagen personalizada:', { componentId: component.id, fileName: imageCustomization.name });
            
            // CORRECTO: Content debe ser solo el nombre del archivo
            newComponent.content = imageCustomization.name;
            // Mantener el preview URL para mostrar en la interfaz
            newComponent._previewUrl = imageUrl;
            console.log('🔗 SimpleBanner: Content marcado con nombre original:', newComponent.content);
            console.log('👁️ SimpleBanner: Preview URL asignada:', newComponent._previewUrl);
          } else if (component.content && typeof component.content === 'string') {
            console.log('🖼️ SimpleBanner: Procesando imagen original:', { componentId: component.id, originalContent: imageUrl });
            
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
          }
          
          // Marcar componente para procesamiento posterior si tiene imagen personalizada
          if (hasCustomImage) {
            newComponent._hasCustomImage = true;
            newComponent._customImageId = component.id;
            console.log('✅ SimpleBanner: Componente marcado para procesamiento de imagen personalizada:', component.id);
          }
          
          // NUEVO: Aplicar escalado manteniendo aspect ratio
          const scale = imageCustomization?.scale || 100;
          let finalWidth = newComponent.style?.desktop?.width;
          let finalHeight = newComponent.style?.desktop?.height;
          
          if (scale !== 100 && finalWidth && finalHeight) {
            const scaleMultiplier = scale / 100;
            const widthValue = parseFloat(finalWidth);
            const heightValue = parseFloat(finalHeight);
            
            if (!isNaN(widthValue) && !isNaN(heightValue)) {
              finalWidth = `${Math.round(widthValue * scaleMultiplier)}px`;
              finalHeight = `${Math.round(heightValue * scaleMultiplier)}px`;
              console.log('🔍 SimpleBanner: Imagen escalada:', { 
                componentId: component.id, 
                scale: `${scale}%`,
                originalSize: { width: newComponent.style?.desktop?.width, height: newComponent.style?.desktop?.height },
                newSize: { width: finalWidth, height: finalHeight }
              });
            }
          }
          
          // IMPORTANTE: SIEMPRE asignar _previewUrl para que la imagen se vea en TODOS los dispositivos
          newComponent.style = {
            ...newComponent.style,
            desktop: {
              ...newComponent.style?.desktop,
              _previewUrl: imageUrl,
              ...(finalWidth && finalHeight && { width: finalWidth, height: finalHeight })
            },
            tablet: {
              ...newComponent.style?.tablet,
              _previewUrl: imageUrl,
              ...(finalWidth && finalHeight && { width: finalWidth, height: finalHeight })
            },
            mobile: {
              ...newComponent.style?.mobile,
              _previewUrl: imageUrl,
              ...(finalWidth && finalHeight && { width: finalWidth, height: finalHeight })
            }
          };
          
          console.log('✅ SimpleBanner: _previewUrl asignada para todos los dispositivos:', imageUrl);
          
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
              // NUEVO: Aplicar escala a las dimensiones personalizadas también
              const scale = imageCustomization.scale || 100;
              const scaleMultiplier = scale / 100;
              
              let finalWidth = imageCustomization.size.width;
              let finalHeight = imageCustomization.size.height;
              
              if (scale !== 100) {
                const widthValue = parseFloat(finalWidth);
                const heightValue = parseFloat(finalHeight);
                
                if (!isNaN(widthValue) && !isNaN(heightValue)) {
                  finalWidth = `${Math.round(widthValue * scaleMultiplier)}px`;
                  finalHeight = `${Math.round(heightValue * scaleMultiplier)}px`;
                }
              }
              
              newComponent.style = {
                ...newComponent.style,
                desktop: {
                  ...newComponent.style?.desktop,
                  width: finalWidth,
                  height: finalHeight
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
                previewUrl = createSafeBlobUrl(imageCustomization.file);
              }
              
              // NUEVO: Aplicar escala también a nuevas imágenes
              const scale = imageCustomization.scale || 100;
              let scaledDimensions = {};
              
              if (scale !== 100 && newComponent.style?.desktop?.width && newComponent.style?.desktop?.height) {
                const scaleMultiplier = scale / 100;
                const widthValue = parseFloat(newComponent.style.desktop.width);
                const heightValue = parseFloat(newComponent.style.desktop.height);
                
                if (!isNaN(widthValue) && !isNaN(heightValue)) {
                  scaledDimensions = {
                    width: `${Math.round(widthValue * scaleMultiplier)}px`,
                    height: `${Math.round(heightValue * scaleMultiplier)}px`
                  };
                }
              }
              
              // Usar _previewUrl para el preview (como en BannerPreview)
              newComponent.style = {
                ...newComponent.style,
                desktop: {
                  ...newComponent.style?.desktop,
                  _previewUrl: previewUrl,
                  ...scaledDimensions
                },
                tablet: {
                  ...newComponent.style?.tablet,
                  _previewUrl: previewUrl,
                  ...scaledDimensions
                },
                mobile: {
                  ...newComponent.style?.mobile,
                  _previewUrl: previewUrl,
                  ...scaledDimensions
                }
              };
              
              // También almacenar en el sistema global para compatibilidad
              if (imageCustomization.file) {
                if (!window._imageFiles) window._imageFiles = {};
                window._imageFiles[component.id] = imageCustomization.file;
              }
            }
            // Nota: La URL original ya fue procesada arriba, no necesitamos repetir el proceso aquí
          } else {
            // NUEVO: Aplicar escala incluso sin customizations específicas si hay una escala diferente
            const scale = imageCustomization?.scale;
            if (scale && scale !== 100 && newComponent.style?.desktop?.width && newComponent.style?.desktop?.height) {
              const scaleMultiplier = scale / 100;
              const widthValue = parseFloat(newComponent.style.desktop.width);
              const heightValue = parseFloat(newComponent.style.desktop.height);
              
              if (!isNaN(widthValue) && !isNaN(heightValue)) {
                const scaledWidth = `${Math.round(widthValue * scaleMultiplier)}px`;
                const scaledHeight = `${Math.round(heightValue * scaleMultiplier)}px`;
                
                newComponent.style = {
                  ...newComponent.style,
                  desktop: {
                    ...newComponent.style.desktop,
                    width: scaledWidth,
                    height: scaledHeight
                  },
                  tablet: {
                    ...newComponent.style.tablet,
                    width: scaledWidth,
                    height: scaledHeight
                  },
                  mobile: {
                    ...newComponent.style.mobile,
                    width: scaledWidth,
                    height: scaledHeight
                  }
                };
              }
            }
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
      console.log('🔍 Template seleccionado, analizando componentes');
      analyzeTemplateComponents(selectedTemplate);
    }
  }, [selectedTemplate]);

  // Función para crear/obtener un mapa de variables template
  const getTemplateVariables = useCallback((clientData) => {
    return {
      razonSocial: clientData?.fiscalInfo?.razonSocial || clientData?.name || '',
      nombreEmpresa: clientData?.fiscalInfo?.razonSocial || clientData?.name || '',
      cif: clientData?.fiscalInfo?.cif || '',
      direccion: clientData?.fiscalInfo?.direccion || ''
    };
  }, []);

  // Función para detectar si un texto contiene una variable reemplazada previamente
  const detectReplacedVariables = useCallback((text, currentClientData) => {
    if (!text || typeof text !== 'string') return text;
    
    let modifiedText = text;
    
    // Detectar y revertir patrones comunes donde se debería usar {razonSocial}
    const patterns = [
      {
        // "Algunas pueden ser nuestras de [EMPRESA]" -> "Algunas pueden ser nuestras de {razonSocial}"
        regex: /Algunas pueden ser nuestras de ([^,\.;!?]+)/gi,
        replacement: 'Algunas pueden ser nuestras de {razonSocial}'
      },
      {
        // "Empresa: [EMPRESA]" -> "Empresa: {razonSocial}"
        regex: /Empresa:\s*([^,\.;!?\n]+)/gi,
        replacement: 'Empresa: {razonSocial}'
      },
      {
        // "[EMPRESA] utiliza cookies" -> "{razonSocial} utiliza cookies"
        regex: /^([^,\.;!?\n]+)\s+(utiliza|usa) cookies/gi,
        replacement: '{razonSocial} $2 cookies'
      },
      {
        // "En [EMPRESA] respetamos" -> "En {razonSocial} respetamos"
        regex: /En ([^,\.;!?\n]+) respetamos/gi,
        replacement: 'En {razonSocial} respetamos'
      },
      {
        // "[EMPRESA] se compromete" -> "{razonSocial} se compromete"
        regex: /^([^,\.;!?\n]+) se compromete/gi,
        replacement: '{razonSocial} se compromete'
      },
      {
        // "de [EMPRESA]" al final de oración -> "de {razonSocial}"
        regex: /de ([^,\.;!?\n]+)(\.|,|;|!|\?|$)/gi,
        replacement: 'de {razonSocial}$2'
      }
    ];
    
    patterns.forEach(({ regex, replacement }) => {
      const matches = [...modifiedText.matchAll(regex)];
      
      matches.forEach(match => {
        // Solo procesar si no contiene ya una variable template
        if (!match[0].includes('{') && !match[0].includes('}')) {
          const companyName = match[1]?.trim();
          
          // Verificar que parece un nombre de empresa válido (no una palabra común)
          if (companyName && companyName.length > 2 && companyName.length < 100) {
            // Evitar reemplazar palabras comunes que no son nombres de empresa
            const commonWords = ['cookies', 'sitio', 'web', 'página', 'usuario', 'datos', 'información', 'política', 'privacidad'];
            const isCommonWord = commonWords.some(word => companyName.toLowerCase().includes(word.toLowerCase()));
            
            if (!isCommonWord) {
              const newText = modifiedText.replace(match[0], match[0].replace(regex, replacement));
              if (newText !== modifiedText) {
                console.log('🔄 Detectado y revertido reemplazo previo:', { 
                  original: match[0], 
                  companyDetected: companyName,
                  revertido: match[0].replace(regex, replacement)
                });
                modifiedText = newText;
              }
            }
          }
        }
      });
    });
    
    return modifiedText;
  }, []);

  // Función mejorada para reemplazar variables en el contenido de componentes
  const replaceTemplateVariables = useCallback((template, clientData) => {
    console.log('🔧 replaceTemplateVariables iniciado (versión mejorada)');
    console.log('🔧 Template recibido:', !!template);
    console.log('🔧 ClientData recibido:', clientData);
    
    if (!template || !template.components) {
      console.log('⚠️ Template inválido o sin componentes');
      return template;
    }
    
    // Crear una copia profunda para evitar mutar el original
    const templateCopy = JSON.parse(JSON.stringify(template));
    
    // Obtener variables de reemplazo
    const variables = getTemplateVariables(clientData);
    console.log('📝 Variables disponibles para reemplazo:', variables);
    
    // Si no hay razón social, aplicar solo detección de variables previamente reemplazadas
    if (!variables.razonSocial || variables.razonSocial.trim() === '') {
      console.log('⚠️ No hay razón social nueva, solo detectando variables previas');
      
      // Procesar componentes para detectar y revertir reemplazos previos
      const processComponentForDetection = (component) => {
        if (!component) return component;
        
        if (component.content) {
          if (typeof component.content === 'string') {
            component.content = detectReplacedVariables(component.content, clientData);
          } else if (component.content.texts && typeof component.content.texts === 'object') {
            Object.keys(component.content.texts).forEach(lang => {
              if (typeof component.content.texts[lang] === 'string') {
                component.content.texts[lang] = detectReplacedVariables(component.content.texts[lang], clientData);
              }
            });
          } else if (component.content.text && typeof component.content.text === 'string') {
            component.content.text = detectReplacedVariables(component.content.text, clientData);
          }
        }
        
        // Procesar hijos recursivamente
        if (component.children && Array.isArray(component.children)) {
          component.children = component.children.map(processComponentForDetection);
        }
        
        return component;
      };
      
      templateCopy.components = templateCopy.components.map(processComponentForDetection);
      console.log('✅ Detección de variables previas completada');
      return templateCopy;
    }
    
    console.log('🔄 Realizando reemplazo completo de variables:', variables);
    
    // Función recursiva para procesar componentes con reemplazo mejorado
    const processComponent = (component) => {
      if (!component) return component;
      
      // Función para aplicar todas las variables a un texto
      const applyVariables = (text) => {
        if (!text || typeof text !== 'string') return text;
        
        let processedText = text;
        
        // Primero, detectar y revertir posibles reemplazos previos
        processedText = detectReplacedVariables(processedText, clientData);
        
        // Luego, aplicar nuevos reemplazos
        Object.entries(variables).forEach(([varName, varValue]) => {
          if (varValue && varValue.trim() !== '') {
            const regex = new RegExp(`\\{${varName}\\}`, 'g');
            const beforeReplace = processedText;
            processedText = processedText.replace(regex, varValue);
            
            if (beforeReplace !== processedText) {
              console.log(`✅ Variable ${varName} reemplazada:`, { 
                variable: `{${varName}}`, 
                valor: varValue,
                antes: beforeReplace,
                después: processedText
              });
            }
          }
        });
        
        return processedText;
      };
      
      // Procesar contenido del componente
      if (component.content) {
        if (typeof component.content === 'string') {
          component.content = applyVariables(component.content);
        } else if (component.content.texts && typeof component.content.texts === 'object') {
          // Reemplazar en textos multiidioma
          Object.keys(component.content.texts).forEach(lang => {
            if (typeof component.content.texts[lang] === 'string') {
              component.content.texts[lang] = applyVariables(component.content.texts[lang]);
            }
          });
        } else if (component.content.text && typeof component.content.text === 'string') {
          const originalText = component.content.text;
          component.content.text = applyVariables(component.content.text);
          if (originalText !== component.content.text) {
            console.log(`✅ Reemplazado en componente ${component.id} (legacy):`, { antes: originalText, después: component.content.text });
          }
        }
        
        // Debug: solo mostrar si contiene la variable
        if (JSON.stringify(component.content).includes('{razonSocial}')) {
          console.log(`🎯 Componente con {razonSocial} encontrado - ${component.id}:`, {
            type: component.type,
            contentType: typeof component.content,
            content: component.content
          });
        }
      }
      
      // Procesar hijos del componente
      if (component.children && Array.isArray(component.children)) {
        component.children = component.children.map(processComponent);
      }
      
      return component;
    };
    
    // Procesar todos los componentes
    let replacementsCount = 0;
    templateCopy.components = templateCopy.components.map(component => {
      const processedComponent = processComponent(component);
      
      // Contar reemplazos realizados
      const checkForReplacements = (comp) => {
        if (comp.content && typeof comp.content === 'string' && comp.content.includes(variables.razonSocial || '')) {
          replacementsCount++;
        }
        if (comp.children && Array.isArray(comp.children)) {
          comp.children.forEach(checkForReplacements);
        }
      };
      
      checkForReplacements(processedComponent);
      return processedComponent;
    });
    
    console.log('✅ Variables reemplazadas en template:', {
      razonSocialUsada: variables.razonSocial,
      reemplazosRealizados: replacementsCount,
      componentesTotal: templateCopy.components.length
    });
    
    return templateCopy;
  }, [getTemplateVariables, detectReplacedVariables]);

  // Función para crear una versión del template que preserve las variables para guardar en BD
  const createTemplateForDatabase = useCallback((template) => {
    if (!template) {
      console.warn('⚠️ Template no válido para base de datos');
      return null;
    }
    
    // Crear una copia profunda
    const templateForDB = JSON.parse(JSON.stringify(template));
    
    // IMPORTANTE: Asegurar que layout y components siempre estén presentes
    if (!templateForDB.layout) {
      console.warn('⚠️ Template sin layout, usando layout por defecto');
      templateForDB.layout = {
        desktop: { width: '400px', height: 'auto' },
        tablet: { width: '350px', height: 'auto' },
        mobile: { width: '300px', height: 'auto' }
      };
    }
    
    if (!templateForDB.components || !Array.isArray(templateForDB.components)) {
      console.warn('⚠️ Template sin components válidos, inicializando array vacío');
      templateForDB.components = [];
    }
    
    // Función recursiva para revertir cualquier reemplazo y preservar variables
    const preserveVariables = (component) => {
      if (!component) return component;
      
      // NUEVO: Marcar imágenes personalizadas para que el backend las procese
      if (component.type === 'image' && customizations.images?.[component.id]) {
        const imageCustomization = customizations.images[component.id];
        
        // Si tiene archivo personalizado, marcar para procesamiento en backend
        if (imageCustomization instanceof File) {
          component._hasCustomImage = true;
          component._customImageId = component.id;
          // CORRECTO: Content debe usar el patrón __IMAGE_REF__ como en el editor
          component.content = `__IMAGE_REF__${component.id}_${imageCustomization.name}`;
          console.log(`🖼️ Marcando imagen ${component.id} para procesamiento personalizado`);
          console.log(`🔗 Content marcado en templateForDatabase:`, component.content);
        } else if (imageCustomization.file || imageCustomization.tempUrl) {
          component._hasCustomImage = true;
          component._customImageId = component.id;
          console.log(`🖼️ Marcando imagen ${component.id} para procesamiento personalizado (legacy)`);
        }
        
        // Preservar configuración de escala
        if (imageCustomization.scale && imageCustomization.scale !== 100) {
          component._customScale = imageCustomization.scale;
          console.log(`🔍 Preservando escala ${imageCustomization.scale}% para imagen ${component.id}`);
        }
      }
      
      // Procesar contenido del componente para preservar variables
      if (component.content) {
        if (typeof component.content === 'string') {
          // Aplicar detección para revertir cualquier reemplazo previo
          component.content = detectReplacedVariables(component.content, {});
        } else if (component.content.texts && typeof component.content.texts === 'object') {
          // Procesar textos multiidioma
          Object.keys(component.content.texts).forEach(lang => {
            if (typeof component.content.texts[lang] === 'string') {
              component.content.texts[lang] = detectReplacedVariables(component.content.texts[lang], {});
            }
          });
        } else if (component.content.text && typeof component.content.text === 'string') {
          component.content.text = detectReplacedVariables(component.content.text, {});
        }
      }
      
      // Procesar hijos recursivamente
      if (component.children && Array.isArray(component.children)) {
        component.children = component.children.map(preserveVariables);
      }
      
      return component;
    };
    
    // Procesar todos los componentes
    templateForDB.components = templateForDB.components.map(preserveVariables);
    
    console.log('💾 Template preparado para base de datos:', {
      hasLayout: !!templateForDB.layout,
      hasComponents: !!templateForDB.components,
      componentsCount: templateForDB.components?.length || 0,
      templateName: templateForDB.name
    });
    
    return templateForDB;
  }, [detectReplacedVariables]);

  // Usar el hook para procesar variables del template
  const templateWithVariables = useTemplateVariables(selectedTemplate, client || formData);

  // Memoizar template personalizado
  const customizedTemplate = useMemo(() => {
    if (!templateWithVariables) return null;
    
    // Aplicar customizations al template que ya tiene las variables procesadas
    const result = applyCustomizations(templateWithVariables, customizations);
    
    console.log('🔄 Template con variables procesadas:', {
      hasClient: !!client,
      hasFiscalInfo: !!formData?.fiscalInfo,
      razonSocial: client?.fiscalInfo?.razonSocial || formData?.fiscalInfo?.razonSocial
    });
    
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
  }, [templateWithVariables, customizations]);

  // Función para manejar la carga de imágenes (NUEVO PATRÓN: igual al editor fullscreen)
  const handleImageUpload = (componentId, file) => {
    console.log('🚀 FRONTEND: handleImageUpload llamado', { componentId, fileName: file?.name, fileSize: file?.size });
    
    if (!file) {
      console.log('❌ FRONTEND: No hay archivo, saliendo de handleImageUpload');
      return;
    }
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      console.log('❌ FRONTEND: Tipo de archivo inválido:', file.type);
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }
    
    console.log('✅ FRONTEND: Archivo válido, preparando imagen para componente:', {
      componentId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    
    // NUEVO PATRÓN: NO subir inmediatamente, solo almacenar para el proceso de creación
    // Crear URL temporal para preview inmediato (pero no la guardamos, se creará cuando se necesite)
    console.log('📸 FRONTEND: Archivo listo para preview');
    
    // Actualizar customizations almacenando el archivo File directamente (igual que ClientsManagementPage)
    setCustomizations(prev => {
      const newCustomizations = {
        ...prev,
        images: {
          ...prev.images,
          [componentId]: file // Almacenar el archivo File directamente como hace ClientsManagementPage
        }
      };
      console.log('📝 FRONTEND: Customizations actualizadas:', newCustomizations);
      return newCustomizations;
    });
    
    // También almacenar en window._imageFiles para compatibilidad con ClientsManagementPage
    if (!window._imageFiles) {
      window._imageFiles = {};
      console.log('🆕 FRONTEND: Creando window._imageFiles');
    }
    window._imageFiles[componentId] = file;
    console.log('💾 FRONTEND: Archivo almacenado en window._imageFiles:', { componentId, fileName: file.name });
    
    console.log(`✅ FRONTEND: Imagen almacenada para componente ${componentId}: ${file.name}`);
    console.log('📊 FRONTEND: Total imágenes almacenadas:', Object.keys(window._imageFiles || {}).length);
    
    // Marcar que este componente tendrá una imagen personalizada en las customizations
    setCustomizations(prev => {
      const newCustomizations = {
        ...prev,
        images: {
          ...prev.images,
          [componentId]: file
        },
        // Marcar que este componente necesita actualización de imagen
        componentUpdates: {
          ...prev.componentUpdates,
          [componentId]: {
            ...prev.componentUpdates?.[componentId],
            hasCustomImage: true,
            imageRef: `IMAGE_REF_${componentId}_${file.name}`
          }
        }
      };
      console.log('🔄 FRONTEND: ComponentUpdates actualizadas:', newCustomizations.componentUpdates);
      return newCustomizations;
    });
    
    toast.success('Imagen preparada correctamente');
    
    // El archivo se enviará junto con el banner cuando se cree el cliente
    // El backend lo procesará y guardará en la carpeta final
  };

  // REMOVED: updateFormData ya no es necesario, se maneja directamente en el useEffect

  // FIXED: Usar debounce para evitar actualizaciones excesivas
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedTemplate && formData.bannerConfig && customizedTemplate) {
        // Crear versión del template para guardar en base de datos (con variables preservadas)
        const templateForDatabase = createTemplateForDatabase(selectedTemplate);
        
        // Validar que el nombre del cliente esté presente
        if (!formData.name || formData.name.trim() === '') {
          return;
        }

        // Recopilar todas las imágenes de las customizations (NUEVO PATRÓN: File directo)
        const imageFiles = {};
        const imageSettings = {};
        
        Object.entries(customizations.images || {}).forEach(([componentId, imageData]) => {
          if (imageData instanceof File) {
            // NUEVO: Ahora imageData es directamente el File object
            imageFiles[componentId] = imageData;
            imageSettings[componentId] = {
              fileName: imageData.name,
              hasCustomImage: true,
              scale: 100 // Por defecto sin escalado
            };
            console.log(`📁 Recopilando imagen para ${componentId}: ${imageData.name}`);
          } else if (imageData && typeof imageData === 'object' && imageData.file instanceof File) {
            // Mantener compatibilidad con formato anterior
            imageFiles[componentId] = imageData.file;
            imageSettings[componentId] = {
              fileName: imageData.fileName || imageData.file.name,
              hasCustomImage: true,
              tempUrl: imageData.tempUrl,
              scale: imageData.scale || 100
            };
          } else if (imageData && imageData.scale && imageData.scale !== 100) {
            // También guardar configuración de escala para imágenes existentes del template
            if (!imageSettings[componentId]) {
              imageSettings[componentId] = {};
            }
            imageSettings[componentId].scale = imageData.scale;
          }
        });

        // NUEVO: También transferir a window._imageFiles para compatibilidad con ClientsManagementPage
        if (Object.keys(imageFiles).length > 0) {
          if (!window._imageFiles) {
            window._imageFiles = {};
          }
          Object.entries(imageFiles).forEach(([componentId, file]) => {
            window._imageFiles[componentId] = file;
            console.log(`🔄 Transfiriendo imagen ${componentId} a window._imageFiles:`, file.name);
          });
        }

        // Solo actualizar si hay cambios reales
        const currentConfig = JSON.stringify(formData.bannerConfig?.customizations || {});
        const newConfig = JSON.stringify(customizations);
        
        if (currentConfig !== newConfig) {
          console.log('💾 CAMBIOS GUARDADOS:', {
            acceptButton: customizations.acceptButton,
            rejectButton: customizations.rejectButton,
            preferencesButton: customizations.preferencesButton,
            backgroundColor: customizations.backgroundColor,
            individualTexts: Object.keys(customizations.individualTexts || {}),
            images: Object.keys(customizations.images || {})
          });
          
          onChange('bannerConfig', {
            ...formData.bannerConfig,
            customizations: customizations,
            customizedTemplate: customizedTemplate,
            templateForDatabase: templateForDatabase,
            images: Object.keys(imageFiles).length > 0 ? imageFiles : formData.bannerConfig.images,
            imageSettings: Object.keys(imageSettings).length > 0 ? imageSettings : formData.bannerConfig.imageSettings,
            validated: true,
            clientName: formData.name,
            configuredAt: new Date().toISOString()
          });
          
          console.log('✅ Cambios guardados en formData exitosamente');
        } else {
          console.log('⏭️ Sin cambios que guardar (configs idénticas)');
        }
      }
    }, 200); // 200ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [customizations, selectedTemplate]); // Solo cuando cambian las customizations o selectedTemplate

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
        toast.warning('No se encontraron plantillas del sistema disponibles. El sistema creará una automáticamente. Si el problema persiste, contacte al administrador.');
        
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
    
    // Analizar componentes del template original
    analyzeTemplateComponents(template);
    
    // Actualizar formData con la plantilla seleccionada
    // El reemplazo de variables se hará en customizedTemplate useMemo
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

    // Verificar si ya tenemos customizations con valores editados
    const hasEditedValues = customizations.acceptButton?.backgroundColor && 
                           customizations.acceptButton.backgroundColor !== '' &&
                           hasInitializedRef.current;
    
    if (hasEditedValues) {
      console.log('🚫 BLOQUEANDO análisis - hay valores editados por el usuario');
      // Solo actualizar bannerComponents sin tocar customizations
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
      
      // Función recursiva completa para análisis (sin modificar customizations)
      const analyzeComponent = (component, parentContainer = null) => {
        if (!component || !component.type) {
          return;
        }

        // Detectar botones
        if (component.type === 'button') {
          const action = component.action?.type;
          const id = component.id;
          
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
        // Detectar imágenes
        else if (component.type === 'image') {
          analysis.images.push({ ...component, parentContainer });
        }
        // Detectar contenedores
        else if (component.type === 'container') {
          analysis.containers.push(component);
          
          // Analizar hijos del contenedor recursivamente
          if (component.children && Array.isArray(component.children)) {
            component.children.forEach(child => {
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

      // Analizar componentes raíz
      const rootComponents = components.filter(c => !c.parentId);
      rootComponents.forEach(component => {
        analyzeComponent(component);
      });
      
      setBannerComponents(analysis);
      console.log('✅ Análisis completado SIN modificar customizations preservadas');
      return;
    }

    console.log('🔍 TEMPLATE RECIBIDO para análisis:', {
      name: template.name,
      id: template._id,
      totalComponents: template.components?.length,
      components: template.components?.map(comp => ({
        id: comp.id,
        type: comp.type,
        action: comp.action,
        style: comp.style,
        content: typeof comp.content === 'string' ? comp.content : 'object'
      }))
    });

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
    
    // DEBUG: Verificar estructura COMPLETA de los botones encontrados - SIEMPRE MOSTRAR
    console.log('🔍 ANÁLISIS COMPLETO de botones en template:', {
      acceptButton: analysis.acceptButton ? {
        id: analysis.acceptButton.id,
        completeStyle: analysis.acceptButton.style,
        action: analysis.acceptButton.action,
        fullComponent: analysis.acceptButton
      } : 'No encontrado',
      rejectButton: analysis.rejectButton ? {
        id: analysis.rejectButton.id,
        completeStyle: analysis.rejectButton.style,
        action: analysis.rejectButton.action,
        fullComponent: analysis.rejectButton
      } : 'No encontrado',
      preferencesButton: analysis.preferencesButton ? {
        id: analysis.preferencesButton.id,
        completeStyle: analysis.preferencesButton.style,
        action: analysis.preferencesButton.action,
        fullComponent: analysis.preferencesButton
      } : 'No encontrado',
      allButtons: analysis.otherButtons.map(btn => ({
        id: btn.id,
        action: btn.action,
        style: btn.style,
        fullComponent: btn
      }))
    });
    
    // FIXED: Verificar si hay customizations guardadas en formData PRIMERO
    const formDataCustomizations = formData.bannerConfig?.customizations;
    const hasFormDataCustomizations = formDataCustomizations && Object.keys(formDataCustomizations).length > 0;
    
    // Luego verificar customizations actuales en estado
    const existingCustomizations = customizations;
    const hasExistingCustomizations = existingCustomizations && Object.keys(existingCustomizations).length > 0;
    
    // Prioridad: formData > customizations actuales > valores del template
    console.log('🔍 Verificando fuentes de customizations:', {
      hasFormDataCustomizations,
      hasExistingCustomizations,
      shouldPreserve: hasFormDataCustomizations || hasExistingCustomizations
    });
    
    // NUEVA LÓGICA: SIEMPRE extraer valores REALES del template sin valores por defecto
    const templateDefaults = {
      backgroundColor: template.layout?.desktop?.backgroundColor || template.layout?.backgroundColor || '#ffffff',
      acceptButton: {
        backgroundColor: analysis.acceptButton?.style?.desktop?.backgroundColor || '#000000',
        textColor: analysis.acceptButton?.style?.desktop?.color || '#ffffff'
      },
      rejectButton: {
        backgroundColor: analysis.rejectButton?.style?.desktop?.backgroundColor || '#000000',
        textColor: analysis.rejectButton?.style?.desktop?.color || '#ffffff'
      },
      preferencesButton: {
        backgroundColor: analysis.preferencesButton?.style?.desktop?.backgroundColor || '#000000',
        textColor: analysis.preferencesButton?.style?.desktop?.color || '#ffffff'
      }
      // textColor general eliminado - solo se usan colores individuales por texto
    };
    
    console.log('🎨 COLORES DEL BACKEND (template):', {
      acceptButton: {
        backgroundColor: analysis.acceptButton?.style?.desktop?.backgroundColor,
        color: analysis.acceptButton?.style?.desktop?.color,
        fullStyle: analysis.acceptButton?.style
      },
      rejectButton: {
        backgroundColor: analysis.rejectButton?.style?.desktop?.backgroundColor,
        color: analysis.rejectButton?.style?.desktop?.color,
        fullStyle: analysis.rejectButton?.style
      },
      preferencesButton: {
        backgroundColor: analysis.preferencesButton?.style?.desktop?.backgroundColor,
        color: analysis.preferencesButton?.style?.desktop?.color,
        fullStyle: analysis.preferencesButton?.style
      },
      templateLayout: {
        backgroundColor: template.layout?.desktop?.backgroundColor || template.layout?.backgroundColor,
        fullLayout: template.layout
      }
    });
    
    console.log('📋 Valores EXTRAÍDOS y PROCESADOS para usar:', templateDefaults);
    
    // Si hay customizations guardadas
    if (hasFormDataCustomizations || hasExistingCustomizations) {
      const storedCustomizations = formDataCustomizations || existingCustomizations;
      
      console.log('📦 CUSTOMIZATIONS GUARDADAS:', storedCustomizations);
      
      // Verificar si las customizations tienen valores vacíos (estado inicial)
      const needsTemplateColors = !storedCustomizations.acceptButton?.backgroundColor || 
                                 storedCustomizations.acceptButton?.backgroundColor === '';
      
      if (needsTemplateColors) {
        console.log('🔧 Customizations vacías, inicializando con colores del template');
        
        // Usar colores del template PERO NO establecer textColor general si hay textos individuales
        const updatedCustomizations = {
          ...storedCustomizations,
          backgroundColor: templateDefaults.backgroundColor,
          acceptButton: templateDefaults.acceptButton,
          rejectButton: templateDefaults.rejectButton,
          preferencesButton: templateDefaults.preferencesButton,
          // IMPORTANTE: NO establecer textColor general para no sobrescribir colores individuales
          // textColor: templateDefaults.textColor  // COMENTADO para permitir colores individuales
        };
        
        setCustomizations(updatedCustomizations);
        hasInitializedRef.current = true; // Marcar como inicializado
        console.log('✅ Customizations inicializadas con valores del template (sin textColor general)');
        
        // LOG: Colores que se mostrarán en los inputs
        console.log('🎯 COLORES DE INPUTS (con valores del template):', {
          acceptButton: {
            backgroundColor: updatedCustomizations.acceptButton?.backgroundColor,
            textColor: updatedCustomizations.acceptButton?.textColor
          },
          rejectButton: {
            backgroundColor: updatedCustomizations.rejectButton?.backgroundColor,
            textColor: updatedCustomizations.rejectButton?.textColor
          },
          preferencesButton: {
            backgroundColor: updatedCustomizations.preferencesButton?.backgroundColor,
            textColor: updatedCustomizations.preferencesButton?.textColor
          },
          backgroundColor: updatedCustomizations.backgroundColor
        });
      } else {
        console.log('✅ Customizations ya tienen valores, NO MODIFICAR');
        // IMPORTANTE: NO hacer setCustomizations aquí para no sobrescribir
        console.log('🎯 VALORES ACTUALES EN CUSTOMIZATIONS:', {
          acceptButton: storedCustomizations.acceptButton,
          rejectButton: storedCustomizations.rejectButton,
          preferencesButton: storedCustomizations.preferencesButton
        });
      }
      return;
    }
    
    console.log('🆕 Inicializando customizations desde template por primera vez');
    
    let newCustomizations = {
      // Usar valores específicos del template SIN textColor general
      backgroundColor: templateDefaults.backgroundColor,
      acceptButton: templateDefaults.acceptButton,
      rejectButton: templateDefaults.rejectButton,
      preferencesButton: templateDefaults.preferencesButton,
      // NO incluir textColor general para permitir colores individuales
      otherButtons: {},
      images: {},
      individualTexts: {},
      componentUpdates: {}
    };
    
    // Inicializar customizations para otros botones
    analysis.otherButtons.forEach(button => {
      newCustomizations.otherButtons[button.id] = {
        backgroundColor: button.style?.desktop?.backgroundColor || 
                       button.style?.backgroundColor || 'transparent',
        textColor: button.style?.desktop?.color || 
                 button.style?.color || '#000000'
      };
    });
    
    // Inicializar customizations para imágenes
    analysis.images.forEach(image => {
      newCustomizations.images[image.id] = {
        position: image.position?.desktop || { top: '0%', left: '0%' },
        size: {
          width: image.style?.desktop?.width || '100px',
          height: image.style?.desktop?.height || '100px'
        },
        currentImage: image.content || null,
        scale: 100
      };
    });
    
    // Inicializar textos individuales
    analysis.texts.forEach(text => {
      let displayContent = '';
      if (typeof text.content === 'string') {
        displayContent = text.content;
      } else if (text.content && typeof text.content === 'object') {
        if (text.content.texts && typeof text.content.texts === 'object') {
          displayContent = text.content.texts.es || text.content.texts.en || Object.values(text.content.texts)[0] || '';
        } else if (text.content.text) {
          displayContent = text.content.text;
        }
      }
      
      newCustomizations.individualTexts[text.id] = {
        textColor: text.style?.desktop?.color || text.style?.color || '#000000',
        backgroundColor: text.style?.desktop?.backgroundColor || text.style?.backgroundColor || 'transparent',
        content: displayContent,
        parentContainer: text.parentContainer?.id || null
      };
    });
    
    setCustomizations(newCustomizations);
    hasInitializedRef.current = true; // Marcar como inicializado
    
    // LOG: Colores que se mostrarán en los inputs (primera vez)
    console.log('🎯 COLORES DE INPUTS (inicialización primera vez):', {
      acceptButton: {
        backgroundColor: newCustomizations.acceptButton?.backgroundColor,
        textColor: newCustomizations.acceptButton?.textColor
      },
      rejectButton: {
        backgroundColor: newCustomizations.rejectButton?.backgroundColor,
        textColor: newCustomizations.rejectButton?.textColor
      },
      preferencesButton: {
        backgroundColor: newCustomizations.preferencesButton?.backgroundColor,
        textColor: newCustomizations.preferencesButton?.textColor
      },
      backgroundColor: newCustomizations.backgroundColor
    });
  };

  const updateCustomization = (type, field, value, buttonId = null) => {
    const newCustomizations = { ...customizations };
    
    // LOG: Cambio detectado
    console.log('🔄 CAMBIO DETECTADO:', {
      type,
      field,
      value,
      buttonId,
      oldValue: type === 'acceptButton' || type === 'rejectButton' || type === 'preferencesButton' 
        ? customizations[type]?.[field]
        : buttonId ? customizations[type]?.[buttonId]?.[field] : customizations[type]
    });
    
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
    } else if (type === 'individualTexts' && buttonId) {
      // NUEVO: Manejar textos individuales
      if (!newCustomizations.individualTexts[buttonId]) {
        newCustomizations.individualTexts[buttonId] = {};
      }
      newCustomizations.individualTexts[buttonId][field] = value;
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
    
    // REMOVED: Eliminar la llamada inmediata a onChange para evitar bucles
    // El useEffect se encargará de actualizar formData cuando sea necesario
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
    // FIXED: Asegurar que el valor inicial sea válido para el color picker
    const sanitizeColor = (color) => {
      if (!color || color === 'transparent') return '#ffffff';
      if (typeof color !== 'string') return '#ffffff';
      if (!color.startsWith('#')) return '#ffffff';
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return '#ffffff';
      return color;
    };
    
    const isTransparent = value === 'transparent';
    const [localColor, setLocalColor] = useState(sanitizeColor(value));
    const colorPickerRef = useRef(null);
    
    // Sincronizar con valor externo cuando cambie
    useEffect(() => {
      setLocalColor(sanitizeColor(value));
    }, [value]);
    
    const handleTransparentClick = () => {
      setLocalColor('#ffffff'); // Para mostrar en el picker
      onChange('transparent'); // Pero enviar transparent como valor
    };
    
    return (
      <div className={compact ? "mb-2" : "mb-3"}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <div className="flex items-center gap-3">
          {/* FIXED: Input de color simple sin contenedor wrapper que interfiera */}
          <div className="relative">
            <input
              ref={colorPickerRef}
              type="color"
              value={localColor}
              onChange={(e) => {
                // Solo actualizar estado local, NO llamar onChange aquí
                const newColor = e.target.value;
                setLocalColor(newColor);
              }}
              onBlur={(e) => {
                // AQUÍ SÍ llamar onChange cuando se pierde el foco
                const newColor = e.target.value;
                onChange(newColor);
              }}
              className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
              style={{
                backgroundColor: isTransparent ? 'transparent' : localColor,
                ...(isTransparent && {
                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                })
              }}
            />
          </div>
          <input
            type="text"
            value={isTransparent ? 'transparent' : localColor}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'transparent') {
                handleTransparentClick();
                return;
              }
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
          {/* Botón de transparencia para fondos */}
          {label.toLowerCase().includes('fondo') && (
            <button
              type="button"
              onClick={handleTransparentClick}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                isTransparent 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
              title="Hacer transparente"
            >
              {isTransparent ? '✓ Transparente' : 'Transparente'}
            </button>
          )}
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

  // NUEVO: Componente para controles de texto individual
  const IndividualTextControls = ({ text, customization, index }) => {
    if (!text) return null;
    
    // Obtener una vista previa del contenido del texto
    let previewContent = '';
    if (typeof text.content === 'string') {
      previewContent = text.content;
    } else if (text.content && typeof text.content === 'object') {
      if (text.content.texts && typeof text.content.texts === 'object') {
        previewContent = text.content.texts.es || text.content.texts.en || Object.values(text.content.texts)[0] || '';
      } else if (text.content.text) {
        previewContent = text.content.text;
      }
    }
    
    // Limitar la vista previa a 50 caracteres
    const truncatedPreview = previewContent.length > 50 ? 
      previewContent.substring(0, 50) + '...' : previewContent;
    
    return (
      <div className="bg-white p-3 rounded-lg border">
        <div className="mb-3">
          <h6 className="font-medium text-gray-700 text-sm mb-1">
            Texto {index + 1}
            {text.parentContainer && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                En {text.parentContainer.id}
              </span>
            )}
          </h6>
          <p className="text-xs text-gray-600 italic mb-2" title={previewContent}>
            "{truncatedPreview}"
          </p>
        </div>
        <div className="space-y-3">
          <ColorPicker
            label="Color de texto"
            value={customization?.textColor || '#374151'}
            onChange={(value) => updateCustomization('individualTexts', 'textColor', value, text.id)}
            compact={true}
          />
          <ColorPicker
            label="Fondo del texto"
            value={customization?.backgroundColor || 'transparent'}
            onChange={(value) => updateCustomization('individualTexts', 'backgroundColor', value, text.id)}
            compact={true}
          />
        </div>
      </div>
    );
  };

  // Eliminar este useEffect porque ya inicializamos desde formData en el useState

  if (isLoadingTemplates) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // LOG: Estado actual de customizations que se mostrarán en los inputs
  console.log('🎨 ESTADO ACTUAL DE CUSTOMIZATIONS EN INPUTS:', {
    acceptButton: customizations.acceptButton,
    rejectButton: customizations.rejectButton,
    preferencesButton: customizations.preferencesButton,
    backgroundColor: customizations.backgroundColor,
    individualTexts: Object.keys(customizations.individualTexts || {})
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Configuración del Banner de Cookies</h3>
        
        {/* Indicador de estado */}
        <div className="mb-4 p-3 rounded-lg border">
          {!formData.name || formData.name.trim() === '' ? (
            <div className="flex items-center text-amber-700 bg-amber-50 border-amber-200">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Requerido: Complete el nombre del cliente en el paso anterior para continuar</span>
            </div>
          ) : selectedTemplate ? (
            <div className="flex items-center text-green-700 bg-green-50 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">✓ Banner configurado correctamente para "{formData.name}"</span>
            </div>
          ) : (
            <div className="flex items-center text-blue-700 bg-blue-50 border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Seleccione una plantilla para continuar</span>
            </div>
          )}
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Solo se muestran plantillas del sistema validadas. Personaliza los colores, textos e imágenes según las necesidades del cliente.
        </p>
      </div>

      {/* Selector de plantillas */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3">
          Seleccionar Plantilla del Sistema
          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
            ✓ Validadas
          </span>
        </h4>
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
              <div className="flex items-center gap-4">
                {/* Selector de dispositivo */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                  <button
                    onClick={() => setCurrentDevice('desktop')}
                    className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                      currentDevice === 'desktop' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title="Escritorio"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 1v6h10V5H5z" clipRule="evenodd" />
                      <path d="M8 17a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    <span>PC</span>
                  </button>
                  <button
                    onClick={() => setCurrentDevice('tablet')}
                    className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                      currentDevice === 'tablet' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title="Tablet"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2H5zm0 2h10v12H5V4z" clipRule="evenodd" />
                    </svg>
                    <span>Tablet</span>
                  </button>
                  <button
                    onClick={() => setCurrentDevice('mobile')}
                    className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                      currentDevice === 'mobile' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title="Móvil"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm0 2h6v12H7V4z" clipRule="evenodd" />
                    </svg>
                    <span>Móvil</span>
                  </button>
                </div>
                
                {/* Selector de modo */}
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
            </div>
            <div className="border border-gray-200 rounded-lg bg-gray-100 overflow-hidden">
              {previewMode === 'simulator' ? (
                <BrowserSimulatorPreview 
                  bannerConfig={customizedTemplate} 
                  deviceView={currentDevice}
                  height={currentDevice === 'mobile' ? '600px' : currentDevice === 'tablet' ? '550px' : '500px'}
                />
              ) : (
                <div className="bg-white p-4" style={{ 
                  minHeight: currentDevice === 'mobile' ? '500px' : currentDevice === 'tablet' ? '450px' : '400px' 
                }}>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ 
                    minHeight: currentDevice === 'mobile' ? '460px' : currentDevice === 'tablet' ? '410px' : '360px' 
                  }}>
                    <InteractiveBannerPreview 
                      bannerConfig={customizedTemplate} 
                      deviceView={currentDevice}
                      height={currentDevice === 'mobile' ? '450px' : currentDevice === 'tablet' ? '400px' : '350px'}
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
              <div className="grid grid-cols-1 gap-4">
                <ColorPicker
                  label="Fondo del banner"
                  value={customizations.backgroundColor}
                  onChange={(value) => updateCustomization('backgroundColor', null, value)}
                  compact={true}
                />
              </div>
              {bannerComponents.texts.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Tip:</strong> Para personalizar los colores de cada texto individualmente, 
                    utiliza los controles específicos en la sección "Textos Individuales" más abajo.
                  </p>
                </div>
              )}
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

            {/* NUEVA SECCIÓN: Textos Individuales */}
            {bannerComponents.texts.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                <h5 className="font-medium text-gray-700 mb-3">
                  Textos Individuales
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    ✨ Nuevo
                  </span>
                </h5>
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Edición independiente:</strong> Personaliza el color de texto y fondo de cada elemento de texto por separado. 
                    Estos colores tienen prioridad sobre el color general.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bannerComponents.texts.map((text, index) => {
                    const textCustomization = customizations.individualTexts[text.id] || {};
                    return (
                      <IndividualTextControls
                        key={text.id}
                        text={text}
                        customization={textCustomization}
                        index={index}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sección de imágenes debajo */}
            {bannerComponents.images.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                <h5 className="font-medium text-gray-700 mb-3">Imágenes del Banner</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bannerComponents.images.map((image, index) => {
                    const imageCustomization = customizations.images[image.id] || {};
                    // Priorizar la imagen personalizada sobre la original
                    // NUEVO: Manejar el caso donde imageCustomization es directamente el File
                    let currentImageUrl = '';
                    if (imageCustomization instanceof File) {
                      // Si es un File directo, crear blob URL de manera segura
                      currentImageUrl = createSafeBlobUrl(imageCustomization);
                    } else if (imageCustomization.tempUrl) {
                      // Si tiene tempUrl, usarla
                      currentImageUrl = imageCustomization.tempUrl;
                    } else if (imageCustomization.file) {
                      // Si tiene file dentro del objeto, crear blob URL de manera segura
                      currentImageUrl = createSafeBlobUrl(imageCustomization.file);
                    } else if (image._previewUrl) {
                      // Si el componente tiene _previewUrl (desde el procesamiento)
                      currentImageUrl = image._previewUrl;
                    } else {
                      // Fallback a content original
                      currentImageUrl = image.content || '';
                    }
                    
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
                          
                          {/* NUEVO: Controles de escalado si la imagen existe */}
                          {currentImageUrl && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Escalar imagen (mantiene proporción)
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="20"
                                  max="200"
                                  step="5"
                                  value={imageCustomization.scale || 100}
                                  onChange={(e) => {
                                    const scale = parseInt(e.target.value);
                                    updateCustomization('images', 'scale', scale, image.id);
                                  }}
                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-xs font-mono text-gray-600 min-w-[50px]">
                                  {imageCustomization.scale || 100}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">20%</span>
                                <span className="text-xs text-gray-500">200%</span>
                              </div>
                              {(imageCustomization.scale || 100) !== 100 && (
                                <button
                                  onClick={() => updateCustomization('images', 'scale', 100, image.id)}
                                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Restablecer tamaño original
                                </button>
                              )}
                            </div>
                          )}
                          
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
              <div className="bg-gray-50 p-4 rounded-lg border">
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