// src/utils/bannerValidator.js

/**
 * Utilidad para validar la estructura de datos de banner
 * y diagnosticar problemas de formato
 */
export class BannerValidator {
    /**
     * Valida la estructura de un banner en formato frontend
     * 
     * @param {Object} config - Configuración del banner en formato frontend
     * @returns {Object} - Resultado de la validación con errores y advertencias
     */
    static validateFrontendConfig(config) {
      if (!config) return { valid: false, errors: ['Configuración vacía'] };
      
      const results = {
        valid: true,
        errors: [],
        warnings: []
      };
      
      // Validar estructura básica
      if (!config.layout) {
        results.errors.push('Falta propiedad "layout"');
        results.valid = false;
      } else {
        // Validar layout para cada dispositivo
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          if (!config.layout[device]) {
            results.warnings.push(`Falta layout para dispositivo "${device}"`);
          }
        });
      }
      
      // Validar componentes
      if (!Array.isArray(config.components)) {
        results.errors.push('Propiedad "components" debe ser un array');
        results.valid = false;
      } else {
        // Validar cada componente
        config.components.forEach((comp, index) => {
          if (!comp.id) {
            results.errors.push(`Componente #${index} no tiene ID`);
            results.valid = false;
          }
          
          if (!comp.type) {
            results.errors.push(`Componente #${index} (${comp.id}) no tiene tipo`);
            results.valid = false;
          }
          
          // Validar estilos
          if (!comp.style) {
            results.warnings.push(`Componente #${index} (${comp.id}) no tiene estilos`);
          } else {
            // Validar estilos para cada dispositivo
            ['desktop', 'tablet', 'mobile'].forEach(device => {
              if (!comp.style[device]) {
                results.warnings.push(`Componente #${index} (${comp.id}) no tiene estilos para "${device}"`);
              }
            });
          }
          
          // Validar posiciones
          if (!comp.position) {
            results.warnings.push(`Componente #${index} (${comp.id}) no tiene posiciones`);
          } else {
            // Validar posiciones para cada dispositivo
            ['desktop', 'tablet', 'mobile'].forEach(device => {
              if (!comp.position[device]) {
                results.warnings.push(`Componente #${index} (${comp.id}) no tiene posición para "${device}"`);
              } else {
                // Verificar formato de posiciones
                const posTop = comp.position[device].top;
                const posLeft = comp.position[device].left;
                
                if (!posTop) {
                  results.warnings.push(`Componente #${index} (${comp.id}) no tiene posición "top" para "${device}"`);
                } else if (typeof posTop === 'string' && !posTop.endsWith('%')) {
                  results.warnings.push(`Componente #${index} (${comp.id}) tiene posición "top" que no es porcentaje: "${posTop}"`);
                }
                
                if (!posLeft) {
                  results.warnings.push(`Componente #${index} (${comp.id}) no tiene posición "left" para "${device}"`);
                } else if (typeof posLeft === 'string' && !posLeft.endsWith('%')) {
                  results.warnings.push(`Componente #${index} (${comp.id}) tiene posición "left" que no es porcentaje: "${posLeft}"`);
                }
              }
            });
          }
        });
      }
      
      return results;
    }
    
    /**
     * Valida la estructura de un banner en formato backend
     * 
     * @param {Object} config - Configuración del banner en formato backend
     * @returns {Object} - Resultado de la validación con errores y advertencias
     */
    static validateBackendConfig(config) {
      if (!config) return { valid: false, errors: ['Configuración vacía'] };
      
      const results = {
        valid: true,
        errors: [],
        warnings: []
      };
      
      // Validar estructura básica
      if (!config.layout) {
        results.errors.push('Falta propiedad "layout"');
        results.valid = false;
      } else {
        // Validar layout default
        if (!config.layout.default) {
          results.errors.push('Falta layout "default"');
          results.valid = false;
        }
        
        // Validar responsive layouts
        if (config.layout.responsive) {
          if (typeof config.layout.responsive !== 'object') {
            results.errors.push('Propiedad "layout.responsive" debe ser un objeto');
            results.valid = false;
          }
        }
      }
      
      // Validar componentes
      if (!Array.isArray(config.components)) {
        results.errors.push('Propiedad "components" debe ser un array');
        results.valid = false;
      } else {
        // Validar cada componente
        config.components.forEach((comp, index) => {
          if (!comp.id) {
            results.errors.push(`Componente #${index} no tiene ID`);
            results.valid = false;
          }
          
          if (!comp.type) {
            results.errors.push(`Componente #${index} (${comp.id}) no tiene tipo`);
            results.valid = false;
          }
          
          // Validar estilo base
          if (!comp.style || typeof comp.style !== 'object') {
            results.warnings.push(`Componente #${index} (${comp.id}) no tiene estilo base válido`);
          }
          
          // Validar posiciones en el estilo base
          if (comp.style && comp.style.position === 'absolute') {
            if (!comp.style.top && !comp.style.bottom) {
              results.warnings.push(`Componente #${index} (${comp.id}) es absolute pero no tiene posición vertical (top/bottom)`);
            }
            
            if (!comp.style.left && !comp.style.right) {
              results.warnings.push(`Componente #${index} (${comp.id}) es absolute pero no tiene posición horizontal (left/right)`);
            }
          }
          
          // Validar responsive
          if (comp.responsive) {
            if (typeof comp.responsive !== 'object') {
              results.errors.push(`Componente #${index} (${comp.id}) tiene "responsive" que no es un objeto`);
              results.valid = false;
            } else {
              // Validar responsive para tablet
              if (comp.responsive.tablet && (!comp.responsive.tablet.style || typeof comp.responsive.tablet.style !== 'object')) {
                results.warnings.push(`Componente #${index} (${comp.id}) tiene "responsive.tablet" sin propiedad "style" válida`);
              }
              
              // Validar responsive para mobile
              if (comp.responsive.mobile && (!comp.responsive.mobile.style || typeof comp.responsive.mobile.style !== 'object')) {
                results.warnings.push(`Componente #${index} (${comp.id}) tiene "responsive.mobile" sin propiedad "style" válida`);
              }
            }
          }
        });
      }
      
      return results;
    }
    
    /**
     * Identifica y diagnostica problemas comunes en la configuración del banner
     * 
     * @param {Object} config - Configuración del banner (frontend o backend)
     * @returns {Object} - Diagnóstico con posibles problemas y soluciones
     */
    static diagnoseIssues(config) {
      if (!config) return { issues: ['Configuración vacía'] };
      
      const issues = [];
      
      // Detectar formato
      const isBackendFormat = config.layout && config.layout.default;
      
      // Comprobar si hay propiedades mezcladas
      if (isBackendFormat) {
        // En formato backend
        
        // Buscar propiedades frontend en formato backend
        if (config.layout && (config.layout.desktop || config.layout.tablet || config.layout.mobile)) {
          issues.push('Formato mezclado: Configuración en formato backend pero contiene propiedades de layout en formato frontend (desktop/tablet/mobile)');
        }
        
        // Buscar componentes con estructura frontend en formato backend
        if (Array.isArray(config.components)) {
          config.components.forEach((comp, index) => {
            if (comp.style && (comp.style.desktop || comp.style.tablet || comp.style.mobile)) {
              issues.push(`Componente #${index} (${comp.id}): Formato mezclado: Estilo en formato frontend dentro de configuración backend`);
            }
            
            if (comp.position) {
              issues.push(`Componente #${index} (${comp.id}): Formato mezclado: Propiedad "position" de frontend en configuración backend`);
            }
          });
        }
      } else {
        // En formato frontend
        
        // Buscar propiedades backend en formato frontend
        if (config.layout && (config.layout.default || config.layout.responsive)) {
          issues.push('Formato mezclado: Configuración en formato frontend pero contiene propiedades de layout en formato backend (default/responsive)');
        }
        
        // Buscar componentes con estructura backend en formato frontend
        if (Array.isArray(config.components)) {
          config.components.forEach((comp, index) => {
            if (comp.responsive) {
              issues.push(`Componente #${index} (${comp.id}): Formato mezclado: Propiedad "responsive" de backend en configuración frontend`);
            }
            
            if (comp.style && comp.style.position === 'absolute' && (comp.style.top || comp.style.left)) {
              issues.push(`Componente #${index} (${comp.id}): Posiciones en estilo: Las posiciones deberían estar en propiedad "position" en formato frontend`);
            }
          });
        }
      }
      
      // Buscar problemas de posicionamiento
      if (Array.isArray(config.components)) {
        const componentsByDevice = { desktop: [], tablet: [], mobile: [] };
        
        // Recolectar componentes por dispositivo
        config.components.forEach(comp => {
          if (isBackendFormat) {
            // En formato backend
            if (comp.style && comp.style.position === 'absolute') {
              componentsByDevice.desktop.push({
                id: comp.id,
                top: comp.style.top,
                left: comp.style.left
              });
            }
            
            if (comp.responsive?.tablet?.style && comp.responsive.tablet.style.position === 'absolute') {
              componentsByDevice.tablet.push({
                id: comp.id,
                top: comp.responsive.tablet.style.top || comp.style?.top,
                left: comp.responsive.tablet.style.left || comp.style?.left
              });
            }
            
            if (comp.responsive?.mobile?.style && comp.responsive.mobile.style.position === 'absolute') {
              componentsByDevice.mobile.push({
                id: comp.id,
                top: comp.responsive.mobile.style.top || comp.style?.top,
                left: comp.responsive.mobile.style.left || comp.style?.left
              });
            }
          } else {
            // En formato frontend
            if (comp.position?.desktop) {
              componentsByDevice.desktop.push({
                id: comp.id,
                top: comp.position.desktop.top,
                left: comp.position.desktop.left
              });
            }
            
            if (comp.position?.tablet) {
              componentsByDevice.tablet.push({
                id: comp.id,
                top: comp.position.tablet.top,
                left: comp.position.tablet.left
              });
            }
            
            if (comp.position?.mobile) {
              componentsByDevice.mobile.push({
                id: comp.id,
                top: comp.position.mobile.top,
                left: comp.position.mobile.left
              });
            }
          }
        });
        
        // Comprobar superposiciones por dispositivo
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          const comps = componentsByDevice[device];
          
          // Si hay al menos 2 componentes
          if (comps.length >= 2) {
            for (let i = 0; i < comps.length; i++) {
              for (let j = i + 1; j < comps.length; j++) {
                const comp1 = comps[i];
                const comp2 = comps[j];
                
                // Si las posiciones son muy cercanas o iguales
                if (comp1.top === comp2.top && comp1.left === comp2.left) {
                  issues.push(`Posible superposición en "${device}": Componentes "${comp1.id}" y "${comp2.id}" tienen la misma posición (${comp1.top}, ${comp1.left})`);
                }
              }
            }
          }
        });
      }
      
      return { issues };
    }
    
    /**
     * Muestra un informe detallado de la configuración
     * 
     * @param {Object} config - Configuración del banner
     * @returns {string} - Informe en formato texto
     */
    static generateReport(config) {
      if (!config) return 'Sin configuración para analizar';
      
      // Detectar formato
      const isBackendFormat = config.layout && config.layout.default;
      const format = isBackendFormat ? 'backend' : 'frontend';
      
      // Validar según formato
      const validation = isBackendFormat
        ? this.validateBackendConfig(config)
        : this.validateFrontendConfig(config);
      
      // Diagnóstico
      const diagnosis = this.diagnoseIssues(config);
      
      // Construir informe
      let report = `=== INFORME DE BANNER (Formato: ${format}) ===\n\n`;
      
      // Información básica
      report += `Nombre: ${config.name || 'Sin nombre'}\n`;
      report += `Componentes: ${Array.isArray(config.components) ? config.components.length : 0}\n`;
      
      // Resultados de validación
      report += `\n=== VALIDACIÓN ===\n`;
      report += `Válido: ${validation.valid ? 'Sí' : 'No'}\n`;
      
      if (validation.errors.length > 0) {
        report += `\nErrores (${validation.errors.length}):\n`;
        validation.errors.forEach((error, i) => {
          report += `  ${i + 1}. ${error}\n`;
        });
      }
      
      if (validation.warnings.length > 0) {
        report += `\nAdvertencias (${validation.warnings.length}):\n`;
        validation.warnings.forEach((warning, i) => {
          report += `  ${i + 1}. ${warning}\n`;
        });
      }
      
      // Diagnóstico de problemas
      if (diagnosis.issues.length > 0) {
        report += `\n=== DIAGNÓSTICO ===\n`;
        report += `Problemas detectados (${diagnosis.issues.length}):\n`;
        diagnosis.issues.forEach((issue, i) => {
          report += `  ${i + 1}. ${issue}\n`;
        });
        
        // Sugerencias generales
        report += `\nSugerencias generales:\n`;
        report += `  - Utilizar BannerConfigHelper para mantener la consistencia de formatos\n`;
        report += `  - Asegurar que los componentes tienen estilos separados para cada dispositivo\n`;
        report += `  - Convertir todas las posiciones a porcentajes\n`;
        report += `  - Evitar mezclar propiedades de backend y frontend\n`;
      } else {
        report += `\n✅ No se han detectado problemas de formato\n`;
      }
      
      return report;
    }
}

export default BannerValidator;