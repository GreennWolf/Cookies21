import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import BannerEditor from '../banner/Editor/BannerEditor';
import { getSystemTemplates } from '../../api/bannerTemplate';
import { CheckCircle, Palette, Type, Edit3, Save, AlertCircle } from 'lucide-react';

const BannerConfigStepV3 = ({ formData, onChange, selectedDomain }) => {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editorConfig, setEditorConfig] = useState(null);
  const [showSimpleEditor, setShowSimpleEditor] = useState(false);
  const [detectedTexts, setDetectedTexts] = useState([]);
  const [simpleConfig, setSimpleConfig] = useState({});
  const [errors, setErrors] = useState({});

  // Usar los valores de la configuración guardada en formData si existen
  useEffect(() => {
    if (formData.bannerConfig) {
      console.log("🧲 BannerConfigStepV3: Cargando configuración guardada desde formData:", formData.bannerConfig);
      
      // Si ya hay una configuración de editor completa, usarla
      if (formData.bannerConfig.editorConfig) {
        setEditorConfig(formData.bannerConfig.editorConfig);
        setIsConfiguring(true);
        
        // Detectar textos automáticamente
        analyzeTemplateTexts(formData.bannerConfig.editorConfig);
      }
    }
  }, [formData.bannerConfig]);

  // Efecto para cargar plantillas existentes
  useEffect(() => {
    if (isConfiguring && templates.length === 0) {
      fetchTemplates();
    }
  }, [isConfiguring]);

  // Función para analizar y detectar componentes de texto en la plantilla
  const analyzeTemplateTexts = (config) => {
    if (!config?.components) {
      setDetectedTexts([]);
      return;
    }

    const extractTexts = (components, parentPath = '') => {
      const texts = [];
      
      components.forEach((comp, index) => {
        const currentPath = parentPath ? `${parentPath}.children[${index}]` : `components[${index}]`;
        
        // Detectar componentes de texto
        if (comp.type === 'text') {
          let textContent = '';
          
          // Extraer contenido de texto según la estructura
          if (typeof comp.content === 'string') {
            textContent = comp.content;
          } else if (comp.content?.texts) {
            // Multi-idioma
            textContent = comp.content.texts.es || comp.content.texts.en || Object.values(comp.content.texts)[0] || '';
          } else if (comp.content?.text) {
            textContent = comp.content.text;
          }

          if (textContent.trim()) {
            texts.push({
              id: comp.id || `text-${index}`,
              content: textContent,
              path: currentPath,
              type: 'text',
              parentType: parentPath ? 'container' : 'root',
              currentStyle: {
                color: comp.style?.desktop?.color || '#000000',
                backgroundColor: comp.style?.desktop?.backgroundColor || 'transparent',
                fontSize: comp.style?.desktop?.fontSize || '14px',
                fontWeight: comp.style?.desktop?.fontWeight || 'normal'
              }
            });
          }
        }
        
        // Detectar componentes de botón
        else if (comp.type === 'button') {
          let buttonText = '';
          
          if (typeof comp.content === 'string') {
            buttonText = comp.content;
          } else if (comp.content?.texts) {
            buttonText = comp.content.texts.es || comp.content.texts.en || Object.values(comp.content.texts)[0] || '';
          } else if (comp.content?.text) {
            buttonText = comp.content.text;
          }

          if (buttonText.trim()) {
            texts.push({
              id: comp.id || `button-${index}`,
              content: buttonText,
              path: currentPath,
              type: 'button',
              parentType: parentPath ? 'container' : 'root',
              currentStyle: {
                color: comp.style?.desktop?.color || '#ffffff',
                backgroundColor: comp.style?.desktop?.backgroundColor || '#007bff',
                fontSize: comp.style?.desktop?.fontSize || '14px',
                fontWeight: comp.style?.desktop?.fontWeight || 'normal'
              }
            });
          }
        }
        
        // Recursivamente analizar contenedores
        else if (comp.type === 'container' && comp.children) {
          texts.push(...extractTexts(comp.children, currentPath));
        }
      });
      
      return texts;
    };

    const foundTexts = extractTexts(config.components);
    console.log('🔍 Textos detectados:', foundTexts);
    setDetectedTexts(foundTexts);
    
    // Inicializar configuración simple con valores actuales
    const initialSimpleConfig = {};
    foundTexts.forEach(text => {
      initialSimpleConfig[text.id] = {
        ...text.currentStyle
      };
    });
    setSimpleConfig(initialSimpleConfig);
  };

  // Cargar plantillas disponibles (solo del sistema)
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Cargando plantillas del sistema...');
      const response = await getSystemTemplates('es'); // Usar idioma español
      
      // La respuesta viene en response.data.templates
      const systemTemplates = response.data?.templates || [];
      setTemplates(systemTemplates);
      
      console.log('🏛️ Plantillas del sistema cargadas via getSystemTemplates:', {
        total: systemTemplates.length,
        templates: systemTemplates.map(t => ({ id: t._id, name: t.name, type: t.type, status: t.status }))
      });
      
      if (systemTemplates.length === 0) {
        console.warn('⚠️ No se encontraron plantillas del sistema');
      }
    } catch (error) {
      console.error('❌ Error al cargar plantillas del sistema:', error);
      toast.error('Error al cargar plantillas del sistema');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cambio en el toggle de configuración
  const handleToggleConfig = async () => {
    const newValue = !isConfiguring;
    
    if (newValue === true) {
      if (templates.length > 0) {
        setIsConfiguring(true);
        onChange('configureBanner', true);
        return;
      }
      
      setIsLoading(true);
      
      try {
        console.log('🔄 Cargando plantillas del sistema en toggle...');
        const response = await getSystemTemplates('es');
        const systemTemplates = response.data?.templates || [];
        
        if (systemTemplates.length === 0) {
          setErrors({ general: 'No hay plantillas del sistema disponibles. El sistema creará una automáticamente. Si el problema persiste, contacte al administrador.' });
          setIsLoading(false);
          return;
        }
        
        setTemplates(systemTemplates);
        setIsConfiguring(true);
        onChange('configureBanner', true);
        setErrors({});
        
        console.log('🏛️ Plantillas del sistema cargadas en toggle via getSystemTemplates:', {
          total: systemTemplates.length,
          templates: systemTemplates.map(t => ({ id: t._id, name: t.name, type: t.type, status: t.status }))
        });
        
      } catch (error) {
        console.error('Error al cargar plantillas:', error);
        setErrors({ general: 'Error al verificar plantillas disponibles. Por favor, inténtelo de nuevo.' });
        setIsLoading(false);
        return;
      }
      
      setIsLoading(false);
      
    } else {
      setIsConfiguring(false);
      onChange('configureBanner', false);
      setEditorConfig(null);
      setSelectedTemplate(null);
      setDetectedTexts([]);
      setSimpleConfig({});
      setShowSimpleEditor(false);
      setErrors({});
    }
  };

  // Manejar selección de plantilla
  const handleTemplateSelect = (template) => {
    console.log("🔄 BannerConfigStepV3: Seleccionando plantilla", template._id);
    
    setSelectedTemplate(template);
    
    // Crear una copia profunda de la plantilla para el editor
    const templateCopy = JSON.parse(JSON.stringify(template));
    
    // Configurar el nombre por defecto
    templateCopy.name = `${formData.name} - Banner Personalizado`;
    
    setEditorConfig(templateCopy);
    analyzeTemplateTexts(templateCopy);
    setShowSimpleEditor(true);
    setErrors({});
  };

  // Validar configuración antes de guardar
  const validateConfiguration = () => {
    const newErrors = {};
    
    if (!selectedTemplate) {
      newErrors.template = 'Debe seleccionar una plantilla';
    }
    
    if (!editorConfig) {
      newErrors.editor = 'Debe configurar el banner';
    }
    
    // Validar que el nombre del cliente esté presente
    if (!formData.name || formData.name.trim() === '') {
      newErrors.clientName = 'El nombre del cliente es obligatorio para configurar el banner';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Aplicar cambios de estilo simple al editor config
  const applySimpleStyles = () => {
    if (!editorConfig || !detectedTexts.length) return editorConfig;
    
    const updateComponentStyle = (components, textConfigs) => {
      return components.map(comp => {
        // Crear una copia profunda del componente para evitar mutaciones
        const updatedComp = JSON.parse(JSON.stringify(comp));
        
        // Buscar si este componente tiene configuración de estilo
        const textConfig = textConfigs.find(t => t.id === comp.id);
        if (textConfig && simpleConfig[textConfig.id]) {
          const newStyle = simpleConfig[textConfig.id];
          
          // Asegurar que la estructura de style existe
          if (!updatedComp.style) updatedComp.style = {};
          if (!updatedComp.style.desktop) updatedComp.style.desktop = {};
          
          // Aplicar nuevos estilos preservando los existentes
          updatedComp.style.desktop = {
            ...updatedComp.style.desktop,
            color: newStyle.color,
            backgroundColor: newStyle.backgroundColor,
            fontSize: newStyle.fontSize || updatedComp.style.desktop.fontSize,
            fontWeight: newStyle.fontWeight || updatedComp.style.desktop.fontWeight
          };
          
          console.log(`✅ Aplicando estilos a componente ${comp.id}:`, {
            originalStyle: comp.style?.desktop,
            newStyle: updatedComp.style.desktop,
            simpleConfig: newStyle
          });
        }
        
        // Actualizar recursivamente los hijos si es un contenedor
        if (updatedComp.type === 'container' && updatedComp.children) {
          updatedComp.children = updateComponentStyle(updatedComp.children, textConfigs);
        }
        
        return updatedComp;
      });
    };
    
    const updatedConfig = {
      ...editorConfig,
      components: updateComponentStyle(editorConfig.components, detectedTexts),
      // Preservar metadatos importantes
      _id: editorConfig._id,
      name: editorConfig.name,
      layout: editorConfig.layout,
      settings: editorConfig.settings,
      // Añadir timestamp de última modificación
      lastModified: new Date().toISOString(),
      // Marcar que fue editado con configuración simple
      editedWithSimpleConfig: true
    };
    
    return updatedConfig;
  };

  // Manejar guardado del banner desde el editor avanzado
  const handleSaveBanner = (bannerData) => {
    console.log("💾 BannerConfigStepV3: Guardando configuración del banner", bannerData);
    
    if (!validateConfiguration()) {
      toast.error('Por favor, complete todos los campos obligatorios');
      return;
    }
    
    const bannerConfig = {
      templateId: selectedTemplate?._id,
      name: bannerData.name,
      editorConfig: bannerData,
      bannerType: bannerData.layout?.desktop?.type || 'modal',
      position: bannerData.layout?.desktop?.position || 'bottom',
      backgroundColor: bannerData.layout?.desktop?.backgroundColor || '#FFFFFF',
    };
    
    onChange('bannerConfig', bannerConfig);
    toast.success('Configuración del banner guardada');
  };

  // Manejar guardado de la configuración simple
  const handleSaveSimpleConfig = () => {
    if (!validateConfiguration()) {
      toast.error('Por favor, complete todos los campos obligatorios');
      return;
    }
    
    try {
      // Aplicar los estilos simples al editor config
      const updatedConfig = applySimpleStyles();
      
      // Verificar que la configuración es válida
      if (!updatedConfig || !updatedConfig.components) {
        toast.error('Error al aplicar la configuración. Por favor, inténtelo de nuevo.');
        return;
      }
      
      const bannerConfig = {
        templateId: selectedTemplate?._id,
        name: updatedConfig.name,
        editorConfig: updatedConfig,
        bannerType: updatedConfig.layout?.desktop?.type || 'modal',
        position: updatedConfig.layout?.desktop?.position || 'bottom',
        backgroundColor: updatedConfig.layout?.desktop?.backgroundColor || '#FFFFFF',
        simpleConfig: simpleConfig, // Guardar también la configuración simple
        // Preservar información de imágenes
        hasCustomImages: updatedConfig.components.some(comp => 
          comp.type === 'image' || comp.type === 'logo' ||
          (comp.type === 'container' && comp.children?.some(child => 
            child.type === 'image' || child.type === 'logo'
          ))
        ),
        // Timestamp para control de versiones
        configuredAt: new Date().toISOString(),
        configuredBy: 'simple-editor'
      };
      
      console.log('💾 Guardando configuración del banner:', {
        templateId: bannerConfig.templateId,
        componentCount: updatedConfig.components.length,
        hasCustomImages: bannerConfig.hasCustomImages,
        textCount: detectedTexts.length
      });
      
      setEditorConfig(updatedConfig);
      onChange('bannerConfig', bannerConfig);
      toast.success('Configuración del banner guardada correctamente');
      
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error('Error al guardar la configuración. Por favor, inténtelo de nuevo.');
    }
  };

  // Manejar cambio de color para un componente específico
  const handleColorChange = (textId, property, value) => {
    setSimpleConfig(prev => ({
      ...prev,
      [textId]: {
        ...prev[textId],
        [property]: value
      }
    }));
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Configuración del Banner</h3>
      
      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{errors.general}</span>
        </div>
      )}
      
      {errors.clientName && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{errors.clientName}</span>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <div className="form-control">
            <label className="flex items-center cursor-pointer gap-2">
              <input
                type="checkbox"
                checked={isConfiguring}
                onChange={handleToggleConfig}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-gray-700">
                Configurar banner para este cliente
                <span className="text-red-500 ml-1">*</span>
              </span>
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
            
            {/* Selección de plantilla */}
            {!editorConfig && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3">
                  1. Seleccionar plantilla del sistema
                  <span className="text-red-500 ml-1">*</span>
                </h4>
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                  <p>
                    <strong>Nota:</strong> Solo se muestran plantillas del sistema para garantizar la calidad y consistencia.
                    Las plantillas del sistema están optimizadas y han sido validadas para todos los tipos de uso.
                  </p>
                </div>
                {errors.template && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {errors.template}
                  </div>
                )}
                {isLoading ? (
                  <div className="flex justify-center items-center h-60">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : templates.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-2 border rounded bg-gray-50">
                    {templates.map(template => (
                      <div 
                        key={template._id}
                        className={`cursor-pointer border rounded-lg overflow-hidden transition-all p-2 ${
                          selectedTemplate?._id === template._id 
                            ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' 
                            : 'hover:border-gray-400 hover:shadow'
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="text-center">
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-green-600 mt-1 font-medium">
                            ✓ Plantilla del Sistema
                          </div>
                          <div className="text-xs text-gray-500">
                            {template.layout?.desktop?.type || 'modal'}
                          </div>
                        </div>
                        {selectedTemplate?._id === template._id && (
                          <div className="mt-2 flex justify-center">
                            <CheckCircle size={20} className="text-blue-500" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-700">
                    <p className="font-medium">No hay plantillas del sistema disponibles</p>
                    <p className="text-sm mt-1">
                      Contacte al administrador para que configure plantillas del sistema antes de crear clientes.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Editor simple de textos */}
            {showSimpleEditor && detectedTexts.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Palette className="h-4 w-4 mr-2" />
                  2. Personalizar textos y colores
                </h4>
                
                <div className="bg-white border rounded-lg p-4">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Se detectaron {detectedTexts.length} elementos de texto. Personaliza sus colores aquí:
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {detectedTexts.map((text, index) => (
                      <div key={text.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Type className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="font-medium text-sm">
                              {text.type === 'button' ? 'Botón' : 'Texto'} {index + 1}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({text.parentType === 'container' ? 'En contenedor' : 'Independiente'})
                            </span>
                          </div>
                        </div>
                        
                        <div className="mb-3 p-2 bg-white rounded text-sm border">
                          "{text.content.substring(0, 50)}{text.content.length > 50 ? '...' : ''}"
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Color del texto
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <input
                                  type="color"
                                  value={simpleConfig[text.id]?.color || text.currentStyle.color}
                                  onChange={(e) => handleColorChange(text.id, 'color', e.target.value)}
                                  className="w-10 h-8 border border-gray-300 rounded cursor-pointer overflow-hidden"
                                  style={{
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    appearance: 'none',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px'
                                  }}
                                  title="Seleccionar color de texto"
                                />
                              </div>
                              <input
                                type="text"
                                value={simpleConfig[text.id]?.color || text.currentStyle.color}
                                onChange={(e) => handleColorChange(text.id, 'color', e.target.value)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="#000000"
                                pattern="^#[0-9A-Fa-f]{6}$"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Color de fondo
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <input
                                  type="color"
                                  value={simpleConfig[text.id]?.backgroundColor === 'transparent' ? '#ffffff' : (simpleConfig[text.id]?.backgroundColor || text.currentStyle.backgroundColor)}
                                  onChange={(e) => handleColorChange(text.id, 'backgroundColor', e.target.value)}
                                  className="w-10 h-8 border border-gray-300 rounded cursor-pointer overflow-hidden"
                                  style={{
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    appearance: 'none',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px'
                                  }}
                                  title="Seleccionar color de fondo"
                                />
                              </div>
                              <input
                                type="text"
                                value={simpleConfig[text.id]?.backgroundColor || text.currentStyle.backgroundColor}
                                onChange={(e) => handleColorChange(text.id, 'backgroundColor', e.target.value)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="transparent"
                              />
                              <button
                                type="button"
                                onClick={() => handleColorChange(text.id, 'backgroundColor', 'transparent')}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                title="Hacer transparente"
                              >
                                T
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleSaveSimpleConfig}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar configuración
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Editor completo (opcional) */}
            {editorConfig && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Edit3 className="h-4 w-4 mr-2" />
                  3. Editor avanzado (opcional)
                </h4>
                
                <details className="border rounded-lg">
                  <summary className="p-3 cursor-pointer text-sm text-gray-600 hover:bg-gray-50">
                    Mostrar editor avanzado para personalización completa
                  </summary>
                  
                  <div className="p-4 border-t bg-gray-50">
                    <div className="bg-white rounded-lg shadow-lg">
                      <BannerEditor 
                        initialConfig={editorConfig}
                        onSave={handleSaveBanner}
                        isFullscreen={false}
                      />
                    </div>
                  </div>
                </details>
                
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded">
                  <p className="text-sm">
                    <strong>Nota:</strong> Use el editor simple arriba para cambios rápidos de colores, 
                    o expanda el editor avanzado para personalización completa del banner.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BannerConfigStepV3;