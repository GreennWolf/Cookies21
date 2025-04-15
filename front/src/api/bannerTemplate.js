/* /src/api/bannerTemplate.js */

import apiClient from '../utils/apiClient';

/**
 * Transforms image URLs in banner configuration to include the API base URL
 * Handles various component structures and content formats
 * 
 * @param {Object} config - Banner configuration object
 * @param {string} apiBaseUrl - Base URL for the API (optional)
 * @returns {Object} - Configuration with transformed image URLs
 */
export const transformBannerImageUrls = (config, apiBaseUrl = import.meta.env.VITE_API_URL || '') => {
  if (!config) return null;
  
  // Prevent double slashes by removing trailing slash from apiBaseUrl
  if (apiBaseUrl.endsWith('/')) {
    apiBaseUrl = apiBaseUrl.slice(0, -1);
  }
  
  console.log(`🔄 Transforming image URLs with base: "${apiBaseUrl}"`);
  
  // Create a deep copy to avoid modifying the original
  const transformedConfig = JSON.parse(JSON.stringify(config));
  
  // Helper function to transform a URL if needed
  const transformUrl = (url) => {
    if (typeof url === 'string' && url.startsWith('/templates/')) {
      const transformed = `${apiBaseUrl}${url}`;
      console.log(`🖼️ Transformed: ${url} → ${transformed}`);
      return transformed;
    }
    return url;
  };
  
  // Recursive function to process components
  const processComponents = (components) => {
    if (!Array.isArray(components)) return [];
    
    return components.map(component => {
      // Skip if component doesn't exist
      if (!component) return component;
      
      console.log(`⚙️ Processing: ${component.id || 'unknown'} (${component.type || 'unknown'})`);
      
      // CASE 1: Image components need special handling
      if (component.type === 'image') {
        // Direct string content (most common for images)
        if (typeof component.content === 'string') {
          component.content = transformUrl(component.content);
        }
        // Object with multilingual texts
        else if (component.content && typeof component.content === 'object') {
          // Handle texts with language codes
          if (component.content.texts && typeof component.content.texts === 'object') {
            Object.keys(component.content.texts).forEach(lang => {
              if (typeof component.content.texts[lang] === 'string') {
                component.content.texts[lang] = transformUrl(component.content.texts[lang]);
              }
            });
          }
          
          // Handle legacy 'text' property for backward compatibility
          if ('text' in component.content && typeof component.content.text === 'string') {
            component.content.text = transformUrl(component.content.text);
          }
        }
        
        // Also check preview URLs in styles
        if (component.style) {
          ['desktop', 'tablet', 'mobile'].forEach(device => {
            if (component.style[device] && typeof component.style[device]._previewUrl === 'string') {
              component.style[device]._previewUrl = transformUrl(component.style[device]._previewUrl);
            }
          });
        }
      }
      
      // CASE 2: Other components might have image URLs in their content too
      else if (component.content && typeof component.content === 'object') {
        // Handle texts with language codes (might contain image paths)
        if (component.content.texts && typeof component.content.texts === 'object') {
          Object.keys(component.content.texts).forEach(lang => {
            if (typeof component.content.texts[lang] === 'string' && 
                component.content.texts[lang].startsWith('/templates/')) {
              component.content.texts[lang] = transformUrl(component.content.texts[lang]);
            }
          });
        }
        
        // Handle legacy 'text' property
        if ('text' in component.content && 
            typeof component.content.text === 'string' && 
            component.content.text.startsWith('/templates/')) {
          component.content.text = transformUrl(component.content.text);
        }
      }
      
      // Process children recursively if they exist
      if (component.children && Array.isArray(component.children)) {
        component.children = processComponents(component.children);
      }
      
      return component;
    });
  };
  
  // Process the banner components
  if (transformedConfig.components) {
    transformedConfig.components = processComponents(transformedConfig.components);
  }
  
  console.log('✅ Image URL transformation complete' , transformedConfig);
  return transformedConfig;
};

/**
 * Obtiene plantillas del sistema (públicas).
 */
export const getSystemTemplates = async (language = 'en') => {
  try {
    const response = await apiClient.get('/api/v1/banner-templates/system', {
      params: { language }
    });
    
    // Transformar URLs de imágenes en las plantillas
    if (response.data && response.data.data && Array.isArray(response.data.data.templates)) {
      response.data.data.templates = response.data.data.templates.map(template => 
        transformBannerImageUrls(template)
      );
    }
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching system templates');
  }
};

/**
 * Obtiene plantillas del cliente (custom + públicas).
 */
export const getClientTemplates = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/v1/banner-templates', { params });
    
    // Transformar URLs de imágenes en las plantillas
    if (response.data && response.data.data && Array.isArray(response.data.data.templates)) {
      response.data.data.templates = response.data.data.templates.map(template => 
        transformBannerImageUrls(template)
      );
    }
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching client templates');
  }
};

/**
 * Obtiene una plantilla específica por ID.
 */
export const getTemplate = async (templateId, language = 'en') => {
  try {
    const response = await apiClient.get(`/api/v1/banner-templates/${templateId}`, {
      params: { language }
    });
    
    // Transformar URLs de imágenes en la plantilla
    if (response.data && response.data.data && response.data.data.template) {
      response.data.data.template = transformBannerImageUrls(response.data.data.template);
    }
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching template');
  }
};

/**
 * Crea una nueva plantilla en el servidor.
 */
export const createTemplate = async (bannerConfig) => {
  try {
    // Determinar si es FormData o JSON de manera más robusta
    const isFormData = bannerConfig instanceof FormData;
    
    console.log(`📝 Tipo de datos para creación: ${isFormData ? 'FormData' : 'JSON'}`);
    
    // Si es FormData, mostrar su contenido para depuración
    if (isFormData) {
      try {
        console.log('🧪 FormData contiene:');
        for (let pair of bannerConfig.entries()) {
          console.log(`  - ${pair[0]}: ${pair[0] === 'template' ? '(JSON Data)' : 
                      (pair[1] instanceof File ? `Archivo: ${pair[1].name}` : pair[1])}`);
        }
      } catch (e) {
        console.error('Error al inspeccionar FormData:', e);
      }
    }
    
    let response;
    if (isFormData) {
      console.log('📦 Enviando como FormData con imágenes');
      response = await apiClient.post('/api/v1/banner-templates', bannerConfig, {
        headers: {
          // IMPORTANTE: NO establecer Content-Type para FormData
          // Axios lo detectará automáticamente con el boundary correcto
        }
      });
    } else {
      console.log('📄 Enviando como JSON');
      const payload = {
        ...bannerConfig,
        name: bannerConfig.name || 'Mi Banner por Defecto'
      };
      
      // Agregar log para verificar payload
      console.log(`📦 Payload JSON tamaño: ${JSON.stringify(payload).length} caracteres`);
      
      response = await apiClient.post('/api/v1/banner-templates', payload);
    }
    
    console.log('✅ Banner creado con éxito:', response.data);
    
    // Transformar URLs de imágenes en la respuesta
    if (response.data && response.data.data && response.data.data.template) {
      response.data.data.template = transformBannerImageUrls(response.data.data.template);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error completo:', error);
    
    const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'Error creating template';
                         
    const statusCode = error.response?.status;
    console.error(`Error (${statusCode}): ${errorMessage}`);
    
    if (error.response?.data?.errors) {
      console.error('Errores detallados:', error.response.data.errors);
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Clona una plantilla.
 */
export const cloneTemplate = async (templateId, cloneData) => {
  try {
    const response = await apiClient.post(`/api/v1/banner-templates/${templateId}/clone`, cloneData);
    
    // Transformar URLs de imágenes en la respuesta
    if (response.data && response.data.data && response.data.data.template) {
      response.data.data.template = transformBannerImageUrls(response.data.data.template);
    }
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error cloning template');
  }
};

/**
 * Actualiza una plantilla existente.
 */
export const updateTemplate = async (templateId, bannerConfig) => {
  try {
    console.log(`💾 Actualizando banner con ID: ${templateId}`);
    
    // Determinar si es FormData o JSON
    const isFormData = bannerConfig instanceof FormData;
    
    console.log(`📝 Tipo de datos para actualización: ${isFormData ? 'FormData' : 'JSON'}`);
    
    // Mostrar contenido del FormData si aplica
    if (isFormData) {
      console.log('🧪 FormData contiene:');
      for (let pair of bannerConfig.entries()) {
        const valueInfo = pair[1] instanceof File 
          ? `File: ${pair[1].name} (${pair[1].size} bytes)` 
          : (typeof pair[1] === 'string' && pair[1].length > 100) 
            ? `String (${pair[1].length} caracteres)` 
            : pair[1];
        console.log(`  - ${pair[0]}: ${valueInfo}`);
      }
    }
    
    let response;
    if (isFormData) {
      console.log('📦 Enviando como FormData con imágenes');
      
      response = await apiClient.patch(`/api/v1/banner-templates/${templateId}`, bannerConfig, {
        // No establecer Content-Type, axios lo hará automáticamente
        // No transformar los datos
        transformRequest: [function(data) {
          return data; // Enviar FormData sin transformación
        }]
      });
    } else {
      console.log('📄 Enviando como JSON');
      response = await apiClient.patch(`/api/v1/banner-templates/${templateId}`, bannerConfig);
    }
    
    console.log('✅ Banner actualizado con éxito:', response.data);
    
    // Transformar URLs de imágenes en la respuesta
    if (response.data && response.data.data && response.data.data.template) {
      response.data.data.template = transformBannerImageUrls(response.data.data.template);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error completo:', error);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Error updating template';
                        
    const statusCode = error.response?.status;
    console.error(`Error (${statusCode}): ${errorMessage}`);
    
    throw new Error(errorMessage);
  }
};

/**
 * Previsualiza la plantilla (sin guardarla).
 */
export const previewTemplate = async (bannerConfig, domainId = '') => {
  try {
    // El controller en server: previewTemplate => body: { config: payload }
    const response = await apiClient.post(
      '/api/v1/banner-templates/preview',
      { config: bannerConfig },
      { params: { domainId } }
    );
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error previewing template');
  }
};

/**
 * Archiva una plantilla.
 */
export const archiveTemplate = async (templateId) => {
  try {
    const response = await apiClient.patch(`/api/v1/banner-templates/${templateId}/archive`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error archiving template');
  }
};

/**
 * Exporta la configuración de una plantilla (json o html).
 */
export const exportTemplateConfig = async (templateId, format = 'json') => {
  try {
    const response = await apiClient.get(`/api/v1/banner-templates/${templateId}/export`, {
      params: { format }
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error exporting template configuration');
  }
};

/**
 * Obtiene historial de versiones.
 */
export const getTemplateVersions = async (templateId, params = { limit: 10 }) => {
  try {
    const response = await apiClient.get(`/api/v1/banner-templates/${templateId}/versions`, { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error fetching template versions');
  }
};

/**
 * Restaura una versión previa.
 */
export const restoreTemplateVersion = async (templateId, restoreData) => {
  try {
    const response = await apiClient.post(`/api/v1/banner-templates/${templateId}/restore`, restoreData);
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error restoring template version');
  }
};

/**
 * Prueba la plantilla (test) sin guardarla.
 */
export const testTemplate = async (templateId, bannerConfig) => {
  try {
    const response = await apiClient.post(`/api/v1/banner-templates/${templateId}/test`, {
      testConfig: bannerConfig
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error testing template');
  }
};

export const unarchiveTemplate = async (templateId) => {
  try {
    console.log(`🔄 Desarchivando banner ${templateId}...`);
    const response = await apiClient.patch(`/api/v1/banner-templates/${templateId}/unarchive`);
    console.log('✅ Banner desarchivado con éxito:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error al desarchivar el banner:', error);
    throw new Error(error.response?.data?.message || 'Error al desarchivar la plantilla');
  }
};

/**
 * Elimina (archiva) una plantilla.
 */
export const deleteTemplate = async (templateId) => {
  try {
    const response = await apiClient.delete(`/api/v1/banner-templates/${templateId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error deleting template');
  }
};

export const exportEmbeddableScript = async (templateId) => {
  try {
    console.log(`🔄 Exportando script embebible para banner ${templateId}...`);
    const response = await apiClient.get(`/api/v1/banner-templates/${templateId}/export-script`);
    console.log('✅ Script exportado con éxito');
    return response.data;
  } catch (error) {
    console.error('❌ Error al exportar script embebible:', error);
    throw new Error(error.response?.data?.message || 'Error al exportar script embebible');
  }
};