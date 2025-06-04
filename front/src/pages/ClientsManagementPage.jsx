import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getClients, 
  createClient, 
  updateClient, 
  toggleClientStatus,
  assignTemplateToDomain
} from '../api/client';
import { createDomain, setDomainDefaultTemplate } from '../api/domain';
import { createTemplate, getTemplate, cloneTemplate } from '../api/bannerTemplate';
import ClientList from '../components/client/ClientList';
import ClientDetailsModal from '../components/client/ClientDetailsModal';
import CreateClientModal from '../components/client/CreateClientModal';

const ClientsManagementPage = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  useEffect(() => {
    fetchClients();
  }, [statusFilter, planFilter]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.plan = planFilter;

      const response = await getClients(params);
      setClients(response.data.clients);
    } catch (error) {
      toast.error(error.message || 'Error al cargar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (client) => {
    setSelectedClient(client);
  };

  const handleCloseDetails = () => {
    setSelectedClient(null);
  };

  const handleShowCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleCreateClient = async (clientData) => {
    // Variables para tracking de recursos creados para rollback
    let createdClient = null;
    let createdDomains = [];
    let createdTemplate = null;
    
    console.log('🔍 ClientsManagementPage: Datos recibidos del modal:', {
      clientName: clientData.name,
      configureBanner: clientData.configureBanner,
      hasBannerConfig: !!clientData.bannerConfig,
      hasCustomizedTemplate: !!clientData.bannerConfig?.customizedTemplate,
      customizedTemplateKeys: clientData.bannerConfig?.customizedTemplate ? Object.keys(clientData.bannerConfig.customizedTemplate) : [],
      layoutBg: clientData.bannerConfig?.customizedTemplate?.layout?.desktop?.backgroundColor,
      componentCount: clientData.bannerConfig?.customizedTemplate?.components?.length,
      hasCustomizations: !!clientData.bannerConfig?.customizations,
      hasComponentUpdates: !!clientData.bannerConfig?.componentUpdates && Object.keys(clientData.bannerConfig.componentUpdates || {}).length > 0
    });
    
    try {
      // 1. Crear el cliente
      console.log("📝 Creando cliente...", clientData.name);
      console.log("📝 Configuración adicional:", {
        sendScriptByEmail: clientData.sendScriptByEmail,
        configureBanner: clientData.configureBanner
      });
      const response = await createClient(clientData);
      
      // El API devuelve el ID en 'id' en vez de '_id'
      createdClient = response.data.client;
      console.log("📋 Objeto cliente completo:", createdClient);
      
      // Verificar que el cliente tiene un ID válido (puede estar en 'id' o '_id')
      if (!createdClient || (!createdClient.id && !createdClient._id)) {
        console.error("⚠️ Cliente creado sin ID válido:", createdClient);
        throw new Error("El cliente se creó pero no se pudo obtener un ID válido");
      }
      
      // Asegurar que createdClient tenga _id para compatibilidad con el resto del código
      if (!createdClient._id && createdClient.id) {
        createdClient._id = createdClient.id;
      }
      
      // Mostrar el ID del cliente para depuración
      console.log(`📋 Cliente creado con ID: ${createdClient._id} (${typeof createdClient._id})`);
      
      toast.success(`Cliente ${createdClient.name} creado exitosamente`);
      
      // Crear la copia del banner primero si está configurado
      let templateId = null;
      if (clientData.configureBanner && clientData.bannerConfig) {
        try {
          console.log("📝 Creando copia del banner primero...");
          
          // Prepara los datos del banner
          let bannerData;
          
          // Verificar si tenemos el template personalizado del SimpleBannerConfigStep
          if (clientData.bannerConfig.customizedTemplate) {
            console.log("✅ Usando template personalizado del SimpleBannerConfigStep");
            
            // Usar directamente el template personalizado que ya tiene todos los cambios aplicados
            const templateCopy = JSON.parse(JSON.stringify(clientData.bannerConfig.customizedTemplate));
            
            // Procesar el ID del cliente para asegurar que sea una cadena válida
            const clientId = createdClient._id || createdClient.id || createdClient;
            const clientIdStr = typeof clientId === 'object' && clientId.toString ? 
                                clientId.toString() : String(clientId);
                                
            console.log(`📊 ID del cliente para el banner: ${clientIdStr} (${typeof clientIdStr})`);
            
            // IMPORTANTE: Detectar componentes con imágenes personalizadas
            let hasCustomImages = false;
            const checkForCustomImages = (components) => {
              if (!components) return;
              components.forEach(comp => {
                if (comp._hasCustomImage) {
                  hasCustomImages = true;
                  console.log(`🖼️ Componente ${comp.id} tiene imagen personalizada`);
                }
                if (comp.children) checkForCustomImages(comp.children);
              });
            };
            checkForCustomImages(templateCopy.components);
            
            // Prepara los datos del banner con todas las personalizaciones ya aplicadas
            bannerData = {
              ...templateCopy,
              name: clientData.bannerConfig.name || `${createdClient.name} - defecto`,
              clientId: clientIdStr, // Usar el ID como string
              type: 'custom', // Asegurar que es un banner personalizado
              _hasCustomImages: hasCustomImages
            };
            
            console.log(`📋 Datos de banner preparados con ${bannerData.components?.length || 0} componentes`);
            console.log(`🖼️ ¿Tiene imágenes personalizadas?: ${hasCustomImages}`);
            
          } else if (clientData.bannerConfig.editorConfig) {
            console.log("✅ Usando configuración completa del editor");
            
            // Usar directamente la configuración del editor que ya tiene todos los cambios aplicados
            const templateCopy = JSON.parse(JSON.stringify(clientData.bannerConfig.editorConfig));
            
            // Si usamos el nuevo formato con editorConfig, el banner ya está completamente personalizado
            // Procesar el ID del cliente para asegurar que sea una cadena válida
            const clientId = createdClient._id || createdClient.id || createdClient;
            const clientIdStr = typeof clientId === 'object' && clientId.toString ? 
                                clientId.toString() : String(clientId);
                                
            console.log(`📊 ID del cliente para el banner: ${clientIdStr} (${typeof clientIdStr})`);
            
            // Prepara los datos del banner con todas las personalizaciones ya aplicadas
            bannerData = {
              ...templateCopy,
              name: templateCopy.name || clientData.bannerConfig.name || `${createdClient.name} - defecto`,
              clientId: clientIdStr, // Usar el ID como string
              type: 'custom' // Asegurar que es un banner personalizado
            };
            
            console.log(`📋 Datos de banner preparados con ${bannerData.components?.length || 0} componentes`);
            
          } else if (clientData.bannerConfig.templateId) {
            // Formato antiguo: obtener template y aplicar personalizaciones
            console.log("⚠️ Usando formato antiguo de configuración de banner");
            
            try {
              console.log(`🔍 Obteniendo información del template original: ${clientData.bannerConfig.templateId}`);
              // Llamar a la API para obtener el template original
              const originalTemplateResponse = await getTemplate(clientData.bannerConfig.templateId);
              const originalTemplate = originalTemplateResponse.data.template;
              
              console.log(`✅ Template original obtenido con ${originalTemplate.components?.length || 0} componentes`);
              
              // Crear una copia profunda del template original
              const templateCopy = JSON.parse(JSON.stringify(originalTemplate));
              
              // Aplicar las modificaciones de color y posición de la configuración personalizada
              if (clientData.bannerConfig) {
                // Aplicar colores a los componentes
              if (templateCopy.components && Array.isArray(templateCopy.components)) {
                templateCopy.components = templateCopy.components.map(comp => {
                  // Aplicar colores de botones
                  if (comp.type === 'button') {
                    ['desktop', 'tablet', 'mobile'].forEach(device => {
                      if (comp.style && comp.style[device]) {
                        if (comp.action && comp.action.type === 'accept_all' && clientData.bannerConfig.acceptButtonColor) {
                          comp.style[device].backgroundColor = clientData.bannerConfig.acceptButtonColor;
                        } 
                        else if (comp.action && comp.action.type === 'reject_all' && clientData.bannerConfig.rejectButtonColor) {
                          comp.style[device].backgroundColor = clientData.bannerConfig.rejectButtonColor;
                        } 
                        else if (comp.action && comp.action.type === 'show_preferences' && clientData.bannerConfig.preferencesButtonColor) {
                          comp.style[device].backgroundColor = clientData.bannerConfig.preferencesButtonColor;
                        }
                      }
                    });
                  }
                  
                  // Aplicar color de texto
                  if (comp.type === 'text' && clientData.bannerConfig.textColor) {
                    ['desktop', 'tablet', 'mobile'].forEach(device => {
                      if (comp.style && comp.style[device]) {
                        comp.style[device].color = clientData.bannerConfig.textColor;
                      }
                    });
                  }
                  
                  // Aplicar configuraciones de imagen si existen
                  if (comp.type === 'image' && clientData.bannerConfig.imageSettings && 
                      clientData.bannerConfig.imageSettings[comp.id]) {
                    // Incluir configuración personalizada de la imagen
                    const imgSettings = clientData.bannerConfig.imageSettings[comp.id];
                    
                    console.log(`📸 Aplicando configuración personalizada para imagen ${comp.id}:`, imgSettings);
                    
                    // Aplicar posición si está definida
                    if (imgSettings.position) {
                      ['desktop', 'tablet', 'mobile'].forEach(device => {
                        if (comp.style && comp.style[device]) {
                          // Aplicar posición directamente al estilo para asegurar que se usa
                          // Si tenemos píxeles o porcentajes usar el formato adecuado
                          if (imgSettings.position.left !== undefined) {
                            // Determinar si es pixel o porcentaje para formato adecuado
                            const usePixels = imgSettings.position.mode === 'pixels';
                            comp.style[device].left = usePixels 
                              ? `${imgSettings.position.left}px` 
                              : `${imgSettings.position.left}%`;
                            console.log(`🔍 DEBUG - Componente ${comp.id}: Aplicando left en ${usePixels ? 'píxeles' : 'porcentaje'}: ${comp.style[device].left}`);
                          }
                          
                          if (imgSettings.position.top !== undefined) {
                            // Determinar si es pixel o porcentaje para formato adecuado
                            const usePixels = imgSettings.position.mode === 'pixels';
                            comp.style[device].top = usePixels 
                              ? `${imgSettings.position.top}px` 
                              : `${imgSettings.position.top}%`;
                            console.log(`🔍 DEBUG - Componente ${comp.id}: Aplicando top en ${usePixels ? 'píxeles' : 'porcentaje'}: ${comp.style[device].top}`);
                          }
                          
                          // Guardar _customPosition con modo explícito
                          comp.style[device]._customPosition = {
                            ...imgSettings.position,
                            // Asegurar que el modo esté explícitamente definido
                            mode: imgSettings.position.mode || 'pixels'
                          };
                          console.log(`🔍 DEBUG - Componente ${comp.id}: _customPosition configurado con modo: ${comp.style[device]._customPosition.mode}`);
                        }
                      });
                    }
                    
                    // Aplicar otros ajustes de imagen si existen
                    if (imgSettings.width || imgSettings.height || imgSettings.widthPx || imgSettings.heightPx || imgSettings.widthRaw || imgSettings.heightRaw) {
                      ['desktop', 'tablet', 'mobile'].forEach(device => {
                        if (comp.style && comp.style[device]) {
                          // Inicializar _customDimensions si no existe
                          if (!comp.style[device]._customDimensions) {
                            comp.style[device]._customDimensions = { mode: 'pixels' };
                          }

                          // Preferir dimensiones precisas en píxeles si están disponibles (widthRaw/heightRaw o widthPx/heightPx)
                          if (imgSettings.widthRaw !== undefined) {
                            const widthRaw = parseInt(imgSettings.widthRaw);
                            if (!isNaN(widthRaw) && widthRaw > 0) {
                              comp.style[device].width = `${widthRaw}px`;
                              comp.style[device]._customDimensions.width = widthRaw;
                              console.log(`🔍 DEBUG - Componente ${comp.id}: Aplicando widthRaw: ${widthRaw}px`);
                            }
                          } else if (imgSettings.widthPx !== undefined) {
                            const widthPx = parseInt(imgSettings.widthPx);
                            if (!isNaN(widthPx) && widthPx > 0) {
                              comp.style[device].width = `${widthPx}px`;
                              comp.style[device]._customDimensions.width = widthPx;
                              console.log(`🔍 DEBUG - Componente ${comp.id}: Aplicando widthPx: ${widthPx}px`);
                            }
                          } else if (imgSettings.width !== undefined) {
                            // Fallback a porcentajes, convertidos a píxeles
                            const baseWidth = parseInt(comp.style[device].width) || 100;
                            const newWidth = Math.round(baseWidth * (imgSettings.width / 100));
                            comp.style[device].width = `${newWidth}px`;
                            comp.style[device]._customDimensions.width = newWidth;
                            console.log(`🔍 DEBUG - Componente ${comp.id}: Aplicando width porcentual convertido: ${newWidth}px`);
                          }
                          
                          // Lo mismo para la altura
                          if (imgSettings.heightRaw !== undefined) {
                            const heightRaw = parseInt(imgSettings.heightRaw);
                            if (!isNaN(heightRaw) && heightRaw > 0) {
                              comp.style[device].height = `${heightRaw}px`;
                              comp.style[device]._customDimensions.height = heightRaw;
                              console.log(`🔍 DEBUG - Componente ${comp.id}: Aplicando heightRaw: ${heightRaw}px`);
                            }
                          } else if (imgSettings.heightPx !== undefined) {
                            const heightPx = parseInt(imgSettings.heightPx);
                            if (!isNaN(heightPx) && heightPx > 0) {
                              comp.style[device].height = `${heightPx}px`;
                              comp.style[device]._customDimensions.height = heightPx;
                              console.log(`🔍 DEBUG - Componente ${comp.id}: Aplicando heightPx: ${heightPx}px`);
                            }
                          } else if (imgSettings.height !== undefined) {
                            // Fallback a porcentajes, convertidos a píxeles
                            const baseHeight = parseInt(comp.style[device].height) || 100;
                            const newHeight = Math.round(baseHeight * (imgSettings.height / 100));
                            comp.style[device].height = `${newHeight}px`;
                            comp.style[device]._customDimensions.height = newHeight;
                            console.log(`🔍 DEBUG - Componente ${comp.id}: Aplicando height porcentual convertido: ${newHeight}px`);
                          }
                        }
                      });
                    }
                    
                    // Aplicar otros ajustes como objectFit y objectPosition
                    if (imgSettings.objectFit || imgSettings.objectPosition) {
                      ['desktop', 'tablet', 'mobile'].forEach(device => {
                        if (comp.style && comp.style[device]) {
                          if (imgSettings.objectFit) {
                            comp.style[device].objectFit = imgSettings.objectFit;
                          }
                          if (imgSettings.objectPosition) {
                            comp.style[device].objectPosition = imgSettings.objectPosition;
                          }
                        }
                      });
                    }
                  }
                  
                  return comp;
                });
              }
              
              // Aplicar configuración de tipo de banner y posición
              if (templateCopy.layout) {
                Object.keys(templateCopy.layout).forEach(device => {
                  // Aplicar tipo de banner
                  if (clientData.bannerConfig.bannerType) {
                    templateCopy.layout[device].type = clientData.bannerConfig.bannerType;
                  }
                  
                  // Aplicar posición según tipo
                  if (clientData.bannerConfig.position) {
                    if (clientData.bannerConfig.bannerType === 'floating') {
                      // Para banners flotantes, interpretar la posición
                      const floatingPosition = clientData.bannerConfig.position;
                      
                      // Reset posiciones previas
                      delete templateCopy.layout[device].top;
                      delete templateCopy.layout[device].bottom;
                      delete templateCopy.layout[device].left;
                      delete templateCopy.layout[device].right;
                      
                      if (floatingPosition.includes('bottom')) {
                        templateCopy.layout[device].bottom = '20px';
                      } else if (floatingPosition.includes('top')) {
                        templateCopy.layout[device].top = '20px';
                      }
                      
                      if (floatingPosition.includes('Right')) {
                        templateCopy.layout[device].right = '20px';
                      } else if (floatingPosition.includes('Left')) {
                        templateCopy.layout[device].left = '20px';
                      }
                    } else {
                      // Para otros tipos, usar posición directamente
                      templateCopy.layout[device].position = clientData.bannerConfig.position;
                    }
                  }
                  
                  // Aplicar color de fondo
                  if (clientData.bannerConfig.backgroundColor) {
                    templateCopy.layout[device].backgroundColor = clientData.bannerConfig.backgroundColor;
                  }
                });
              }
            }
            
            // Procesar el ID del cliente para asegurar que sea una cadena válida
            const clientId = createdClient._id || createdClient.id || createdClient;
            const clientIdStr = typeof clientId === 'object' && clientId.toString ? 
                                clientId.toString() : String(clientId);
                                
            console.log(`📊 ID del cliente para el banner: ${clientIdStr} (${typeof clientIdStr})`);
            
            // Prepara los datos del banner con todas las personalizaciones aplicadas
            bannerData = {
              ...clientData.bannerConfig,
              name: clientData.bannerConfig.name || `${createdClient.name} - defecto`,
              clientId: clientIdStr, // Usar el ID como string
              components: templateCopy.components || [], // Componentes con personalizaciones aplicadas
              layout: templateCopy.layout || {} // Layout con personalizaciones aplicadas
            };
            
            console.log(`📋 Datos de banner preparados con ${bannerData.components?.length || 0} componentes`);
          } catch (error) {
            console.error("❌ Error al obtener el template original:", error);
            toast.error("No se pudo obtener información del template original. Usando configuración básica.");
            
            // Procesar el ID del cliente para asegurar que sea una cadena válida
            const clientId = createdClient._id || createdClient.id || createdClient;
            const clientIdStr = typeof clientId === 'object' && clientId.toString ? 
                                clientId.toString() : String(clientId);
                                
            console.log(`📊 ID del cliente para el banner (caso error): ${clientIdStr} (${typeof clientIdStr})`);
            
            // En caso de error, continuar con los datos básicos
            bannerData = {
              ...clientData.bannerConfig,
              name: clientData.bannerConfig.name || `${createdClient.name} - defecto`,
              clientId: clientIdStr // Usar el ID como string
            };
          }
        } else {
          // No hay configuración válida de banner
          console.error("❌ No se encontró configuración válida de banner");
          throw new Error("Configuración de banner inválida");
        }
          
          // Debug: verificar qué imágenes llegaron
          console.log('🔍 DEBUG - clientData.bannerConfig.images:', clientData.bannerConfig.images);
          console.log('🔍 DEBUG - Claves de imágenes:', clientData.bannerConfig.images ? Object.keys(clientData.bannerConfig.images) : 'No hay imágenes');
          console.log('🎨 DEBUG - customizedTemplate:', clientData.bannerConfig.customizedTemplate);
          
          // Verificar si hay componentes con _hasCustomImage en el template
          let hasCustomImageComponents = false;
          const checkForCustomImageComponents = (components) => {
            if (!components) return;
            components.forEach(comp => {
              if (comp._hasCustomImage) {
                hasCustomImageComponents = true;
                console.log(`🖼️ Componente ${comp.id} marcado con _hasCustomImage`);
              }
              if (comp.children) checkForCustomImageComponents(comp.children);
            });
          };
          checkForCustomImageComponents(bannerData.components);
          
          // SIMPLIFICADO: Crear directamente el template con los datos ya modificados
          const hasImagesFromConfig = clientData.bannerConfig.images && Object.keys(clientData.bannerConfig.images).length > 0;
          const hasImagesFromWindow = window._imageFiles && Object.keys(window._imageFiles).length > 0;
          
          console.log('🔍 DEBUG - Detección de imágenes:', {
            hasImagesFromConfig,
            hasCustomImageComponents,
            hasImagesFromWindow,
            imageKeys: clientData.bannerConfig.images ? Object.keys(clientData.bannerConfig.images) : [],
            windowImageKeys: window._imageFiles ? Object.keys(window._imageFiles) : []
          });
          
          if (hasImagesFromConfig || hasCustomImageComponents || hasImagesFromWindow) {
            console.log('✅ Se detectaron imágenes personalizadas, creando template con imágenes');
            console.log('📊 Fuentes de imágenes:', {
              desdeImages: clientData.bannerConfig.images ? Object.keys(clientData.bannerConfig.images).length : 0,
              desdeComponentes: hasCustomImageComponents,
              desdeWindow: window._imageFiles ? Object.keys(window._imageFiles).length : 0
            });
            try {
              const formData = new FormData();
              
              // Modificar los componentes para incluir marcadores de las imágenes que deben ser reemplazadas
              let componentsWithImageMarkers = [...bannerData.components];
              
              // Función recursiva para procesar componentes incluyendo hijos
              const processComponentsForImages = (components) => {
                return components.map(comp => {
                  if (comp.type === 'image') {
                    const componentId = comp.id;
                  
                  // Verificar si tenemos una imagen nueva para este componente
                  // Verificar si tenemos una imagen nueva para este componente (incluyendo la imagen genérica como fallback)
                  let imageFile = null;
                  
                  // Primero, verificar si hay una imagen específica para este componente
                  if (clientData.bannerConfig.images && 
                      clientData.bannerConfig.imageSettings && 
                      clientData.bannerConfig.imageSettings[componentId] && 
                      clientData.bannerConfig.images[componentId] instanceof File) {
                    imageFile = clientData.bannerConfig.images[componentId];
                    console.log(`📷 Usando imagen específica para componente ${componentId}: ${imageFile.name}`);
                  }
                  // Si no hay imagen específica, verificar si hay una imagen genérica
                  else if (clientData.bannerConfig.images && 
                           clientData.bannerConfig.images.generic instanceof File) {
                    imageFile = clientData.bannerConfig.images.generic;
                    console.log(`📷 Usando imagen genérica para componente ${componentId}: ${imageFile.name}`);
                  }
                  // Verificar también en window._imageFiles (usado por SimpleBannerConfigStep)
                  else if (window._imageFiles && window._imageFiles[componentId] instanceof File) {
                    imageFile = window._imageFiles[componentId];
                    console.log(`📷 Usando imagen de window._imageFiles para componente ${componentId}: ${imageFile.name}`);
                  }
                                   
                  if (imageFile) {
                    // En lugar de solo marcar, establecer una referencia explícita que será reconocida por el backend
                    const imageRef = `__IMAGE_REF__${componentId}`;
                    
                    // Marcar este componente para reemplazo de imagen con una referencia clara
                    comp._pendingImageUpload = true;
                    comp._imageFileName = imageFile.name;
                    comp._imageComponentId = componentId;
                    
                    // Establecer el content como una referencia temporal que el backend puede reconocer
                    comp.content = imageRef;
                    
                    // Si hay configuraciones para esta imagen, aplicarlas también
                    if (clientData.bannerConfig.imageSettings[componentId]) {
                      // Guardar ajustes de imagen completos con todas las propiedades necesarias
                      const imgSettings = clientData.bannerConfig.imageSettings[componentId];
                      
                      // Realizar una copia profunda para evitar problemas de referencias
                      comp._imageSettings = JSON.parse(JSON.stringify(imgSettings));
                      
                      console.log(`🔍 DEBUG - Transferido _imageSettings al componente ${componentId}:`, comp._imageSettings);
                      
                      // Garantizar que todas las propiedades de dimensión se transfieren correctamente
                      // Si tenemos valores en píxeles, asegurarnos de que estén disponibles en todas las propiedades
                      if (imgSettings.widthPx) {
                        comp._imageSettings.widthRaw = imgSettings.widthPx;
                        console.log(`🔍 DEBUG - Transferido ancho en píxeles (widthPx→widthRaw): ${comp._imageSettings.widthRaw}px`);
                      } else if (imgSettings.widthRaw) {
                        comp._imageSettings.widthPx = imgSettings.widthRaw;
                        console.log(`🔍 DEBUG - Transferido ancho en píxeles (widthRaw→widthPx): ${comp._imageSettings.widthPx}px`);
                      }
                      
                      if (imgSettings.heightPx) {
                        comp._imageSettings.heightRaw = imgSettings.heightPx;
                        console.log(`🔍 DEBUG - Transferido alto en píxeles (heightPx→heightRaw): ${comp._imageSettings.heightRaw}px`);
                      } else if (imgSettings.heightRaw) {
                        comp._imageSettings.heightPx = imgSettings.heightRaw;
                        console.log(`🔍 DEBUG - Transferido alto en píxeles (heightRaw→heightPx): ${comp._imageSettings.heightPx}px`);
                      }
                      
                      // Si hay posición, asegurarse que se transfiere completa y con modo explícito
                      if (imgSettings.position) {
                        comp._imageSettings.position = {
                          ...imgSettings.position,
                          mode: imgSettings.position.mode || 'pixels' // Explícitamente indicar el modo (default: píxeles)
                        };
                        console.log(`🔍 DEBUG - Transferida posición con modo ${comp._imageSettings.position.mode}:`, comp._imageSettings.position);
                      } else {
                        // Si no hay posición, crear una predeterminada
                        comp._imageSettings.position = {
                          left: 0,
                          top: 0,
                          mode: 'pixels'
                        };
                        console.log(`🔍 DEBUG - Creada posición predeterminada para ${componentId}:`, comp._imageSettings.position);
                      }
                      
                      // Añadir dimensionsMode explícito
                      comp._imageSettings.dimensionsMode = 'pixels';
                      
                      // Asegurar que objectFit y objectPosition tienen valores predeterminados
                      if (!comp._imageSettings.objectFit) {
                        comp._imageSettings.objectFit = 'cover';
                      }
                      
                      if (!comp._imageSettings.objectPosition) {
                        comp._imageSettings.objectPosition = 'center';
                      }
                    }
                    
                    console.log(`🔄 Configurando componente ${componentId} para usar imagen: ${imageFile.name}`);
                    console.log(`🔄 Referencia de imagen asignada: ${imageRef}`);
                  }
                  }
                  
                  // Procesar hijos recursivamente si es un contenedor
                  if (comp.children && Array.isArray(comp.children)) {
                    comp.children = processComponentsForImages(comp.children);
                  }
                  
                  return comp;
                });
              };
              
              // Procesar componentes recursivamente
              componentsWithImageMarkers = processComponentsForImages(componentsWithImageMarkers);
              
              // Crear un mapa de qué componente va con cada imagen - con formato mejorado
              let imageComponentMapping = {};
              
              // Identificar componentes de imagen para cada archivo y extraer otros metadatos
              Object.entries(clientData.bannerConfig.images).forEach(([key, file]) => {
                if (file instanceof File) {
                  // Mapear imagen a componente para el servidor con formato consistente
                  if (key && key !== 'generic') {
                    // Usar el formato exacto que espera el backend: IMAGE_REF_{componentId}_filename
                    const imageRefKey = `IMAGE_REF_${key}_${file.name}`;
                    imageComponentMapping[imageRefKey] = key;
                  }
                }
              });
              
              // Incluir el mapeo de imágenes y los componentes modificados
              const templateDataWithImageInfo = {
                ...bannerData,
                components: componentsWithImageMarkers,
                _imageComponentMapping: imageComponentMapping,
                _hasCustomImages: true
              };
              
              // Añadir el template como JSON con toda la información necesaria
              formData.append('template', JSON.stringify(templateDataWithImageInfo));
              console.log('📤 Enviando plantilla con info de imágenes para', Object.keys(imageComponentMapping).length, 'componentes');
              
              // Añadir las imágenes (verificando que sean archivos válidos)
              let imageCount = 0;
              let invalidFiles = [];
              
              // Combinar imágenes de clientData.bannerConfig.images y window._imageFiles
              const allImages = { ...clientData.bannerConfig.images };
              if (window._imageFiles) {
                Object.entries(window._imageFiles).forEach(([componentId, file]) => {
                  if (!allImages[componentId] && file instanceof File) {
                    allImages[componentId] = file;
                    console.log(`📎 Agregando imagen de window._imageFiles: ${componentId}`);
                  }
                });
              }
              
              Object.entries(allImages).forEach(([key, file]) => {
                if (file instanceof File) {
                  // Validar extensiones permitidas para evitar errores de servidor
                  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
                  const fileName = file.name.toLowerCase();
                  const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
                  
                  if (validExtensions.includes(fileExtension)) {
                    // Añadir el archivo con un nombre que incluya el ID del componente de manera más explícita
                    // Formato más claro: "IMAGE_REF_{componentId}_{originalFileName}"
                    const uniqueFileName = `IMAGE_REF_${key}_${file.name}`;
                    formData.append('bannerImages', file, uniqueFileName);
                    
                    // También agregar metadatos sobre la imagen para el servidor
                    if (key && key !== 'generic' && clientData.bannerConfig.imageSettings && 
                        clientData.bannerConfig.imageSettings[key]) {
                      console.log(`📸 Añadiendo metadatos detallados para componente ${key}:`, 
                                  clientData.bannerConfig.imageSettings[key]);
                      
                      // Verificar si hay valores en píxeles y asegurarse de incluirlos
                      const settings = { ...clientData.bannerConfig.imageSettings[key] };
                      
                      // Transferir explícitamente los valores en píxeles si existen
                      if (settings.widthPx) {
                        settings.widthRaw = settings.widthPx;
                        console.log(`🔍 DEBUG - Metadatos: Usando widthRaw=${settings.widthRaw}px`);
                      }
                      
                      if (settings.heightPx) {
                        settings.heightRaw = settings.heightPx;
                        console.log(`🔍 DEBUG - Metadatos: Usando heightRaw=${settings.heightRaw}px`);
                      }
                      
                      // Asegurarse de que la posición tiene un modo explícito
                      if (settings.position) {
                        settings.position = {
                          ...settings.position,
                          mode: 'pixels' // Indicar explícitamente que usamos píxeles
                        };
                        console.log(`🔍 DEBUG - Metadatos: Posición con modo:`, settings.position);
                      }
                      
                      const imageMetadata = JSON.stringify({
                        componentId: key,
                        fileName: uniqueFileName,
                        originalName: file.name,
                        settings: settings, // Usar la versión actualizada de los ajustes
                        position: settings.position || { mode: 'pixels' },
                        // Incluir todas las dimensiones posibles para garantizar que al menos una llegue correctamente
                        width: settings.width,
                        height: settings.height,
                        widthPx: settings.widthPx,
                        heightPx: settings.heightPx,
                        widthRaw: settings.widthRaw || settings.widthPx, // Incluir explícitamente valores en raw
                        heightRaw: settings.heightRaw || settings.heightPx,
                        // Añadir un indicador explícito del modo de dimensiones
                        dimensionsMode: 'pixels',
                        // Preservar ajustes de visualización
                        objectFit: settings.objectFit || 'cover',
                        objectPosition: settings.objectPosition || 'center',
                        // Añadir metadatos específicos para debugging
                        _debug: {
                          timestamp: Date.now(),
                          session: `banner-clone-${Date.now()}`,
                          sourceComponentId: key,
                        }
                      });
                      
                      // Añadir metadatos de la imagen con nombre que permita relacionarlo al componente
                      formData.append(`image_metadata_${key}`, imageMetadata);
                    }
                    
                    imageCount++;
                  } else {
                    invalidFiles.push({name: file.name, extension: fileExtension});
                    console.warn(`⚠️ Archivo con extensión no permitida ignorado: ${file.name} (${fileExtension})`);
                  }
                }
              });
              
              // Advertir si algún archivo fue ignorado
              if (invalidFiles.length > 0) {
                const invalidList = invalidFiles.map(f => `${f.name} (${f.extension})`).join(', ');
                console.warn(`⚠️ Se ignoraron ${invalidFiles.length} archivos con extensiones no permitidas: ${invalidList}`);
                toast.warning(`Se ignoraron ${invalidFiles.length} archivos con formato no soportado. Sólo se permiten imágenes jpg, png, gif, webp y svg.`);
              }
              
              console.log(`📝 Creando banner con ${imageCount} imágenes válidas...`);
              console.log('🖼️ Componentes con marcadores de imagen:', componentsWithImageMarkers.filter(c => c.content && typeof c.content === 'string' && c.content.includes('__IMAGE_REF__')).length);
              
              // Si no hay imágenes válidas, saltar directo a la creación sin imágenes
              if (imageCount === 0) {
                throw new Error("No hay imágenes válidas para procesar");
              }
              
              // SIMPLIFICADO: Siempre crear un nuevo template con los datos modificados
              console.log(`🆕 Creando nuevo template con imágenes personalizadas`);
              
              // CRÍTICO: Aplicar marcadores de imagen a los componentes que YA tienen customizations
              const customizedComponents = clientData.bannerConfig.customizedTemplate.components || [];
              
              // Aplicar marcadores de imagen a los componentes customizados
              const componentsWithCustomizationsAndImageMarkers = customizedComponents.map(customizedComp => {
                // Buscar si este componente tiene marcador de imagen
                const markerComp = componentsWithImageMarkers.find(marker => marker.id === customizedComp.id);
                
                if (markerComp && customizedComp.type === 'image') {
                  // Preservar customizations pero aplicar marcador de imagen
                  return {
                    ...customizedComp, // Mantener customizations (posición, estilo, etc.)
                    content: markerComp.content, // Aplicar marcador __IMAGE_REF__
                    _hasCustomImage: markerComp._hasCustomImage,
                    _customImageId: markerComp._customImageId,
                    _imageSettings: markerComp._imageSettings,
                    _pendingImageUpload: markerComp._pendingImageUpload
                  };
                }
                
                // Para componentes sin imagen, usar el customizado tal como está
                return customizedComp;
              });
              
              // Usar el customizedTemplate que ya tiene todos los cambios aplicados
              const templateData = {
                ...clientData.bannerConfig.customizedTemplate,
                name: bannerData.name,
                clientId: bannerData.clientId, // Importante: incluir el clientId
                components: componentsWithCustomizationsAndImageMarkers, // Componentes CON customizations Y marcadores
                type: 'custom',
                status: 'active'
              };
              
              // Agregar los datos del template al FormData
              // NOTA: templateData ya contiene layout y components con todas las customizations aplicadas
              console.log('📋 DEBUG - Agregando datos al FormData:', {
                name: templateData.name,
                clientId: templateData.clientId,
                type: templateData.type,
                hasLayout: !!templateData.layout,
                hasComponents: !!templateData.components,
                componentsCount: templateData.components?.length
              });
              
              formData.append('name', templateData.name);
              formData.append('clientId', templateData.clientId);
              formData.append('type', templateData.type);
              formData.append('status', templateData.status);
              formData.append('layout', JSON.stringify(templateData.layout));
              formData.append('components', JSON.stringify(templateData.components));
              formData.append('settings', JSON.stringify(templateData.settings || {}));
              
              // Agregar metadatos necesarios de la plantilla original
              if (templateData.theme) {
                formData.append('theme', JSON.stringify(templateData.theme));
              }
              if (templateData.metadata) {
                formData.append('metadata', JSON.stringify(templateData.metadata));
              }
              
              console.log('📤 Enviando template con customizations YA aplicadas en layout y components');
              
              // DEBUG: Verificar que las customizations estén aplicadas antes de enviar
              console.log('🔍 DEBUG - Verificando customizations aplicadas (con imágenes):', {
                layoutBackgroundColor: templateData.layout?.desktop?.backgroundColor,
                acceptButtonStyle: templateData.components?.find(c => c.id === 'acceptAll')?.style?.desktop,
                rejectButtonStyle: templateData.components?.find(c => c.id === 'rejectAll')?.style?.desktop,
                preferencesButtonStyle: templateData.components?.find(c => c.id === 'preferencesBtn')?.style?.desktop,
                acceptButtonPosition: templateData.components?.find(c => c.id === 'acceptAll')?.position?.desktop,
                rejectButtonPosition: templateData.components?.find(c => c.id === 'rejectAll')?.position?.desktop,
                preferencesButtonPosition: templateData.components?.find(c => c.id === 'preferencesBtn')?.position?.desktop,
                imageComponent: {
                  id: templateData.components?.find(c => c.type === 'image')?.id,
                  content: templateData.components?.find(c => c.type === 'image')?.content,
                  position: templateData.components?.find(c => c.type === 'image')?.position?.desktop,
                  style: templateData.components?.find(c => c.type === 'image')?.style?.desktop
                }
              });
              
              // Crear el template
              const bannerResponse = await createTemplate(formData);
              
              // Si se ha creado correctamente, guardar el ID
              if (bannerResponse.data && bannerResponse.data.template && bannerResponse.data.template._id) {
                templateId = bannerResponse.data.template._id;
                createdTemplate = bannerResponse.data.template;
                console.log(`✅ Banner creado exitosamente con ID: ${templateId}`);
                toast.success("Banner creado exitosamente con imágenes");
              } else {
                throw new Error("Respuesta de creación de banner incompleta");
              }
            } catch (err) {
              console.error("⚠️ Error al crear banner con imágenes:", err);
              toast.error("Error al procesar imágenes del banner. Intentando crear banner sin imágenes...");
              
              // Si falla la creación con imágenes, intentar sin imágenes como fallback
              try {
                console.log(`🔄 Intentando crear template sin imágenes (fallback)`);
                
                // Usar el customizedTemplate que ya tiene todos los cambios aplicados
                const templateData = {
                  ...clientData.bannerConfig.customizedTemplate,
                  name: bannerData.name,
                  clientId: bannerData.clientId, // Importante: incluir el clientId
                  type: 'custom',
                  status: 'active'
                };
                
                console.log('📤 Enviando templateData (fallback) con customizations YA aplicadas en layout y components');
                
                const fallbackResponse = await createTemplate(templateData);
                if (fallbackResponse.data && fallbackResponse.data.template && fallbackResponse.data.template._id) {
                  templateId = fallbackResponse.data.template._id;
                  createdTemplate = fallbackResponse.data.template;
                  console.log(`✅ Banner creado sin imágenes como fallback, ID: ${templateId}`);
                  toast.warning("Banner creado sin imágenes (las imágenes fallaron al procesarse)");
                }
              } catch (fallbackErr) {
                console.error("❌ Error incluso al crear banner sin imágenes:", fallbackErr);
                toast.error("No se pudo crear el banner. Por favor, intente de nuevo más tarde.");
              }
            }
          } else {
            // NO hay archivos File nuevos, pero puede que tenga customizations
            console.log('📝 No hay archivos nuevos, pero hay customizations - Creando banner con imagen existente');
            console.log('❓ Estado de imágenes:', {
              images: clientData.bannerConfig.images,
              hasImages: clientData.bannerConfig.images ? Object.keys(clientData.bannerConfig.images).length : 0,
              customizations: !!clientData.bannerConfig.customizations
            });
            
            try {
              // USAR EL MISMO FLUJO QUE CUANDO HAY IMÁGENES pero sin archivos File
              console.log("🆕 Creando banner con customizations aplicadas (sin archivos nuevos)");
              
              // Usar el customizedTemplate que ya tiene todos los cambios aplicados
              const templateData = {
                ...clientData.bannerConfig.customizedTemplate,
                name: bannerData.name,
                clientId: bannerData.clientId,
                type: 'custom',
                status: 'active'
              };
              
              console.log('📤 Enviando templateData con customizations aplicadas');
              
              // DEBUG: Verificar que las customizations estén aplicadas
              console.log('🔍 DEBUG - Verificando customizations aplicadas (sin archivos nuevos):', {
                layoutBackgroundColor: templateData.layout?.desktop?.backgroundColor,
                acceptButtonStyle: templateData.components?.find(c => c.id === 'acceptAll')?.style?.desktop,
                rejectButtonStyle: templateData.components?.find(c => c.id === 'rejectAll')?.style?.desktop,
                preferencesButtonStyle: templateData.components?.find(c => c.id === 'preferencesBtn')?.style?.desktop,
                acceptButtonPosition: templateData.components?.find(c => c.id === 'acceptAll')?.position?.desktop,
                rejectButtonPosition: templateData.components?.find(c => c.id === 'rejectAll')?.position?.desktop,
                preferencesButtonPosition: templateData.components?.find(c => c.id === 'preferencesBtn')?.position?.desktop,
                imageComponent: {
                  id: templateData.components?.find(c => c.type === 'image')?.id,
                  content: templateData.components?.find(c => c.type === 'image')?.content,
                  position: templateData.components?.find(c => c.type === 'image')?.position?.desktop,
                  style: templateData.components?.find(c => c.type === 'image')?.style?.desktop
                }
              });
              
              const bannerResponse = await createTemplate(templateData);
              
              // Si se ha creado correctamente, guardar el ID
              if (bannerResponse.data && bannerResponse.data.template && bannerResponse.data.template._id) {
                templateId = bannerResponse.data.template._id;
                createdTemplate = bannerResponse.data.template;
                console.log(`✅ Banner creado exitosamente, ID: ${templateId}`);
                toast.success("Banner creado exitosamente");
              } else {
                throw new Error("Respuesta de creación de banner incompleta");
              }
            } catch (err) {
              console.error("❌ Error al crear banner sin imágenes:", err);
              toast.error("No se pudo crear el banner: " + (err.message || "Error desconocido"));
            }
          }
        } catch (error) {
          console.error("❌ Error general al crear banner:", error);
          toast.error("No se pudo crear el banner personalizado: " + (error.message || 'Error desconocido'));
        }
      }
      
      // 2. Si el cliente tiene dominios, crearlos en la tabla de dominios
      if (clientData.domains && clientData.domains.length > 0) {
        // Filtrar dominios vacíos y emails
        const validDomains = clientData.domains.filter(domain => {
          const trimmed = domain.trim();
          // Excluir vacíos y emails
          return trimmed !== '' && !trimmed.includes('@');
        });
        
        if (validDomains.length !== clientData.domains.length) {
          console.log(`⚠️ Se filtraron ${clientData.domains.length - validDomains.length} entradas inválidas (emails o vacíos)`);
        }
        
        // Dominios creados para referencia posterior
        // const createdDomains = []; // Comentado para usar la variable del scope superior
        
        if (validDomains.length > 0) {
          console.log(`📝 Creando ${validDomains.length} dominios y asignando banner...`);
          // Crear cada dominio asociado al cliente
          const domainCreationPromises = validDomains.map(async (domainName) => {
            try {
              // Asegurar que el cliente tenga _id (puede estar en 'id' o en '_id')
              if (!createdClient._id && createdClient.id) {
                createdClient._id = createdClient.id;
              }
              
              // Verificar que el ID del cliente sea un string válido
              // NOTA: A veces _id ya es un string y a veces es un ObjectId
              const clientId = createdClient._id.toString ? createdClient._id.toString() : createdClient._id;
              
              // Mostrar información completa del cliente para depuración
              console.log(`📋 Cliente completo:`, JSON.stringify(createdClient, null, 2));
              console.log(`📋 ID del cliente (final): ${clientId}, tipo: ${typeof clientId}`);
              
              // Configuración simplificada para nuevos dominios, sin ajustes de color
              const domainData = {
                domain: domainName,
                clientId: clientId, // Usar el string del ID
                status: 'active',
                settings: {
                  scanning: {
                    autoDetect: true,
                    interval: 24,
                  },
                },
              };
              
              console.log(`🔑 Usando clientId: ${clientId} (${typeof clientId}) para el dominio ${domainName}`);
              
              // Si tenemos un templateId, lo asignamos directamente al dominio
              if (templateId) {
                domainData.settings.defaultTemplateId = templateId;
              }
              
              console.log(`📝 Creando dominio: ${domainName}`, JSON.stringify(domainData));
              
              try {
                const domainResponse = await createDomain(domainData);
                console.log(`✅ Dominio creado exitosamente:`, domainResponse);
                
                // Track domain for rollback
                createdDomains.push(domainResponse.data.domain);
                
                return { success: true, domain: domainName, domainData: domainResponse.data.domain };
              } catch (error) {
                console.error(`❌ Error detallado al crear dominio ${domainName}:`, error);
                console.error(`❌ Status: ${error.response?.status}, Data:`, error.response?.data);
                throw error;
              }
            } catch (err) {
              console.error(`❌ Error al crear dominio ${domainName}:`, err);
              return { success: false, domain: domainName, error: err.message };
            }
          });
          
          // Ejecutar todas las promesas
          const domainResults = await Promise.allSettled(domainCreationPromises);
          
          // Contar dominios creados exitosamente
          const successfulDomains = domainResults.filter(
            result => result.status === 'fulfilled' && result.value.success
          ).length;
          
          if (successfulDomains > 0) {
            toast.success(`Se han creado ${successfulDomains} dominio(s) para el cliente`);
            
            // Asignar template a dominios si se ha creado un template
            if (templateId && successfulDomains > 0) {
              console.log(`🔄 Asignando template ${templateId} a ${successfulDomains} dominios`);
              
              // Para cada dominio creado exitosamente, asignar el template
              const validDomains = domainResults
                .filter(result => result.status === 'fulfilled' && result.value.success)
                .map(result => result.value.domain);
              
              // Asignar el template a cada dominio
              const assignTemplatePromises = validDomains.map(async (domainName) => {
                try {
                  console.log(`🔄 Asignando template ${templateId} a dominio ${domainName}`);
                  const result = await assignTemplateToDomain(domainName, templateId);
                  console.log(`✅ Template asignado a dominio ${domainName}:`, result);
                  return { success: true, domain: domainName };
                } catch (err) {
                  console.error(`❌ Error al asignar template a dominio ${domainName}:`, err);
                  return { success: false, domain: domainName, error: err.message };
                }
              });
              
              // Ejecutar todas las promesas de asignación
              const assignResults = await Promise.allSettled(assignTemplatePromises);
              
              // Contar asignaciones exitosas
              const successfulAssigns = assignResults.filter(
                result => result.status === 'fulfilled' && result.value.success
              ).length;
              
              if (successfulAssigns > 0) {
                console.log(`✅ Template asignado exitosamente a ${successfulAssigns} dominio(s)`);
                toast.success(`Banner asignado a ${successfulAssigns} dominio(s)`);
              }
              
              // Mostrar errores de asignación si los hay
              const failedAssigns = assignResults
                .filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success))
                .map(result => 
                  result.status === 'rejected' 
                    ? { domain: 'Desconocido', error: result.reason } 
                    : { domain: result.value.domain, error: result.value.error }
                );
              
              if (failedAssigns.length > 0) {
                console.error('Asignaciones de template fallidas:', failedAssigns);
                toast.warning(`No se pudo asignar el banner a ${failedAssigns.length} dominio(s)`);
              }
            }
          }
          
          // Mostrar errores si los hay
          const failedDomains = domainResults
            .filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success))
            .map(result => 
              result.status === 'rejected' 
                ? { domain: 'Desconocido', error: result.reason } 
                : { domain: result.value.domain, error: result.value.error }
            );
          
          if (failedDomains.length > 0) {
            console.error('Dominios no creados:', failedDomains);
            toast.warning(`No se pudieron crear ${failedDomains.length} dominio(s)`);
          }
        }
      }
      
      fetchClients();
      return response;
    } catch (error) {
      console.error('❌ Error durante la creación del cliente:', error);
      
      // Implementar rollback: limpiar recursos creados
      let rollbackErrors = [];
      
      toast.error('Error al crear cliente. Iniciando limpieza automática...');
      
      try {
        // 1. Eliminar template creado si existe
        if (createdTemplate && createdTemplate._id) {
          try {
            console.log(`🧹 Eliminando template creado: ${createdTemplate._id}`);
            // Use direct API call since deleteTemplate might not exist
            const apiClient = (await import('../utils/apiClient')).default;
            await apiClient.delete(`/api/v1/banner-templates/${createdTemplate._id}`);
            console.log(`✅ Template ${createdTemplate._id} eliminado exitosamente`);
          } catch (templateError) {
            console.error('❌ Error al eliminar template:', templateError);
            rollbackErrors.push(`template ${createdTemplate._id}: ${templateError.message}`);
          }
        }
        
        // 2. Eliminar dominios creados si existen
        if (createdDomains.length > 0) {
          console.log(`🧹 Eliminando ${createdDomains.length} dominios creados`);
          const apiClient = (await import('../utils/apiClient')).default;
          
          for (const domain of createdDomains) {
            try {
              const domainId = domain._id || domain.id;
              if (domainId) {
                await apiClient.delete(`/api/v1/domains/${domainId}`);
                console.log(`✅ Dominio ${domain.domain} eliminado exitosamente`);
              }
            } catch (domainError) {
              console.error(`❌ Error al eliminar dominio ${domain.domain}:`, domainError);
              rollbackErrors.push(`dominio ${domain.domain}: ${domainError.message}`);
            }
          }
        }
        
        // 3. Eliminar cliente creado si existe
        if (createdClient && (createdClient._id || createdClient.id)) {
          try {
            const clientId = createdClient._id || createdClient.id;
            console.log(`🧹 Eliminando cliente creado: ${clientId}`);
            const apiClient = (await import('../utils/apiClient')).default;
            await apiClient.delete(`/api/v1/clients/${clientId}`);
            console.log(`✅ Cliente ${createdClient.name} eliminado exitosamente`);
          } catch (clientError) {
            console.error('❌ Error al eliminar cliente:', clientError);
            rollbackErrors.push(`cliente ${createdClient.name}: ${clientError.message}`);
          }
        }
        
        // Mostrar resultado del rollback
        if (rollbackErrors.length === 0) {
          toast.success('Limpieza automática completada exitosamente');
        } else {
          console.warn('⚠️ Algunos recursos no pudieron ser eliminados:', rollbackErrors);
          toast.warning(`Limpieza parcial completada. ${rollbackErrors.length} recursos requieren eliminación manual.`);
        }
        
      } catch (rollbackError) {
        console.error('❌ Error durante el rollback:', rollbackError);
        toast.error('Error durante la limpieza automática. Contacte al administrador.');
      }
      
      // Mostrar error original al usuario
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido al crear cliente';
      toast.error(`Error: ${errorMessage}`);
      throw error;
    }
  };

  const handleUpdateClient = async (clientId, updates) => {
    try {
      // Actualizar el cliente
      await updateClient(clientId, updates);
      toast.success('Cliente actualizado exitosamente');
      
      // Si hay dominios actualizados, gestionar la creación de nuevos dominios
      if (updates.domains && Array.isArray(updates.domains)) {
        // Obtener cliente actual para comparar dominios
        const currentClient = clients.find(client => client._id === clientId);
        
        if (currentClient) {
          // Determinar dominios nuevos que no estaban en el cliente original
          const currentDomains = currentClient.domains || [];
          const newDomains = updates.domains.filter(
            domain => domain.trim() !== '' && !currentDomains.includes(domain)
          );
          
          // Crear nuevos dominios si hay alguno
          if (newDomains.length > 0) {
            const domainCreationPromises = newDomains.map(async (domainName) => {
              try {
                // Asegurar que el ID del cliente sea un string válido
                // Verificar estructura del ID (puede estar en el objeto o directamente)
                let validClientId;
                
                if (typeof clientId === 'object' && clientId !== null) {
                  // Si es un objeto, intentar .toString() o .id/.toString()
                  if (clientId.toString) {
                    validClientId = clientId.toString();
                  } else if (clientId.id) {
                    validClientId = clientId.id.toString ? clientId.id.toString() : clientId.id;
                  } else if (clientId._id) {
                    validClientId = clientId._id.toString ? clientId._id.toString() : clientId._id;
                  } else {
                    validClientId = String(clientId);
                  }
                } else {
                  // Si es string u otro tipo
                  validClientId = String(clientId);
                }
                
                console.log(`🔑 ID del cliente para actualización de dominio: ${validClientId} (${typeof validClientId})`);
                
                // Configuración simplificada para nuevos dominios, sin ajustes de color
                const domainData = {
                  domain: domainName,
                  clientId: validClientId,
                  status: 'active',
                  settings: {
                    scanning: {
                      autoDetect: true,
                      interval: 24,
                    },
                  },
                };
                
                await createDomain(domainData);
                return { success: true, domain: domainName };
              } catch (err) {
                console.error(`Error al crear dominio ${domainName}:`, err);
                return { success: false, domain: domainName, error: err.message };
              }
            });
            
            // Ejecutar todas las promesas
            const domainResults = await Promise.allSettled(domainCreationPromises);
            
            // Contar dominios creados exitosamente
            const successfulDomains = domainResults.filter(
              result => result.status === 'fulfilled' && result.value.success
            ).length;
            
            if (successfulDomains > 0) {
              toast.success(`Se han creado ${successfulDomains} dominio(s) nuevos para el cliente`);
            }
            
            // Mostrar errores si los hay
            const failedDomains = domainResults
              .filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success))
              .map(result => 
                result.status === 'rejected' 
                  ? { domain: 'Desconocido', error: result.reason } 
                  : { domain: result.value.domain, error: result.value.error }
              );
            
            if (failedDomains.length > 0) {
              console.error('Dominios no creados:', failedDomains);
              toast.warning(`No se pudieron crear ${failedDomains.length} dominio(s) nuevos`);
            }
          }
        }
      }
      
      // Actualizar el cliente en la lista y en el estado de detalles
      const updatedClients = clients.map(client => 
        client._id === clientId ? { ...client, ...updates } : client
      );
      setClients(updatedClients);
      
      if (selectedClient && selectedClient._id === clientId) {
        setSelectedClient({ ...selectedClient, ...updates });
      }
    } catch (error) {
      toast.error(error.message || 'Error al actualizar cliente');
    }
  };

  const handleToggleStatus = async (clientId, newStatus) => {
    try {
      await toggleClientStatus(clientId, newStatus);
      toast.success(`Estado del cliente cambiado a ${newStatus === 'active' ? 'activo' : 'inactivo'}`);
      
      // Actualizar el cliente en la lista y en el estado de detalles
      const updatedClients = clients.map(client => 
        client._id === clientId ? { ...client, status: newStatus } : client
      );
      setClients(updatedClients);
      
      if (selectedClient && selectedClient._id === clientId) {
        setSelectedClient({ ...selectedClient, status: newStatus });
      }
    } catch (error) {
      toast.error(error.message || 'Error al cambiar el estado del cliente');
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClients();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#235C88]">Gestión de Clientes</h1>
        <button
          onClick={handleShowCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Crear Cliente
        </button>
      </div>

      <div className="mb-6 bg-white p-4 rounded shadow">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>
          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Todos los planes</option>
              <option value="basic">Básico</option>
              <option value="standard">Estándar</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Empresarial</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Buscar
            </button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ClientList
          clients={clients}
          onViewDetails={handleViewDetails}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={handleCloseDetails}
          onToggleStatus={handleToggleStatus}
          onUpdateClient={handleUpdateClient}
        />
      )}

      {showCreateModal && (
        <CreateClientModal
          onClose={handleCloseCreateModal}
          onClientCreated={handleCreateClient}
        />
      )}
    </div>
  );
};

export default ClientsManagementPage;