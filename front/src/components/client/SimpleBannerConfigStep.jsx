import React, { useState, useEffect, useRef } from 'react';
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
    images: {}
  });

  const previewRef = useRef(null);

  // Cargar plantillas disponibles
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Analizar componentes cuando se selecciona una plantilla
  useEffect(() => {
    if (selectedTemplate) {
      analyzeTemplateComponents(selectedTemplate);
    }
  }, [selectedTemplate]);

  // Actualizar formData cuando cambien las customizations
  useEffect(() => {
    if (selectedTemplate && formData.bannerConfig) {
      onChange('bannerConfig', {
        ...formData.bannerConfig,
        customizations: customizations,
        customizedTemplate: applyCustomizations(selectedTemplate, customizations)
      });
    }
  }, [customizations]);

  // Función para aplicar customizations al template
  const applyCustomizations = (template, customizations) => {
    if (!template) return null;
    
    const customizedTemplate = JSON.parse(JSON.stringify(template));
    
    // Aplicar customizations a cada componente
    const applyToComponents = (components) => {
      return components.map(component => {
        const newComponent = { ...component };
        
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
          
          // Aplicar estilos del botón
          if (buttonCustomization) {
            newComponent.style = {
              ...newComponent.style,
              desktop: {
                ...newComponent.style?.desktop,
                backgroundColor: buttonCustomization.backgroundColor,
                color: buttonCustomization.textColor
              }
            };
          }
        } else if (component.type === 'text') {
          // Aplicar color de texto general
          newComponent.style = {
            ...newComponent.style,
            desktop: {
              ...newComponent.style?.desktop,
              color: customizations.textColor
            }
          };
        } else if (component.type === 'image') {
          // Aplicar customizations de imagen PRESERVANDO la imagen original
          const imageCustomization = customizations.images[component.id];
          
          // Siempre preservar la imagen original si no hay customization
          if (!imageCustomization) {
            // Asegurar que la imagen original se mantenga visible
            if (component.content && !newComponent.style?.desktop?._previewUrl) {
              // Procesar la URL de la imagen correctamente
              let imageUrl = component.content;
              console.log('🖼️ Procesando imagen original:', { componentId: component.id, originalUrl: imageUrl });
              
              // Si no es una URL completa, construir la URL correcta
              if (typeof imageUrl === 'string' && !imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('/')) {
                  imageUrl = `${window.location.origin}${imageUrl}`;
                } else {
                  // Asumir que es una ruta relativa del servidor
                  imageUrl = `${window.location.origin}/${imageUrl}`;
                }
                console.log('🔗 URL procesada:', { componentId: component.id, processedUrl: imageUrl });
              }
              
              // Validar que imageUrl sea string antes de asignar
              if (typeof imageUrl === 'string') {
                newComponent.style = {
                  ...newComponent.style,
                  desktop: {
                    ...newComponent.style?.desktop,
                    _previewUrl: imageUrl
                  }
                };
                console.log('✅ Asignada _previewUrl como string:', imageUrl);
              } else {
                console.error('❌ imageUrl no es string:', typeof imageUrl, imageUrl);
              }
            }
          } else {
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
            if (imageCustomization.file) {
              // Crear ObjectURL para el archivo
              const objectUrl = URL.createObjectURL(imageCustomization.file);
              // Usar _previewUrl para el preview (como en BannerPreview)
              newComponent.style = {
                ...newComponent.style,
                desktop: {
                  ...newComponent.style?.desktop,
                  _previewUrl: objectUrl
                }
              };
              // También almacenar en el sistema global para compatibilidad
              if (!window._imageFiles) window._imageFiles = {};
              window._imageFiles[component.id] = imageCustomization.file;
            } else if (imageCustomization.tempUrl) {
              newComponent.style = {
                ...newComponent.style,
                desktop: {
                  ...newComponent.style?.desktop,
                  _previewUrl: imageCustomization.tempUrl
                }
              };
            } else {
              // Si no hay nueva imagen, preservar la original
              let imageUrl = component.content;
              
              // Procesar la URL de la imagen correctamente
              if (typeof imageUrl === 'string' && !imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('/')) {
                  imageUrl = `${window.location.origin}${imageUrl}`;
                } else {
                  imageUrl = `${window.location.origin}/${imageUrl}`;
                }
              }
              
              // Validar que imageUrl sea string antes de asignar
              if (typeof imageUrl === 'string') {
                newComponent.style = {
                  ...newComponent.style,
                  desktop: {
                    ...newComponent.style?.desktop,
                    _previewUrl: imageUrl
                  }
                };
                console.log('✅ Preservada _previewUrl como string:', imageUrl);
              } else {
                console.error('❌ imageUrl original no es string:', typeof imageUrl, imageUrl);
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

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await getSystemTemplates('en');
      const templates = response.data?.templates || [];
      setAvailableTemplates(templates);
      
      // Auto-seleccionar la primera plantilla
      if (templates.length > 0) {
        selectTemplate(templates[0]);
      }
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
      toast.error('Error al cargar plantillas del sistema');
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
    
    // Actualizar formData
    onChange('bannerConfig', {
      ...formData.bannerConfig,
      customizations: newCustomizations
    });
  };

  const handleImageUpload = (imageId, file) => {
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }
    
    // Crear URL temporal para preview
    const tempUrl = URL.createObjectURL(file);
    
    // Actualizar customizations con el nuevo archivo
    const newCustomizations = { ...customizations };
    if (!newCustomizations.images[imageId]) {
      newCustomizations.images[imageId] = {};
    }
    
    newCustomizations.images[imageId].file = file;
    newCustomizations.images[imageId].tempUrl = tempUrl;
    
    setCustomizations(newCustomizations);
    
    // Actualizar formData
    if (formData.bannerConfig) {
      onChange('bannerConfig', {
        ...formData.bannerConfig,
        customizations: newCustomizations,
        customizedTemplate: applyCustomizations(selectedTemplate, newCustomizations)
      });
    }
    
    toast.success('Imagen actualizada correctamente');
  };

  const handleComponentUpdate = (componentId, updates) => {
    if (!selectedTemplate) return;
    
    // Crear una copia del template actualizado
    const updatedTemplate = JSON.parse(JSON.stringify(selectedTemplate));
    
    // Encontrar y actualizar el componente
    const updateComponent = (components) => {
      return components.map(component => {
        if (component.id === componentId) {
          // Merge updates into component PRESERVANDO la información existente
          const updatedComponent = { ...component };
          
          if (updates.position) {
            updatedComponent.position = {
              ...updatedComponent.position,
              ...updates.position
            };
          }
          
          if (updates.style) {
            // Hacer merge profundo del style preservando propiedades existentes
            // IMPORTANTE: Preservar _previewUrl para que no se pierda la imagen
            updatedComponent.style = {
              ...updatedComponent.style,
              desktop: {
                ...updatedComponent.style?.desktop,
                ...updates.style.desktop,
                // Preservar _previewUrl si ya existe
                _previewUrl: updatedComponent.style?.desktop?._previewUrl || updates.style.desktop?._previewUrl
              }
            };
          }
          
          return updatedComponent;
        }
        
        // Recursively update children if container
        if (component.children && Array.isArray(component.children)) {
          component.children = updateComponent(component.children);
        }
        
        return component;
      });
    };
    
    updatedTemplate.components = updateComponent(updatedTemplate.components || []);
    
    // Actualizar el template seleccionado
    setSelectedTemplate(updatedTemplate);
    
    // Actualizar formData PRESERVANDO las customizations existentes
    onChange('bannerConfig', {
      ...formData.bannerConfig,
      selectedTemplate: updatedTemplate,
      customizedTemplate: applyCustomizations(updatedTemplate, customizations)
    });
  };

  const ColorPicker = ({ label, value, onChange, compact = false }) => {
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    
    return (
      <div className={compact ? "mb-2" : "mb-3"}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Color input sin overlay problemático */}
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsColorPickerOpen(true)}
              onBlur={() => setIsColorPickerOpen(false)}
              className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
              style={{
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                backgroundColor: value,
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '48px',
                minHeight: '48px'
              }}
            />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs border border-gray-300 px-2 py-1 rounded font-mono"
            style={{ width: '80px' }}
            placeholder="#ffffff"
            pattern="^#[0-9A-Fa-f]{6}$"
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
                  bannerConfig={applyCustomizations(selectedTemplate, customizations)} 
                  deviceView="desktop"
                  height="500px"
                />
              ) : (
                <div className="bg-white p-4" style={{ minHeight: '400px' }}>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4" style={{ minHeight: '360px' }}>
                    <InteractiveBannerPreview 
                      bannerConfig={applyCustomizations(selectedTemplate, customizations)} 
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
                    const currentImageUrl = imageCustomization.tempUrl || image.content || '';
                    
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