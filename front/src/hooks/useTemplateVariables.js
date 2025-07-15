import { useCallback, useMemo } from 'react';

/**
 * Hook para procesar variables de plantilla en el frontend
 * Reemplaza placeholders como {razonsocial} con los valores reales del cliente
 */
export const useTemplateVariables = (template, client) => {
  /**
   * Procesa el texto reemplazando variables
   */
  const processText = useCallback((text, context) => {
    if (!text || typeof text !== 'string') return text;
    
    // Debug: Check if text has variables
    const hasVariables = text.includes('{razonSocial}') || text.includes('{razonsocial}');
    if (hasVariables) {
      console.log('🔍 useTemplateVariables: Processing text with variables:', {
        text: text.substring(0, 100) + '...',
        hasRazonSocial: text.includes('{razonSocial}'),
        hasRazonsocial: text.includes('{razonsocial}'),
        contextKeys: Object.keys(context),
        razonSocialValue: context.razonSocial
      });
    }
    
    let processedText = text;
    
    // Reemplazar variables con diferentes formatos
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
      if (value && processedText.match(pattern)) {
        console.log(`🔄 useTemplateVariables: Replacing ${pattern} with "${value}"`);
        processedText = processedText.replace(pattern, value);
      }
    });
    
    if (hasVariables) {
      console.log('✅ useTemplateVariables: Text after processing:', {
        processed: processedText.substring(0, 100) + '...',
        stillHasVariables: processedText.includes('{razonSocial}') || processedText.includes('{razonsocial}')
      });
    }
    
    return processedText;
  }, []);

  /**
   * Procesa los componentes del banner recursivamente
   */
  const processComponents = useCallback((components, context) => {
    if (!Array.isArray(components)) return components;
    
    console.log(`🔄 useTemplateVariables: Processing ${components.length} components`);
    
    return components.map(comp => {
      const processed = { ...comp };
      
      // Log component being processed
      if (comp.content && (typeof comp.content === 'string' || comp.content.text || comp.content.texts)) {
        console.log(`📝 Processing component ${comp.id} (${comp.type}):`, {
          hasContent: !!comp.content,
          contentType: typeof comp.content,
          contentValue: typeof comp.content === 'string' ? comp.content.substring(0, 50) + '...' : comp.content
        });
      }
      
      // Procesar texto en componentes de tipo text
      if (comp.type === 'text' && comp.text) {
        processed.text = processText(comp.text, context);
      }
      
      // Procesar título si existe
      if (comp.title) {
        processed.title = processText(comp.title, context);
      }
      
      // Procesar descripción si existe
      if (comp.description) {
        processed.description = processText(comp.description, context);
      }
      
      // Procesar label si existe (para botones)
      if (comp.label) {
        processed.label = processText(comp.label, context);
      }
      
      // Procesar content si es string
      if (typeof comp.content === 'string') {
        processed.content = processText(comp.content, context);
      }
      
      // Procesar content.texts para componentes multi-idioma
      if (comp.content?.texts) {
        processed.content = {
          ...comp.content,
          texts: Object.entries(comp.content.texts).reduce((acc, [lang, text]) => {
            acc[lang] = processText(text, context);
            return acc;
          }, {})
        };
      }
      
      // Procesar content.text (estructura legacy)
      if (comp.content?.text && typeof comp.content.text === 'string') {
        processed.content = {
          ...comp.content,
          text: processText(comp.content.text, context)
        };
      }
      
      // Procesar hijos recursivamente
      if (comp.children && Array.isArray(comp.children)) {
        processed.children = processComponents(comp.children, context);
      }
      
      return processed;
    });
  }, [processText]);

  /**
   * Crear contexto de variables desde el cliente
   */
  const context = useMemo(() => {
    if (!client) return {};
    
    console.log('🔍 useTemplateVariables: Creating context from client:', {
      hasClient: !!client,
      clientName: client.name,
      fiscalInfo: client.fiscalInfo,
      businessName: client.businessName
    });
    
    const ctx = {
      razonSocial: client.fiscalInfo?.razonSocial || client.businessName || client.name || '',
      nombreComercial: client.fiscalInfo?.nombreComercial || client.commercialName || client.name || '',
      cif: client.fiscalInfo?.cif || client.taxId || '',
      email: client.email || '',
      telefono: client.fiscalInfo?.telefono || client.phone || '',
      direccion: client.fiscalInfo?.direccion || client.address || '',
      // Agregar más variables según sea necesario
    };
    
    console.log('✅ useTemplateVariables: Context created:', ctx);
    
    return ctx;
  }, [client]);

  /**
   * Procesar template completo
   */
  const processedTemplate = useMemo(() => {
    if (!template || !client) {
      console.log('⚠️ useTemplateVariables: No template or client, returning original template');
      return template;
    }
    
    console.log('🔄 useTemplateVariables: Processing template:', {
      templateId: template._id,
      templateName: template.name,
      componentCount: template.components?.length || 0,
      contextKeys: Object.keys(context),
      contextValues: context
    });
    
    const processed = {
      ...template,
      components: processComponents(template.components || [], context)
    };
    
    // Verificar si se procesaron las variables
    const hasVariablesAfter = JSON.stringify(processed).includes('{razonSocial}') || 
                             JSON.stringify(processed).includes('{razonsocial}');
    console.log('✅ useTemplateVariables: Template processed, still has variables:', hasVariablesAfter);
    
    return processed;
  }, [template, client, context, processComponents]);

  return processedTemplate;
};

export default useTemplateVariables;