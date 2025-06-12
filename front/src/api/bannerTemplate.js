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
    // No procesar si no es un string o es una URL completa
    if (typeof url !== 'string' || url.startsWith('http')) {
      return url;
    }
    
    // Transformar URL de imagen (soporta tanto formato /templates/ como /direct-image/)
    if (url.startsWith('/templates/') || url.startsWith('/direct-image/')) {
      const transformed = `${apiBaseUrl}${url}`;
      console.log(`🖼️ URL transformada: ${url} → ${transformed}`);
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
      
      // console.log(`⚙️ Processing: ${component.id || 'unknown'} (${component.type || 'unknown'})`);
      
      // CASE 1: Image components need special handling
      if (component.type === 'image') {
        // Log para debug de imágenes en contenedores
        if (component.parentId) {
          console.log(`🔍 Procesando imagen hijo ${component.id} con parentId ${component.parentId}:`, {
            contentBefore: component.content,
            hasPreviewUrl: !!component.style?.desktop?._previewUrl
          });
        }
        
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
      
      // Log final para imágenes en contenedores después de transformación
      if (component.type === 'image' && component.parentId) {
        console.log(`✅ Imagen hijo ${component.id} procesada:`, {
          contentAfter: component.content,
          hasValidUrl: typeof component.content === 'string' && component.content.startsWith('http')
        });
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
 * Para usuarios owner, puede filtrar por clientId para obtener plantillas específicas de un cliente.
 * 
 * @param {Object} params - Parámetros de consulta (status, search, clientId para owners).
 * @returns {Object} Plantillas del cliente.
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
 * 
 * @param {Object} bannerConfig - Configuración de la plantilla banner
 * @param {boolean} isSystemTemplate - Indica si es una plantilla del sistema (solo owners)
 * @returns {Object} La respuesta del servidor
 */
export const createTemplate = async (bannerConfig, isSystemTemplate = false) => {
  try {
    // Determinar si es FormData o JSON de manera más robusta
    const isFormData = bannerConfig instanceof FormData;
    
    let response;
    let endpoint = '/api/v1/banner-templates';
    
    if (isFormData) {
      // IMPORTANTE: NO extraer JSON para plantillas del sistema
      // El backend manejará el FormData correctamente
      console.log('📦 Enviando como FormData (con o sin imágenes)');
      
      // Si es plantilla del sistema, asegurar que el flag esté en el FormData
      if (isSystemTemplate && !bannerConfig.has('isSystemTemplate')) {
        bannerConfig.append('isSystemTemplate', 'true');
      }
      
      // También agregar el tipo si no existe
      if (isSystemTemplate && !bannerConfig.has('type')) {
        bannerConfig.append('type', 'system');
      }
      
      response = await apiClient.post(endpoint, bannerConfig, {
        headers: {
          // NO establecer Content-Type para FormData
        }
      });
    } else {
      // Para JSON simple
      console.log('📄 Enviando como JSON');
      const payload = {
        ...bannerConfig,
        name: bannerConfig.name || 'Mi Banner por Defecto',
        isSystemTemplate: isSystemTemplate,
        type: isSystemTemplate ? 'system' : (bannerConfig.type || 'custom')
      };
      
      response = await apiClient.post(endpoint, payload);
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
 * @param {string} templateId - ID de la plantilla a clonar
 * @param {Object|FormData} cloneData - Datos para la clonación (puede incluir imágenes)
 */
export const cloneTemplate = async (templateId, cloneData) => {
  try {
    console.log(`🔄 Clonando template ${templateId}`);
    
    // Detectar si es FormData (cuando hay imágenes)
    const isFormData = cloneData instanceof FormData;
    console.log(`📄 Tipo de datos: ${isFormData ? 'FormData con archivos' : 'JSON simple'}`);
    
    let response;
    
    if (isFormData) {
      // Si es FormData, enviar sin Content-Type para que axios lo configure automáticamente
      response = await apiClient.post(`/api/v1/banner-templates/${templateId}/clone`, cloneData, {
        headers: {
          // NO establecer Content-Type para FormData
        }
      });
    } else {
      // Para JSON normal
      response = await apiClient.post(`/api/v1/banner-templates/${templateId}/clone`, cloneData);
    }
    
    // Transformar URLs de imágenes en la respuesta
    if (response.data && response.data.data && response.data.data.template) {
      response.data.data.template = transformBannerImageUrls(response.data.data.template);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error clonando template:', error);
    throw new Error(error.response?.data?.message || 'Error cloning template');
  }
};

/**
 * Actualiza una plantilla existente.
 * @param {string} templateId - ID de la plantilla a actualizar
 * @param {Object|FormData} bannerConfig - Configuración de la plantilla
 * @param {boolean} isSystemTemplate - Indica si es una plantilla del sistema
 */
export const updateTemplate = async (templateId, bannerConfig, isSystemTemplate = false) => {
  try {
    // console.log(`💾 Actualizando banner con ID: ${templateId}`);
    
    // Determinar si es FormData o JSON
    const isFormData = bannerConfig instanceof FormData;
    
    // console.log(`📝 Tipo de datos para actualización: ${isFormData ? 'FormData' : 'JSON'}`);
    
    // Mostrar contenido del FormData si aplica
    if (isFormData) {
      // console.log('🧪 FormData contiene:');
      for (let pair of bannerConfig.entries()) {
        const valueInfo = pair[1] instanceof File 
          ? `File: ${pair[1].name} (${pair[1].size} bytes)` 
          : (typeof pair[1] === 'string' && pair[1].length > 100) 
            ? `String (${pair[1].length} caracteres)` 
            : pair[1];
        // console.log(`  - ${pair[0]}: ${valueInfo}`);
      }
    }
    
    // Siempre usar el endpoint normal (workaround)
    let endpoint = `/api/v1/banner-templates/${templateId}`;
    
    let response;
    if (isFormData) {
      // console.log('📦 Enviando como FormData con imágenes');
      
      response = await apiClient.patch(endpoint, bannerConfig, {
        // No establecer Content-Type, axios lo hará automáticamente
        // No transformar los datos
        transformRequest: [function(data) {
          return data; // Enviar FormData sin transformación
        }]
      });
    } else {
      // console.log('📄 Enviando como JSON');
      response = await apiClient.patch(endpoint, bannerConfig);
    }
    
    // console.log('✅ Banner actualizado con éxito:', response.data);
    
    // Transformar URLs de imágenes en la respuesta
    if (response.data && response.data.data && response.data.data.template) {
      response.data.data.template = transformBannerImageUrls(response.data.data.template);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error completo:', error);
    
    let errorMessage = 'Error updating template';
    
    if (error.response?.data?.message) {
      // Si hay un mensaje de error en la respuesta
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      // Si hay un objeto de error en la respuesta
      errorMessage = error.response.data.error;
    } else if (error.response?.data?.errors) {
      // Si hay errores de validación
      errorMessage = `Validation errors: ${JSON.stringify(error.response.data.errors)}`;
    } else if (error.message) {
      // Mensaje genérico del error
      errorMessage = error.message;
    }
    
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
    // console.log(`🔄 Desarchivando banner ${templateId}...`);
    const response = await apiClient.patch(`/api/v1/banner-templates/${templateId}/unarchive`);
    // console.log('✅ Banner desarchivado con éxito:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error al desarchivar el banner:', error);
    throw new Error(error.response?.data?.message || 'Error al desarchivar la plantilla');
  }
};

/**
 * Elimina permanentemente una plantilla de la base de datos.
 */
export const deleteTemplate = async (templateId) => {
  try {
    // Utilizamos el parámetro permanentDelete=true para forzar la eliminación permanente
    const response = await apiClient.delete(`/api/v1/banner-templates/${templateId}?permanentDelete=true`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error eliminando la plantilla permanentemente');
  }
};

export const exportEmbeddableScript = async (templateId) => {
  try {
    // console.log(`🔄 Exportando script embebible para banner ${templateId}...`);
    const response = await apiClient.get(`/api/v1/banner-templates/${templateId}/export-script`);
    // console.log('✅ Script exportado con éxito');
    return response.data;
  } catch (error) {
    console.error('❌ Error al exportar script embebible:', error);
    throw new Error(error.response?.data?.message || 'Error al exportar script embebible');
  }
};

// FUNCIÓN ELIMINADA: cleanupUnusedImages
// La limpieza de imágenes ahora solo se realiza automáticamente cuando se eliminan banners

/**
 * Detecta el idioma principal del contenido del banner
 * @param {string} templateId - ID de la plantilla de banner
 * @returns {Promise<Object>} - Información del idioma detectado
 */
export const detectBannerLanguages = async (templateId) => {
  try {
    console.log(`🌐 Detectando idiomas del banner ${templateId}...`);
    const response = await apiClient.post(`/api/v1/banner-templates/${templateId}/detect-languages`);
    console.log(`✅ Idioma detectado: ${response.data.data.detectedLanguage}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al detectar idiomas:', error);
    throw new Error(error.response?.data?.message || 'Error al detectar idiomas');
  }
};

/**
 * Traduce un banner a un idioma específico
 * @param {string} templateId - ID de la plantilla de banner
 * @param {string} targetLanguage - Código del idioma destino (es, fr, de, etc.)
 * @returns {Promise<Object>} - Resultado de la traducción
 */
export const translateBanner = async (templateId, targetLanguage) => {
  try {
    console.log(`🌐 Traduciendo banner ${templateId} a ${targetLanguage}...`);
    const response = await apiClient.post(`/api/v1/banner-templates/${templateId}/translate`, {
      targetLanguage
    });
    console.log(`✅ Traducción completada: ${response.data.data.componentsTranslated} componentes traducidos`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al traducir banner:', error);
    throw new Error(error.response?.data?.message || 'Error al traducir banner');
  }
};

/**
 * Obtiene todas las traducciones disponibles de un banner
 * @param {string} templateId - ID de la plantilla de banner
 * @returns {Promise<Object>} - Traducciones del banner
 */
export const getBannerTranslations = async (templateId) => {
  try {
    console.log(`🌐 Obteniendo traducciones del banner ${templateId}...`);
    const response = await apiClient.get(`/api/v1/banner-templates/${templateId}/translations`);
    console.log(`✅ Idiomas disponibles: ${response.data.data.languages.join(', ')}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al obtener traducciones:', error);
    throw new Error(error.response?.data?.message || 'Error al obtener traducciones');
  }
};

/**
 * Actualiza una traducción específica de un componente
 * @param {string} templateId - ID de la plantilla de banner
 * @param {string} language - Código del idioma
 * @param {string} componentId - ID del componente
 * @param {string} text - Nuevo texto traducido
 * @returns {Promise<Object>} - Resultado de la actualización
 */
export const updateComponentTranslation = async (templateId, language, componentId, text) => {
  try {
    console.log(`🌐 Actualizando traducción manual para componente ${componentId}...`);
    const response = await apiClient.put(`/api/v1/banner-templates/${templateId}/translations/${language}`, {
      componentId,
      text
    });
    console.log(`✅ Traducción actualizada`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al actualizar traducción:', error);
    throw new Error(error.response?.data?.message || 'Error al actualizar traducción');
  }
};

/**
 * Obtiene las estadísticas de uso de traducción
 * @returns {Promise<Object>} - Estadísticas de uso
 */
export const getTranslationUsage = async () => {
  try {
    console.log(`📊 Obteniendo estadísticas de traducción...`);
    const response = await apiClient.get('/api/v1/banner-templates/translation-usage');
    return response.data;
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    throw new Error(error.response?.data?.message || 'Error al obtener estadísticas de traducción');
  }
};

/**
 * Limpia imágenes de banners que han sido eliminados de la base de datos
 * Solo elimina directorios completos de banners que ya no existen en la BD
 * Requiere permisos de administrador (owner)
 * @returns {Promise<Object>} - Resultado de la limpieza
 */
export const cleanupDeletedBannersImages = async () => {
  try {
    console.log('🧹 Limpiando imágenes de banners eliminados...');
    const response = await apiClient.post('/api/v1/banner-templates/cleanup-deleted-banners');
    console.log(`✅ Limpieza de banners eliminados completada: ${response.data.data.deletedBanners} directorios eliminados, ${response.data.data.deletedFiles} archivos eliminados`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al limpiar imágenes de banners eliminados:', error);
    throw new Error(error.response?.data?.message || 'Error al limpiar imágenes de banners eliminados');
  }
};