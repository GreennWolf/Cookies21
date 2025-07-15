/**
 * Servicio para manejar variables dinámicas en templates
 * Reemplaza placeholders como {razonsocial} con valores reales del cliente
 */
class TemplateVariablesService {
  // Definir todas las variables disponibles (usando camelCase como estándar)
  static VARIABLES = {
    RAZON_SOCIAL: '{razonSocial}',
    NOMBRE_COMERCIAL: '{nombreComercial}',
    CIF: '{cif}',
    EMAIL: '{email}',
    TELEFONO: '{telefono}',
    DIRECCION: '{direccion}',
    // Se pueden agregar más variables en el futuro
  };

  /**
   * Reemplaza todas las variables en un texto con los valores del contexto
   * @param {string} content - Texto con variables
   * @param {Object} context - Objeto con valores para reemplazar
   * @returns {string} - Texto con variables reemplazadas
   */
  static replaceVariables(content, context) {
    if (!content || typeof content !== 'string') return content;
    
    // Debug: Check if content has variables
    const hasVariables = content.includes('{razonSocial}') || content.includes('{razonsocial}');
    if (hasVariables) {
      console.log('🔍 TemplateVariables: Processing content with variables:', {
        content: content.substring(0, 100) + '...',
        hasRazonSocial: content.includes('{razonSocial}'),
        hasRazonsocial: content.includes('{razonsocial}'),
        contextKeys: Object.keys(context),
        razonSocialValue: context.razonSocial
      });
    }
    
    let processedContent = content;
    
    // Reemplazar cada variable con su valor del contexto
    // Soportar tanto {razonsocial} como {razonSocial} para compatibilidad
    const variablePatterns = [
      { pattern: /\{razonSocial\}/g, key: 'razonSocial' },      // Estándar (camelCase)
      { pattern: /\{razonsocial\}/gi, key: 'razonSocial' },     // Compatibilidad (minúsculas)
      { pattern: /\{nombreComercial\}/g, key: 'nombreComercial' }, // Estándar
      { pattern: /\{nombrecomercial\}/gi, key: 'nombreComercial' }, // Compatibilidad
      { pattern: /\{cif\}/gi, key: 'cif' },
      { pattern: /\{email\}/gi, key: 'email' },
      { pattern: /\{telefono\}/gi, key: 'telefono' },
      { pattern: /\{direccion\}/gi, key: 'direccion' }
    ];
    
    variablePatterns.forEach(({ pattern, key }) => {
      const value = context[key] || '';
      if (value && processedContent.match(pattern)) {
        console.log(`🔄 Replacing ${pattern} with "${value}"`);
        processedContent = processedContent.replace(pattern, value);
      }
    });
    
    if (hasVariables) {
      console.log('✅ TemplateVariables: Content after processing:', {
        processed: processedContent.substring(0, 100) + '...',
        stillHasVariables: processedContent.includes('{razonSocial}') || processedContent.includes('{razonsocial}')
      });
    }
    
    return processedContent;
  }

  /**
   * Procesa componentes del banner recursivamente
   * @param {Array} components - Array de componentes del banner
   * @param {Object} context - Contexto con valores del cliente
   * @returns {Array} - Componentes procesados
   */
  static processBannerComponents(components, context) {
    if (!Array.isArray(components)) return components;
    
    console.log('🔍 TemplateVariables.processBannerComponents - ENTRADA:', {
      componentsLength: components.length,
      firstComponentKeys: Object.keys(components[0] || {}),
      firstComponentType: components[0]?.type,
      allComponentTypes: components.map(c => c?.type)
    });
    
    return components.map((comp, index) => {
      console.log(`🔧 Procesando componente ${index}:`, {
        type: comp.type,
        keys: Object.keys(comp),
        hasContent: !!comp.content,
        isMongooseDoc: !!(comp.toObject || comp._doc)
      });
      
      // SOLUCION: Convertir documentos de Mongoose a objetos planos
      let plainComp = comp;
      if (comp.toObject && typeof comp.toObject === 'function') {
        plainComp = comp.toObject();
        console.log(`🔄 Componente ${index} convertido de Mongoose a objeto plano:`, {
          originalType: comp.type,
          plainType: plainComp.type,
          success: plainComp.type === comp.type
        });
      } else if (comp._doc) {
        plainComp = { ...comp._doc };
        console.log(`🔄 Componente ${index} convertido desde _doc:`, {
          originalType: comp.type,
          plainType: plainComp.type,
          success: plainComp.type === comp.type
        });
      }
      
      const processed = { ...plainComp };
      
      console.log(`✅ Componente ${index} procesado:`, {
        originalType: comp.type,
        processedType: processed.type,
        keysPreserved: Object.keys(processed).length >= 3, // Al menos tipo, content, id
        success: processed.type === comp.type
      });
      
      // Procesar texto en componentes de tipo text
      if (plainComp.type === 'text' && plainComp.text) {
        processed.text = this.replaceVariables(plainComp.text, context);
      }
      
      // Procesar content si es string (para botones, textos, etc.)
      if (plainComp.content && typeof plainComp.content === 'string') {
        processed.content = this.replaceVariables(plainComp.content, context);
      }
      
      // Procesar content.texts para componentes multi-idioma
      if (plainComp.content?.texts && typeof plainComp.content.texts === 'object') {
        processed.content = {
          ...plainComp.content,
          texts: Object.entries(plainComp.content.texts).reduce((acc, [lang, text]) => {
            acc[lang] = this.replaceVariables(text, context);
            return acc;
          }, {})
        };
      }
      
      // Procesar content.text (estructura legacy)
      if (plainComp.content?.text && typeof plainComp.content.text === 'string') {
        processed.content = {
          ...plainComp.content,
          text: this.replaceVariables(plainComp.content.text, context)
        };
      }
      
      // Procesar título si existe
      if (plainComp.title) {
        processed.title = this.replaceVariables(plainComp.title, context);
      }
      
      // Procesar descripción si existe
      if (plainComp.description) {
        processed.description = this.replaceVariables(plainComp.description, context);
      }
      
      // Procesar label si existe (para botones)
      if (plainComp.label) {
        processed.label = this.replaceVariables(plainComp.label, context);
      }
      
      // Procesar hijos recursivamente
      if (plainComp.children && Array.isArray(plainComp.children)) {
        processed.children = this.processBannerComponents(plainComp.children, context);
      }
      
      return processed;
    });
  }

  /**
   * Crea el contexto de variables desde un cliente
   * @param {Object} client - Objeto cliente
   * @returns {Object} - Contexto con variables
   */
  static createContextFromClient(client) {
    if (!client) return {};
    
    // Debug: Log client data
    console.log('📊 TemplateVariables: Creating context from client:', {
      hasClient: !!client,
      clientName: client.name,
      businessName: client.businessName,
      razonSocial: client.razonSocial,
      fiscalInfo: client.fiscalInfo,
      fiscalInfoRazonSocial: client.fiscalInfo?.razonSocial
    });
    
    const context = {
      razonSocial: client.businessName || client.razonSocial || client.fiscalInfo?.razonSocial || client.name || '',
      nombreComercial: client.commercialName || client.nombreComercial || client.fiscalInfo?.nombreComercial || client.name || '',
      cif: client.cif || client.taxId || client.fiscalInfo?.cif || '',
      email: client.email || '',
      telefono: client.phone || client.telefono || client.fiscalInfo?.telefono || '',
      direccion: client.address || client.direccion || client.fiscalInfo?.direccion || '',
      // Se pueden agregar más mappings según sea necesario
    };
    
    console.log('✅ TemplateVariables: Context created:', context);
    
    return context;
  }

  /**
   * Procesa un template completo
   * @param {Object} template - Template del banner
   * @param {Object} client - Datos del cliente
   * @returns {Object} - Template procesado
   */
  static processTemplate(template, client) {
    if (!template) return template;
    
    const context = this.createContextFromClient(client);
    
    return {
      ...template,
      components: this.processBannerComponents(template.components || [], context)
    };
  }
}

module.exports = TemplateVariablesService;