import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import BannerThumbnail from '../banner/BannerThumbnail';
import BannerPreviewSimple from '../banner/BannerPreviewSimple';
import BannerPreviewEditable from '../banner/BannerPreviewEditable';
import { getClientTemplates } from '../../api/bannerTemplate';
import { UploadCloud, CheckCircle, Monitor, Smartphone, Tablet, Image } from 'lucide-react';
import { getImageUrl, handleImageError, processImageStyles, ImagePlaceholders } from '../../utils/imageProcessing';
import ImageEditor from '../banner/Editor/ImageEditor';

const BannerConfigStep = ({ formData, onChange, selectedDomain }) => {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [bannerConfig, setBannerConfig] = useState({
    templateId: '',
    name: '',
    acceptButtonColor: '#4CAF50', // Verde por defecto (Aceptar)
    rejectButtonColor: '#f44336', // Rojo por defecto (Rechazar)
    preferencesButtonColor: '#0047AB', // Azul por defecto (Preferencias)
    backgroundColor: '#FFFFFF', // Blanco por defecto
    textColor: '#333333', // Gris oscuro por defecto
    bannerType: 'modal', // modal, floating, banner
    position: 'bottom', // bottom, top, center o bottomRight, bottomLeft, topRight, topLeft para floating
    images: {}, // Mapa de id de componente de imagen -> archivo
    imageSettings: {} // Mapa de id de componente de imagen -> configuración (width, height, objectFit, objectPosition, maintainAspectRatio)
  });
  
  // Usar los valores de la configuración guardada en formData si existen
  useEffect(() => {
    if (formData.bannerConfig) {
      // Asegurarse de preservar el tipo y posición del banner existente
      setBannerConfig(prev => ({
        ...prev,
        ...formData.bannerConfig
      }));

      console.log("🧲 BannerConfigStep: Cargando configuración guardada desde formData:", formData.bannerConfig);
    }
  }, [formData.bannerConfig]);
  
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [tempUrls, setTempUrls] = useState([]);
  const [previewConfig, setPreviewConfig] = useState(null);

  // Efecto para cargar plantillas existentes
  useEffect(() => {
    if (isConfiguring) {
      fetchTemplates();
    }
  }, [isConfiguring]);
  
  // Efecto para ajustar la posición cuando cambia el tipo de banner
  useEffect(() => {
    if (bannerConfig.bannerType === 'floating' && 
        !['bottomRight', 'bottomLeft', 'topRight', 'topLeft'].includes(bannerConfig.position)) {
      // Si cambiamos a flotante, establecer posición por defecto
      setBannerConfig(prev => ({
        ...prev,
        position: 'bottomRight'
      }));
      // Actualizar formData principal
      onChange('bannerConfig', {
        ...bannerConfig,
        position: 'bottomRight'
      });
    } else if (bannerConfig.bannerType === 'banner' && 
               !['top', 'bottom', 'center'].includes(bannerConfig.position)) {
      // Si cambiamos a banner, establecer posición por defecto
      setBannerConfig(prev => ({
        ...prev,
        position: 'bottom'
      }));
      // Actualizar formData principal
      onChange('bannerConfig', {
        ...bannerConfig,
        position: 'bottom'
      });
    }
  }, [bannerConfig.bannerType]);

  // Limpiar las URLs temporales al desmontar el componente o cuando cambian
  useEffect(() => {
    return () => {
      // Limpiar URLs temporales anteriores cuando el componente se desmonta o cuando cambian
      tempUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error al revocar URL temporal:", error);
        }
      });
    };
  }, [tempUrls]);

  // Efecto para generar la vista previa cuando cambian las configuraciones o las imágenes
  useEffect(() => {
    const generatePreview = async () => {
      if (!selectedTemplate) {
        setPreviewConfig(null);
        return;
      }

      // Para debug: mostrar en consola los ajustes de imágenes
      console.log("Aplicando configuración de imágenes:", bannerConfig.imageSettings);

      // Limpiar URLs temporales anteriores
      tempUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error al revocar URL temporal:", error);
        }
      });

      // Array para almacenar nuevas URLs temporales
      const newTempUrls = [];

      // Clonar la plantilla seleccionada para no modificar el original
      const preview = JSON.parse(JSON.stringify(selectedTemplate));
      
      // IMPORTANTE: Asegurarse de que la vista original y la vista con cambios
      // tengan la misma configuración de tipo y posición para mantener coherencia visual
      
      // Extraer el tipo y posición originales para usarlo en la versión de cambios
      const originalType = selectedTemplate.layout?.desktop?.type || 'modal';
      const originalPosition = originalType === 'floating' ? 
          (selectedTemplate.layout?.desktop?.bottom && selectedTemplate.layout?.desktop?.right ? 'bottomRight' :
           selectedTemplate.layout?.desktop?.bottom && selectedTemplate.layout?.desktop?.left ? 'bottomLeft' :
           selectedTemplate.layout?.desktop?.top && selectedTemplate.layout?.desktop?.right ? 'topRight' :
           selectedTemplate.layout?.desktop?.top && selectedTemplate.layout?.desktop?.left ? 'topLeft' :
           'bottomRight') :
          (selectedTemplate.layout?.desktop?.position || 'bottom');
      
      console.log("🔑 Sincronizando tipo y posición entre vistas:", {
        tipoOriginal: originalType,
        posiciónOriginal: originalPosition,
        tipoConfig: bannerConfig.bannerType,
        posiciónConfig: bannerConfig.position
      });
      
      // Comentado: Ya no forzamos coherencia con la plantilla original
      // Permitimos que el usuario personalice el tipo y posición del banner
      
      console.log(`🔄 Permitiendo personalización de tipo=${bannerConfig.bannerType} y posición=${bannerConfig.position} (originales: tipo=${originalType}, posición=${originalPosition})`);
      

      // Ajustar el tipo de layout según la configuración personalizada del usuario
      if (preview.layout) {
        Object.keys(preview.layout).forEach(device => {
          // Aplicar el tipo de banner seleccionado por el usuario
          preview.layout[device].type = bannerConfig.bannerType;
          
          // Aplicar la posición según el tipo de banner seleccionado
          if (bannerConfig.bannerType === 'floating') {
            // Para banners flotantes, interpretar la posición como combinación
            const floatingPosition = bannerConfig.position || 'bottomRight';
            
            // Limpiar posiciones previas para evitar conflictos
            delete preview.layout[device].top;
            delete preview.layout[device].bottom;
            delete preview.layout[device].left;
            delete preview.layout[device].right;
            
            // Aplicar nuevas posiciones según selección del usuario
            if (floatingPosition.includes('bottom')) {
              preview.layout[device].bottom = '20px';
            } else if (floatingPosition.includes('top')) {
              preview.layout[device].top = '20px';
            }
            
            if (floatingPosition.includes('Right')) {
              preview.layout[device].right = '20px';
            } else if (floatingPosition.includes('Left')) {
              preview.layout[device].left = '20px';
            }
          } else {
            // Para modales y banners normales
            preview.layout[device].position = bannerConfig.position;
            
            // Limpiar propiedades de posición flotante que podrían interferir
            delete preview.layout[device].top;
            delete preview.layout[device].bottom;
            delete preview.layout[device].left;
            delete preview.layout[device].right;
          }
          
          // Aplicar colores personalizados
          preview.layout[device].backgroundColor = bannerConfig.backgroundColor;
        });
      }

      // Función para procesar imágenes con aspect ratio
      const processImage = async (imageFile, comp) => {
        return new Promise((resolve) => {
          // Crear una URL para la imagen subida
          const tempImageUrl = URL.createObjectURL(imageFile);
          newTempUrls.push(tempImageUrl);
          
          // Crear una imagen temporal para obtener las dimensiones reales
          const img = document.createElement('img');
          
          img.onload = () => {
            // Obtener el aspect ratio original de la imagen subida
            const originalAspectRatio = img.naturalWidth / img.naturalHeight;
            const updatedComp = JSON.parse(JSON.stringify(comp));
            
            // Obtener configuraciones personalizadas para esta imagen
            const customSettings = bannerConfig.imageSettings?.[comp.id] || {};
            
            // Para cada dispositivo, ajustar las dimensiones
            ['desktop', 'tablet', 'mobile'].forEach(device => {
              if (!updatedComp.style || !updatedComp.style[device]) return;
              
              // Marcar como imagen personalizada
              updatedComp.style[device]._imageCustomized = true;
              updatedComp.style[device]._previewUrl = tempImageUrl;
              
              // Obtener dimensiones del componente original
              const style = updatedComp.style[device];
              let width = style.width;
              let height = style.height;
              
              // Extraer valores numéricos y unidades
              const widthMatch = width ? width.match(/^(\d+)(px|%|rem|em|vh|vw)?$/) : null;
              const heightMatch = height ? height.match(/^(\d+)(px|%|rem|em|vh|vw)?$/) : null;
              
              if (widthMatch && heightMatch) {
                const widthValue = parseInt(widthMatch[1], 10);
                const heightValue = parseInt(heightMatch[1], 10);
                const widthUnit = widthMatch[2] || 'px';
                const heightUnit = heightMatch[2] || 'px';
                
                // IMPORTANTE: Aplicamos siempre las configuraciones personalizadas si existen
                let newWidth = widthValue;
                let newHeight = heightValue;
                
                // 1. Aplicar cambios iniciales de dimensiones según settings
                if (customSettings.width) {
                  const scaleFactor = customSettings.width / 100;
                  newWidth = Math.round(widthValue * scaleFactor);
                }
                
                if (customSettings.height) {
                  const scaleFactor = customSettings.height / 100;
                  newHeight = Math.round(heightValue * scaleFactor);
                }
                
                // 2. Si mantener proporción está activado, ajustar según sea necesario
                if (customSettings.maintainAspectRatio === true) {
                  // Si se modificaron ambas dimensiones, priorizar ancho
                  if (customSettings.width && customSettings.height) {
                    newHeight = Math.round(newWidth / originalAspectRatio);
                  }
                  // Si solo se modificó ancho, ajustar altura
                  else if (customSettings.width && !customSettings.height) {
                    newHeight = Math.round(newWidth / originalAspectRatio);
                  }
                  // Si solo se modificó altura, ajustar ancho
                  else if (!customSettings.width && customSettings.height) {
                    newWidth = Math.round(newHeight * originalAspectRatio);
                  }
                }
                
                // 3. Si no hay ajustes personalizados, mantener proporción original
                if (!customSettings.width && !customSettings.height) {
                  const containerAspectRatio = widthValue / heightValue;
                  
                  if (originalAspectRatio > containerAspectRatio) {
                    newWidth = widthValue;
                    newHeight = Math.round(widthValue / originalAspectRatio);
                  } else {
                    newHeight = heightValue;
                    newWidth = Math.round(heightValue * originalAspectRatio);
                  }
                }
                
                // 4. Aplicar dimensiones calculadas
                style.width = `${newWidth}${widthUnit}`;
                style.height = `${newHeight}${heightUnit}`;
                
                // 5. Asegurarnos de que la imagen no sobresalga del contenedor
                style.maxWidth = '100%';
                style.maxHeight = '100%';
                style.boxSizing = 'border-box';
                
                // 6. Aplicar object-fit y object-position
                style.objectFit = customSettings.objectFit || 'cover';
                style.objectPosition = customSettings.objectPosition || 'center';
                
                // 7. Registrar en consola para debug
                console.log(`Aplicando estilo a imagen (${comp.id}) en ${device}:`, {
                  originalDimensions: { width: widthValue, height: heightValue },
                  settings: customSettings,
                  newDimensions: { width: newWidth, height: newHeight },
                  styleApplied: { width: style.width, height: style.height }
                });
              }
            });
            
            // Reemplazar el contenido original con la nueva imagen
            if (typeof updatedComp.content === 'string') {
              updatedComp.content = tempImageUrl;
            } else if (updatedComp.content && typeof updatedComp.content === 'object' && updatedComp.content.texts) {
              Object.keys(updatedComp.content.texts).forEach(lang => {
                updatedComp.content.texts[lang] = tempImageUrl;
              });
            }
            
            // Asegurarse de que la imagen se vea en todos los casos
            // Sobreescribir el contenido para garantizar que la imagen se muestre
            updatedComp.content = tempImageUrl;
            
            // Añadir información de depuración para verificar que la imagen se procesa correctamente
            console.log(`Imagen procesada para componente ${comp.id}:`, {
              url: tempImageUrl,
              dimensiones: {
                ancho: updatedComp.style.desktop.width,
                alto: updatedComp.style.desktop.height
              },
              ajustes: {
                objectFit: updatedComp.style.desktop.objectFit,
                objectPosition: updatedComp.style.desktop.objectPosition
              }
            });
            
            resolve(updatedComp);
          };
          
          img.onerror = () => {
            // En caso de error, usar enfoque simple
            const updatedComp = JSON.parse(JSON.stringify(comp));
            
            ['desktop', 'tablet', 'mobile'].forEach(device => {
              if (updatedComp.style && updatedComp.style[device]) {
                updatedComp.style[device]._imageCustomized = true;
                updatedComp.style[device]._previewUrl = tempImageUrl;
                
                // Asegurar que existan las propiedades visuales mínimas usando nuestro procesador centralizado
                const baseStyle = updatedComp.style[device];
                const processedStyle = {
                  ...baseStyle,
                  width: baseStyle.width || '160px',
                  height: baseStyle.height || '120px',
                  objectFit: 'contain',
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  boxSizing: 'border-box'
                };
                
                // Actualizar el estilo con valores procesados
                updatedComp.style[device] = processedStyle;
              }
            });
            
            if (typeof updatedComp.content === 'string') {
              updatedComp.content = tempImageUrl;
            } else if (updatedComp.content && updatedComp.content.texts) {
              Object.keys(updatedComp.content.texts).forEach(lang => {
                updatedComp.content.texts[lang] = tempImageUrl;
              });
            }
            
            // Asegurarse de que la imagen se vea en todos los casos
            updatedComp.content = tempImageUrl;
            
            console.log(`Error al procesar imagen, usando enfoque alternativo para ${comp.id}`);
            
            resolve(updatedComp);
          };
          
          img.src = tempImageUrl;
        });
      };

      // Variable para rastrear si ya aplicamos una imagen genérica
      let genericImageApplied = false;

      // Procesar los componentes
      if (preview.components && Array.isArray(preview.components)) {
        const processedComponents = [];
        
        for (const component of preview.components) {
          // Clonar componente
          let comp = JSON.parse(JSON.stringify(component));
          
          if (comp.type === 'text') {
            // Aplicar color de texto
            ['desktop', 'tablet', 'mobile'].forEach(device => {
              if (comp.style && comp.style[device]) {
                comp.style[device].color = bannerConfig.textColor;
              }
            });
          } 
          else if (comp.type === 'button') {
            // Aplicar colores según tipo de botón
            ['desktop', 'tablet', 'mobile'].forEach(device => {
              if (comp.style && comp.style[device]) {
                if (comp.action && comp.action.type === 'accept_all') {
                  comp.style[device].backgroundColor = bannerConfig.acceptButtonColor;
                  comp.style[device].color = '#FFFFFF';
                } 
                else if (comp.action && comp.action.type === 'reject_all') {
                  comp.style[device].backgroundColor = bannerConfig.rejectButtonColor;
                  comp.style[device].color = '#FFFFFF';
                } 
                else if (comp.action && comp.action.type === 'show_preferences') {
                  comp.style[device].backgroundColor = bannerConfig.preferencesButtonColor;
                  comp.style[device].color = '#FFFFFF';
                }
              }
            });
          } 
          else if (comp.type === 'image') {
            // Procesar imagen específica si existe
            if (bannerConfig.images && bannerConfig.images[comp.id]) {
              comp = await processImage(bannerConfig.images[comp.id], comp);
              console.log(`📷 Procesando imagen para componente ${comp.id}: ${bannerConfig.images[comp.id].name}`);
            }
            // O aplicar imagen genérica si existe y aún no se ha aplicado
            else if (bannerConfig.images && bannerConfig.images.generic && !genericImageApplied) {
              comp = await processImage(bannerConfig.images.generic, comp);
              genericImageApplied = true;
              console.log(`📷 Aplicando imagen genérica al componente ${comp.id}: ${bannerConfig.images.generic.name}`);
            }
          }
          
          processedComponents.push(comp);
        }
        
        preview.components = processedComponents;
      }

      // Actualizar estado con la nueva previsualización
      setPreviewConfig(preview);
      
      // Actualizar URLs temporales para limpiarlas después
      setTempUrls(newTempUrls);
    };

    generatePreview();
  }, [selectedTemplate, bannerConfig.acceptButtonColor, bannerConfig.rejectButtonColor, 
      bannerConfig.preferencesButtonColor, bannerConfig.backgroundColor, bannerConfig.textColor, 
      bannerConfig.bannerType, bannerConfig.position, bannerConfig.images, bannerConfig.imageSettings]);

  // Cargar dominios al cambiar el paso
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      // Solo traer plantillas no del sistema y activas
      const response = await getClientTemplates({ status: 'active', type: 'custom' });
      setTemplates(response.data.templates || []);
    } catch (error) {
      toast.error('Error al cargar plantillas de banner');
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cambios en los campos del banner
  const handleBannerChange = (e) => {
    // Prevenir comportamiento predeterminado para evitar posibles envíos de formulario
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("🔄 BannerConfigStep: handleBannerChange llamado", e.target ? e.target.name : "evento sintético");
    const { name, value, type, files } = e.target;
    
    // Crear una copia del estado actual para modificarla
    let updatedConfig = { ...bannerConfig };
    
    if (type === 'file' && files && files.length > 0) {
      // Extraer el ID del componente del nombre (si existe)
      const componentId = name.startsWith('image-') ? name.substring(6) : null;
      
      if (componentId) {
        // Manejar carga de imagen para un componente específico
        console.log(`🔄 BannerConfigStep: Cargando imagen para componente ${componentId}`);
        
        // Actualizar configuración de imágenes
        updatedConfig = {
          ...updatedConfig,
          images: {
            ...updatedConfig.images,
            [componentId]: files[0]
          },
          imageSettings: {
            ...updatedConfig.imageSettings,
            [componentId]: {
              ...updatedConfig.imageSettings?.[componentId],
              // Asegurar que el mantener proporción esté activado por defecto
              maintainAspectRatio: true
            }
          }
        };
      } else {
        // Imagen genérica (legado)
        console.log("🔄 BannerConfigStep: Cargando imagen genérica");
        
        // Actualizar configuración de imágenes genéricas
        updatedConfig = {
          ...updatedConfig,
          images: {
            ...updatedConfig.images,
            generic: files[0]
          },
          imageSettings: {
            ...updatedConfig.imageSettings,
            generic: {
              ...updatedConfig.imageSettings?.generic,
              maintainAspectRatio: true
            }
          }
        };
      }
    } else {
      // Manejar otros campos (colores, tipo, posición, etc.)
      console.log(`🔄 BannerConfigStep: Actualizando campo ${name} a ${value}`);
      
      // Actualizar la propiedad específica
      updatedConfig = {
        ...updatedConfig,
        [name]: value
      };
    }
    
    // Actualizar el estado local con la nueva configuración
    setBannerConfig(updatedConfig);
    
    // Actualizar formData principal SIEMPRE con la configuración completa actualizada
    console.log("🔄 BannerConfigStep: Enviando configuración actualizada al padre", updatedConfig);
    onChange('bannerConfig', updatedConfig);
  };

  // Manejar selección de plantilla
  const handleTemplateSelect = (template, e) => {
    // Prevenir comportamiento predeterminado para evitar posibles envíos de formulario
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("🔄 BannerConfigStep: Seleccionando plantilla", template._id);
    
    // Detectar el tipo y posición actual de la plantilla seleccionada para mantener coherencia visual
    const detectedType = template.layout?.desktop?.type || 'modal';
    
    // Mostrar información de depuración detallada
    console.log("🔍 BannerConfigStep: Layout detectado en plantilla:", {
      tipo: template.layout?.desktop?.type,
      posición: template.layout?.desktop?.position,
      top: template.layout?.desktop?.top,
      bottom: template.layout?.desktop?.bottom,
      left: template.layout?.desktop?.left,
      right: template.layout?.desktop?.right
    });
    
    // Determinar la posición según el tipo de banner
    let detectedPosition;
    
    if (detectedType === 'floating') {
      // Para banners flotantes, determinar la posición según las propiedades de la plantilla
      if (template.layout?.desktop?.bottom && template.layout?.desktop?.right) {
        detectedPosition = 'bottomRight';
      } else if (template.layout?.desktop?.bottom && template.layout?.desktop?.left) {
        detectedPosition = 'bottomLeft';
      } else if (template.layout?.desktop?.top && template.layout?.desktop?.right) {
        detectedPosition = 'topRight';
      } else if (template.layout?.desktop?.top && template.layout?.desktop?.left) {
        detectedPosition = 'topLeft';
      } else {
        // Valor por defecto para flotantes
        detectedPosition = 'bottomRight';
      }
    } else {
      // Para modales y banners, usar la posición directamente o valor por defecto
      detectedPosition = template.layout?.desktop?.position || 
        (detectedType === 'modal' ? 'center' : 'bottom');
    }
    
    console.log(`🔰 BannerConfigStep: Detectado tipo=${detectedType} y posición=${detectedPosition} en plantilla`);
    
    // Actualizar plantilla seleccionada
    setSelectedTemplate(template);
    
    // Primero actualizamos el estado local utilizando la configuración detectada de la plantilla
    const updatedConfig = {
      ...bannerConfig,
      templateId: template._id,
      name: `${formData.name} - defecto`,
      bannerType: detectedType,       // Usar tipo detectado de la plantilla
      position: detectedPosition       // Usar posición detectada de la plantilla
    };
    
    console.log(`🔄 BannerConfigStep: Configurando banner con tipo=${detectedType} y posición=${detectedPosition}`);
    
    setBannerConfig(updatedConfig);
    
    // Luego actualizamos el formData del padre con el estado actualizado
    console.log("🔄 BannerConfigStep: Actualizando bannerConfig en formData", updatedConfig);
    onChange('bannerConfig', updatedConfig);
  };

  // Manejar cambio en el toggle de configuración
// Manejar cambio en el toggle de configuración
const handleToggleConfig = async () => {
  console.log("🔄 BannerConfigStep: handleToggleConfig llamado, estado actual:", isConfiguring);
  
  const newValue = !isConfiguring;
  console.log("🔄 BannerConfigStep: Cambiando a:", newValue);
  
  // Si estamos activando la configuración, primero verificar que haya plantillas disponibles
  if (newValue === true) {
    // Si ya tenemos plantillas cargadas, solo activar
    if (templates.length > 0) {
      setIsConfiguring(true);
      onChange('configureBanner', true);
      
      // Si tenemos configuración guardada, intentar cargar la plantilla
      if (formData.bannerConfig?.templateId) {
        const template = templates.find(t => t._id === formData.bannerConfig.templateId);
        if (template && !selectedTemplate) {
          setSelectedTemplate(template);
        }
      }
      return;
    }
    
    // Si no hay plantillas, cargarlas primero
    setIsLoading(true);
    
    try {
      // Intentar cargar plantillas
      const response = await getClientTemplates({ status: 'active', type: 'custom' });
      const availableTemplates = response.data.templates || [];
      
      console.log("🔄 BannerConfigStep: Plantillas cargadas:", availableTemplates.length);
      
      // Si no hay plantillas disponibles, mostrar un error y no activar la configuración
      if (availableTemplates.length === 0) {
        toast.error('No hay plantillas disponibles. Debe crear al menos una plantilla en la sección de gestión de banners antes de continuar.');
        setIsLoading(false);
        // Importante: NO cambiar el estado si no hay plantillas
        return;
      }
      
      // Si hay plantillas, guardarlas y activar la configuración
      setTemplates(availableTemplates);
      setIsConfiguring(true);
      onChange('configureBanner', true);
      
      // Si tenemos configuración guardada, intentar cargar la plantilla
      if (formData.bannerConfig?.templateId) {
        const template = availableTemplates.find(t => t._id === formData.bannerConfig.templateId);
        if (template) {
          setSelectedTemplate(template);
        }
      }
      
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
      toast.error('Error al verificar plantillas disponibles. Por favor, inténtelo de nuevo.');
      // En caso de error, NO cambiar el estado
      setIsLoading(false);
      return;
    }
    
    setIsLoading(false);
    
  } else {
    // Si estamos desactivando la configuración, simplemente desactivar
    console.log("🔄 BannerConfigStep: Desactivando configuración");
    setIsConfiguring(false);
    onChange('configureBanner', false);
  }
};

  // Obtener componentes de imagen del template seleccionado
  const templateImageComponents = selectedTemplate?.components?.filter(comp => comp.type === 'image') || [];

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Configuración del Banner</h3>
      
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <div className="form-control">
            <label className="flex items-center cursor-pointer gap-2">
              <input
                type="checkbox"
                checked={isConfiguring}
                onChange={(e) => handleToggleConfig(e)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-gray-700">Configurar banner para este cliente</span>
            </label>
          </div>
        </div>
        
        {isConfiguring && (
          <>
            <div className="p-4 bg-blue-50 rounded-lg mb-4 text-sm text-blue-800">
              <div className="flex items-center justify-between">
                <p>El banner configurado se asociará automáticamente con <strong>todos los dominios</strong> de este cliente.</p>
                {isLoading && (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-xs">Cargando...</span>
                  </div>
                )}
              </div>
            </div>
            
            {Array.isArray(formData.domains) && formData.domains.filter(d => d.trim()).length > 0 ? (
              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Dominios detectados:</span> {formData.domains.filter(d => d.trim()).length}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {formData.domains.filter(d => d.trim()).map((domain, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded">
                <p className="text-sm">No hay dominios detectados para la configuración del banner.</p>
                <p className="text-sm font-medium mt-2">El banner se configurará de forma genérica y se podrá asignar a dominios posteriormente.</p>
              </div>
            )}
            
            {/* Sección de selección de plantilla */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">1. Seleccionar plantilla base</h4>
              {isLoading ? (
                <div className="flex justify-center items-center h-60">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              ) : templates.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[250px] overflow-y-auto p-2 border rounded bg-gray-50">
                  {templates.map(template => (
                    <div 
                      key={template._id || Math.random().toString(36)}
                      className={`cursor-pointer border rounded-lg overflow-hidden h-32 transition-all ${
                        selectedTemplate?._id === template._id 
                          ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' 
                          : 'hover:border-gray-400 hover:shadow'
                      }`}
                      onClick={(e) => handleTemplateSelect(template, e)}
                    >
                      <div className="h-full relative">
                        <BannerThumbnail bannerConfig={template} className="bg-gray-50" />
                      </div>
                      {selectedTemplate?._id === template._id && (
                        <div className="absolute top-1 left-1 bg-blue-500 text-white p-1 rounded-full">
                          <CheckCircle size={16} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded text-yellow-700">
                  <p>No hay plantillas personalizadas disponibles. Cree plantillas en la sección de gestión de banners.</p>
                </div>
              )}
            </div>

            {/* Vista previa original y editada (vertical, original arriba) */}
            {selectedTemplate && (
              <div className="mb-6 border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-800">2. Previsualización del banner</h4>
                  
                  {/* Barra de herramientas de dispositivos */}
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border">
                    <button 
                      className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setPreviewDevice('desktop')}
                      type="button"
                      title="Vista de escritorio"
                    >
                      <Monitor size={18} />
                    </button>
                    <button 
                      className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setPreviewDevice('tablet')}
                      type="button"
                      title="Vista de tablet"
                    >
                      <Tablet size={18} />
                    </button>
                    <button 
                      className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setPreviewDevice('mobile')}
                      type="button"
                      title="Vista de móvil"
                    >
                      <Smartphone size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Vista original - primero */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2 bg-white inline-block px-2 py-1 rounded border">Plantilla original</h5>
                    <div className="border rounded-lg overflow-hidden h-96 relative bg-white flex items-center justify-center">
                      <div style={{ 
                          width: previewDevice === 'mobile' ? '360px' : previewDevice === 'tablet' ? '768px' : '100%',
                          height: '100%', 
                          maxWidth: '100%',
                          padding: '0'
                        }}>
                        {/* Usar la plantilla original sin modificaciones para ver su diseño original */}
                        <BannerPreviewSimple 
                          bannerConfig={selectedTemplate} 
                          deviceView={previewDevice} 
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Vista con cambios aplicados - segundo - VERSIÓN EDITABLE */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2 bg-white inline-block px-2 py-1 rounded border">
                      Configuración personalizada <span className="text-blue-600">(puedes modificar todas las opciones)</span>
                    </h5>
                    <div className="border-2 border-blue-300 rounded-lg overflow-hidden h-96 relative bg-gray-50 flex items-center justify-center">
                      <div style={{ 
                          width: previewDevice === 'mobile' ? '360px' : previewDevice === 'tablet' ? '768px' : '100%',
                          height: '100%', 
                          maxWidth: '100%',
                          padding: '0'
                        }}>
                          {/* Usamos BannerPreviewEditable para permitir edición interactiva */}
                          <BannerPreviewEditable 
                            bannerConfig={previewConfig} 
                            deviceView={previewDevice} 
                            className="w-full h-full"
                            onUpdateImageSettings={(componentId, settings) => {
                              console.log(`🔎 DEBUG - BannerConfigStep: Actualización desde preview para componente ${componentId}`, settings);
                              
                              // Crear una copia limpia de la configuración para evitar problemas
                              const cleanSettings = { ...settings };
                              
                              // Conservar las dimensiones en píxeles para mayor precisión
                              // Esto facilitará la transferencia exacta de dimensiones al backend
                              if ('widthPx' in cleanSettings) {
                                cleanSettings.widthRaw = cleanSettings.widthPx;
                                console.log(`🔎 DEBUG - Guardando ancho exacto en píxeles: ${cleanSettings.widthPx}px como widthRaw`);
                              }
                              if ('heightPx' in cleanSettings) {
                                cleanSettings.heightRaw = cleanSettings.heightPx;
                                console.log(`🔎 DEBUG - Guardando alto exacto en píxeles: ${cleanSettings.heightPx}px como heightRaw`);
                              }
                              
                              // Si hay posición, asegurarse de que se guarda correctamente
                              if (settings.position) {
                                console.log(`🔎 DEBUG - Posición recibida:`, settings.position);
                                // Marcar explícitamente que estamos usando píxeles
                                cleanSettings.positionMode = 'pixels';
                              }
                              
                              // Crear una copia completa de la configuración actual
                              let updatedConfig = { ...bannerConfig };
                              
                              // Actualizar las configuraciones de imagen
                              const updatedSettings = {
                                ...updatedConfig.imageSettings,
                                [componentId]: {
                                  ...updatedConfig.imageSettings?.[componentId],
                                  ...cleanSettings // Fusionar los nuevos ajustes limpios
                                }
                              };
                              
                              // Actualizar la configuración completa
                              updatedConfig = {
                                ...updatedConfig,
                                imageSettings: updatedSettings
                              };
                              
                              console.log(`🔎 DEBUG - BannerConfigStep: Dimensiones actualizadas: ${settings.width}% × ${settings.height}%`, 
                                settings.widthPx ? `(${settings.widthPx}px × ${settings.heightPx}px)` : '');
                              console.log(`🔎 DEBUG - Configuración completa para ${componentId}:`, updatedConfig.imageSettings[componentId]);
                              
                              // Actualizar estado local
                              setBannerConfig(updatedConfig);
                              
                              // Actualizar formData principal con la configuración completa
                              console.log("🔎 DEBUG - BannerConfigStep: Enviando configuración actualizada", updatedConfig);
                              onChange('bannerConfig', updatedConfig);
                            }}
                          />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Configuración básica en formato de tabs */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">3. Configuración básica del banner</h4>
              <div className="p-4 border rounded bg-white shadow-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del banner
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={bannerConfig.name || `${formData.name} - defecto`}
                    onChange={handleBannerChange}
                    className="w-full border border-gray-300 p-2 rounded"
                    placeholder={`${formData.name} - defecto`}
                  />
                </div>

                {/* Tipo y posición agrupados en una sola fila */}
                <div className="flex flex-wrap mt-4 gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de banner
                    </label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        className={`flex-1 py-2 px-3 rounded border ${bannerConfig.bannerType === 'modal' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                        onClick={() => handleBannerChange({ target: { name: 'bannerType', value: 'modal' }})}
                      >
                        Modal
                      </button>
                      <button 
                        type="button"
                        className={`flex-1 py-2 px-3 rounded border ${bannerConfig.bannerType === 'floating' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                        onClick={() => handleBannerChange({ target: { name: 'bannerType', value: 'floating' }})}
                      >
                        Flotante
                      </button>
                      <button 
                        type="button"
                        className={`flex-1 py-2 px-3 rounded border ${bannerConfig.bannerType === 'banner' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                        onClick={() => handleBannerChange({ target: { name: 'bannerType', value: 'banner' }})}
                      >
                        Banner
                      </button>
                    </div>
                  </div>
                  
                  {(bannerConfig.bannerType === 'banner' || bannerConfig.bannerType === 'floating') && (
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Posición del banner
                      </label>
                      {bannerConfig.bannerType === 'banner' ? (
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            className={`flex-1 py-2 px-3 rounded border ${bannerConfig.position === 'top' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                            onClick={() => handleBannerChange({ target: { name: 'position', value: 'top' }})}
                          >
                            Superior
                          </button>
                          <button 
                            type="button"
                            className={`flex-1 py-2 px-3 rounded border ${bannerConfig.position === 'bottom' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                            onClick={() => handleBannerChange({ target: { name: 'position', value: 'bottom' }})}
                          >
                            Inferior
                          </button>
                          <button 
                            type="button"
                            className={`flex-1 py-2 px-3 rounded border ${bannerConfig.position === 'center' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                            onClick={() => handleBannerChange({ target: { name: 'position', value: 'center' }})}
                          >
                            Centro
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            type="button"
                            className={`py-2 px-3 rounded border ${bannerConfig.position === 'topLeft' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                            onClick={() => handleBannerChange({ target: { name: 'position', value: 'topLeft' }})}
                          >
                            Superior izquierda
                          </button>
                          <button 
                            type="button"
                            className={`py-2 px-3 rounded border ${bannerConfig.position === 'topRight' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                            onClick={() => handleBannerChange({ target: { name: 'position', value: 'topRight' }})}
                          >
                            Superior derecha
                          </button>
                          <button 
                            type="button"
                            className={`py-2 px-3 rounded border ${bannerConfig.position === 'bottomLeft' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                            onClick={() => handleBannerChange({ target: { name: 'position', value: 'bottomLeft' }})}
                          >
                            Inferior izquierda
                          </button>
                          <button 
                            type="button"
                            className={`py-2 px-3 rounded border ${bannerConfig.position === 'bottomRight' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white text-gray-700'}`}
                            onClick={() => handleBannerChange({ target: { name: 'position', value: 'bottomRight' }})}
                          >
                            Inferior derecha
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Colores del banner en una sección separada */}
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Paleta de colores</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                    {/* Color de fondo general */}
                    <div className="bg-white p-2 rounded shadow-sm">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color de fondo
                      </label>
                      <div className="flex items-center">
                        <div className="relative">
                          <input
                            type="color"
                            name="backgroundColor"
                            value={bannerConfig.backgroundColor}
                            onChange={handleBannerChange}
                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                          />
                          <div className="absolute inset-0 border border-gray-300 rounded pointer-events-none"></div>
                        </div>
                        <input
                          type="text"
                          name="backgroundColor"
                          value={bannerConfig.backgroundColor}
                          onChange={handleBannerChange}
                          className="ml-2 flex-1 border border-gray-300 p-1 rounded text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Color de texto general */}
                    <div className="bg-white p-2 rounded shadow-sm">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color del texto
                      </label>
                      <div className="flex items-center">
                        <div className="relative">
                          <input
                            type="color"
                            name="textColor"
                            value={bannerConfig.textColor}
                            onChange={handleBannerChange}
                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                          />
                          <div className="absolute inset-0 border border-gray-300 rounded pointer-events-none"></div>
                        </div>
                        <input
                          type="text"
                          name="textColor"
                          value={bannerConfig.textColor}
                          onChange={handleBannerChange}
                          className="ml-2 flex-1 border border-gray-300 p-1 rounded text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Color botón Aceptar */}
                    <div className="bg-white p-2 rounded shadow-sm">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color botón "Aceptar"
                      </label>
                      <div className="flex items-center">
                        <div className="relative">
                          <input
                            type="color"
                            name="acceptButtonColor"
                            value={bannerConfig.acceptButtonColor}
                            onChange={handleBannerChange}
                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                          />
                          <div className="absolute inset-0 border border-gray-300 rounded pointer-events-none"></div>
                        </div>
                        <input
                          type="text"
                          name="acceptButtonColor"
                          value={bannerConfig.acceptButtonColor}
                          onChange={handleBannerChange}
                          className="ml-2 flex-1 border border-gray-300 p-1 rounded text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Color botón Rechazar */}
                    <div className="bg-white p-2 rounded shadow-sm">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color botón "Rechazar"
                      </label>
                      <div className="flex items-center">
                        <div className="relative">
                          <input
                            type="color"
                            name="rejectButtonColor"
                            value={bannerConfig.rejectButtonColor}
                            onChange={handleBannerChange}
                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                          />
                          <div className="absolute inset-0 border border-gray-300 rounded pointer-events-none"></div>
                        </div>
                        <input
                          type="text"
                          name="rejectButtonColor"
                          value={bannerConfig.rejectButtonColor}
                          onChange={handleBannerChange}
                          className="ml-2 flex-1 border border-gray-300 p-1 rounded text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Color botón Preferencias */}
                    <div className="bg-white p-2 rounded shadow-sm">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color botón "Preferencias"
                      </label>
                      <div className="flex items-center">
                        <div className="relative">
                          <input
                            type="color"
                            name="preferencesButtonColor"
                            value={bannerConfig.preferencesButtonColor}
                            onChange={handleBannerChange}
                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                          />
                          <div className="absolute inset-0 border border-gray-300 rounded pointer-events-none"></div>
                        </div>
                        <input
                          type="text"
                          name="preferencesButtonColor"
                          value={bannerConfig.preferencesButtonColor}
                          onChange={handleBannerChange}
                          className="ml-2 flex-1 border border-gray-300 p-1 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sección de imágenes */}
            {templateImageComponents.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3">4. Personalización de imágenes</h4>
                <div className="p-4 border rounded bg-white shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templateImageComponents.map(imgComp => {
                      const hasCustomImage = !!bannerConfig.images[imgComp.id];
                      const imgSettings = bannerConfig.imageSettings?.[imgComp.id] || {};
                      const maintainAspect = imgSettings.maintainAspectRatio === true;
                      
                      return (
                        <div key={imgComp.id} className="border rounded-lg p-3 bg-gray-50 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-700">
                                Imagen {templateImageComponents.indexOf(imgComp) + 1}
                              </span>
                            </div>
                            {/* Mini-miniatura de la imagen original */}
                            <div className="w-14 h-14 bg-white border rounded overflow-hidden flex items-center justify-center">
                              {typeof imgComp.content === 'string' && (imgComp.content.startsWith('/') || imgComp.content.startsWith('http')) ? (
                                <img 
                                  src={getImageUrl(imgComp, 'desktop', 'configStep')}
                                  alt="" 
                                  className="max-w-full max-h-full object-contain"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    // Usar el manejador centralizado de errores de imágenes
                                    handleImageError(
                                      e, 
                                      e.target.src, 
                                      imgComp.id, 
                                      null, // No necesitamos actualizar estado de error aquí
                                      (e, url, id) => {
                                        // Si todo falla, ocultar la imagen
                                        if (e && e.target) {
                                          e.target.style.display = 'none';
                                        }
                                        return false;
                                      }
                                    );
                                  }}
                                />
                              ) : (
                                <Image size={24} className="text-gray-300" />
                              )}
                            </div>
                          </div>
                          
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center relative mb-3 bg-white">
                            {hasCustomImage ? (
                              <div className="flex items-center justify-center">
                                <div className="mr-2 text-green-500">
                                  <CheckCircle size={18} />
                                </div>
                                <span className="text-sm text-gray-700 truncate">
                                  {bannerConfig.images && bannerConfig.images[imgComp.id] ? bannerConfig.images[imgComp.id].name : 'Imagen personalizada'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-2">
                                <UploadCloud className="h-8 w-8 text-gray-400" />
                                <p className="mt-1 text-sm text-gray-500">
                                  Reemplazar esta imagen
                                </p>
                                <p className="text-xs text-blue-500">
                                  Haz clic para seleccionar
                                </p>
                              </div>
                            )}
                            <label className="cursor-pointer absolute inset-0 w-full h-full opacity-0">
                              <input
                                type="file"
                                name={`image-${imgComp.id}`}
                                onChange={handleBannerChange}
                                className="sr-only"
                                accept="image/*,.ico"
                              />
                            </label>
                          </div>
                          
                          {/* Nota sobre edición directa */}
                          {hasCustomImage && (
                            <div className="bg-white p-3 rounded border">
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-medium text-blue-700">Edición directa disponible</h5>
                                <div className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                                  Puedes editar directamente en la vista previa
                                </div>
                              </div>
                              
                              <div className="flex items-center mt-3 gap-3 text-xs text-gray-700">
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                                  </svg>
                                  <span>Clic y arrastra para mover</span>
                                </div>
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                                  </svg>
                                  <span>Usa el control azul para ajustar el tamaño</span>
                                </div>
                              </div>
                              
                              {/* Opciones simples adicionales */}
                              <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                <label className="text-sm font-medium text-gray-700">
                                  Mantener proporción
                                </label>
                                <div className="relative inline-block w-10 h-5 select-none">
                                  <input 
                                    type="checkbox" 
                                    name={`maintainAspect-${imgComp.id}`}
                                    id={`maintainAspect-${imgComp.id}`}
                                    className="sr-only peer"
                                    checked={maintainAspect}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      console.log(`🔄 BannerConfigStep: Cambiando mantener proporción a ${checked} para imagen ${imgComp.id}`);
                                      
                                      // Crear una nueva copia completa de la configuración actual
                                      let updatedConfig = { ...bannerConfig };
                                      
                                      // Preparar las configuraciones de imagen actualizadas
                                      const updatedSettings = {
                                        ...updatedConfig.imageSettings,
                                        [imgComp.id]: {
                                          ...updatedConfig.imageSettings?.[imgComp.id],
                                          maintainAspectRatio: checked
                                        }
                                      };
                                      
                                      // Actualizar la configuración completa
                                      updatedConfig = {
                                        ...updatedConfig,
                                        imageSettings: updatedSettings
                                      };
                                      
                                      // Actualizar estado local
                                      setBannerConfig(updatedConfig);
                                      
                                      // Actualizar formData principal con la configuración completa
                                      console.log("🔄 BannerConfigStep: Enviando configuración actualizada con nueva proporción", updatedConfig);
                                      onChange('bannerConfig', updatedConfig);
                                    }}
                                  />
                                  <label 
                                    htmlFor={`maintainAspect-${imgComp.id}`}
                                    className={`absolute inset-0 cursor-pointer bg-gray-300 rounded-full transition duration-300 before:absolute before:content-[''] before:h-4 before:w-4 before:left-0.5 before:bottom-0.5 before:bg-white before:rounded-full before:transition peer-checked:bg-blue-500 peer-checked:before:translate-x-5`}
                                  ></label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Configuración genérica para banner sin imágenes */}
            {templateImageComponents.length === 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3">4. Personalización de imágenes</h4>
                <div className="p-4 border rounded bg-white shadow-sm">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative bg-gray-50">
                    {bannerConfig.images?.generic ? (
                      <div className="flex items-center justify-center">
                        <div className="mr-2 text-green-500">
                          <CheckCircle size={20} />
                        </div>
                        <span className="text-sm text-gray-700 truncate">
                          {bannerConfig.images.generic.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4">
                        <UploadCloud className="h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">
                          Hacer clic o arrastrar para subir una imagen
                        </p>
                        <p className="mt-1 text-xs text-blue-500">
                          (Este banner no tiene imágenes específicas)
                        </p>
                      </div>
                    )}
                    <label className="cursor-pointer absolute inset-0 w-full h-full opacity-0">
                      <input
                        type="file"
                        name="image"
                        onChange={handleBannerChange}
                        className="sr-only"
                        accept="image/*"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BannerConfigStep;