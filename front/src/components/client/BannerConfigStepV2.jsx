import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import BannerEditor from '../banner/Editor/BannerEditor';
import { getClientTemplates } from '../../api/bannerTemplate';
import { CheckCircle } from 'lucide-react';

const BannerConfigStepV2 = ({ formData, onChange, selectedDomain }) => {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editorConfig, setEditorConfig] = useState(null);

  // Usar los valores de la configuración guardada en formData si existen
  useEffect(() => {
    if (formData.bannerConfig) {
      console.log("🧲 BannerConfigStepV2: Cargando configuración guardada desde formData:", formData.bannerConfig);
      
      // Si ya hay una configuración de editor completa, usarla
      if (formData.bannerConfig.editorConfig) {
        setEditorConfig(formData.bannerConfig.editorConfig);
        setIsConfiguring(true);
      }
    }
  }, [formData.bannerConfig]);

  // Efecto para cargar plantillas existentes
  useEffect(() => {
    if (isConfiguring && templates.length === 0) {
      fetchTemplates();
    }
  }, [isConfiguring]);

  // Cargar plantillas disponibles
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      // Traer todas las plantillas (sistema y custom)
      const response = await getClientTemplates({ status: 'active' });
      setTemplates(response.data.templates || []);
    } catch (error) {
      toast.error('Error al cargar plantillas de banner');
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cambio en el toggle de configuración
  const handleToggleConfig = async () => {
    console.log("🔄 BannerConfigStepV2: handleToggleConfig llamado, estado actual:", isConfiguring);
    
    const newValue = !isConfiguring;
    console.log("🔄 BannerConfigStepV2: Cambiando a:", newValue);
    
    if (newValue === true) {
      // Si ya tenemos plantillas cargadas, solo activar
      if (templates.length > 0) {
        setIsConfiguring(true);
        onChange('configureBanner', true);
        return;
      }
      
      // Si no hay plantillas, cargarlas primero
      setIsLoading(true);
      
      try {
        const response = await getClientTemplates({ status: 'active' });
        const availableTemplates = response.data.templates || [];
        
        console.log("🔄 BannerConfigStepV2: Plantillas cargadas:", availableTemplates.length);
        
        if (availableTemplates.length === 0) {
          toast.error('No hay plantillas disponibles. Debe crear al menos una plantilla en la sección de gestión de banners antes de continuar.');
          setIsLoading(false);
          return;
        }
        
        setTemplates(availableTemplates);
        setIsConfiguring(true);
        onChange('configureBanner', true);
        
      } catch (error) {
        console.error('Error al cargar plantillas:', error);
        toast.error('Error al verificar plantillas disponibles. Por favor, inténtelo de nuevo.');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(false);
      
    } else {
      console.log("🔄 BannerConfigStepV2: Desactivando configuración");
      setIsConfiguring(false);
      onChange('configureBanner', false);
      setEditorConfig(null);
      setSelectedTemplate(null);
    }
  };

  // Manejar selección de plantilla
  const handleTemplateSelect = (template) => {
    console.log("🔄 BannerConfigStepV2: Seleccionando plantilla", template._id);
    
    setSelectedTemplate(template);
    
    // Crear una copia profunda de la plantilla para el editor
    const templateCopy = JSON.parse(JSON.stringify(template));
    
    // Configurar el nombre por defecto
    templateCopy.name = `${formData.name} - Banner Personalizado`;
    
    setEditorConfig(templateCopy);
  };

  // Manejar guardado del banner desde el editor
  const handleSaveBanner = (bannerData) => {
    console.log("💾 BannerConfigStepV2: Guardando configuración del banner", bannerData);
    
    // Guardar la configuración completa del editor
    const bannerConfig = {
      templateId: selectedTemplate?._id,
      name: bannerData.name,
      editorConfig: bannerData, // Guardar toda la configuración del editor
      // Mantener compatibilidad con el formato anterior
      bannerType: bannerData.layout?.desktop?.type || 'modal',
      position: bannerData.layout?.desktop?.position || 'bottom',
      backgroundColor: bannerData.layout?.desktop?.backgroundColor || '#FFFFFF',
      // Los colores de botones y textos se manejan dentro de los componentes
    };
    
    // Actualizar formData principal
    onChange('bannerConfig', bannerConfig);
    
    toast.success('Configuración del banner guardada');
  };

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
                onChange={handleToggleConfig}
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
            
            {/* Si no hay un editor configurado, mostrar selección de plantilla */}
            {!editorConfig && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3">1. Seleccionar plantilla base</h4>
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
                          <div className="text-xs text-gray-500 mt-1">
                            {template.type === 'system' ? 'Plantilla del Sistema' : 'Plantilla Personalizada'}
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
                  <div className="bg-yellow-50 p-4 rounded text-yellow-700">
                    <p>No hay plantillas disponibles. Cree plantillas en la sección de gestión de banners.</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Editor de banner completo */}
            {editorConfig && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3">2. Personalizar banner</h4>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="bg-white rounded-lg shadow-lg">
                    <BannerEditor 
                      initialConfig={editorConfig}
                      onSave={handleSaveBanner}
                      isFullscreen={false}
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded">
                  <p className="text-sm">
                    <strong>Nota:</strong> Utiliza el editor para personalizar completamente el banner. 
                    Puedes agregar, eliminar y modificar todos los componentes, cambiar colores, 
                    ajustar posiciones y cargar imágenes personalizadas.
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

export default BannerConfigStepV2;