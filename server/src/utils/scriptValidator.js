// utils/scriptValidator.js
const esprima = require('esprima');
const logger = require('./logger');
const urlHelpers = require('./urlHelpers');

class ScriptValidator {
  constructor() {
    this.trustedDomains = new Set([
      'www.google-analytics.com',
      'ssl.google-analytics.com',
      'www.googletagmanager.com',
      'connect.facebook.net',
      'static.hotjar.com',
      'js.hs-scripts.com',
      'snap.licdn.com',
      'cdn.jsdelivr.net',
      'cdnjs.cloudflare.com'
    ]);

    this.dangerousPatterns = [
      {
        pattern: /eval\s*\(/,
        description: 'Use of eval() is dangerous'
      },
      {
        pattern: /document\.write/,
        description: 'document.write can overwrite entire document'
      },
      {
        pattern: /innerHTML\s*=/,
        description: 'Direct innerHTML assignment can lead to XSS'
      },
      {
        pattern: /new\s+Function\s*\(/,
        description: 'new Function() can execute arbitrary code'
      },
      {
        pattern: /<script/i,
        description: 'Inline script tags are not allowed'
      },
      {
        pattern: /javascript:/i,
        description: 'javascript: URLs are dangerous'
      }
    ];

    this.sensitiveAPIs = new Set([
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'navigator.sendBeacon',
      'navigator.geolocation',
      'navigator.mediaDevices',
      'document.cookie',
      'WebSocket',
      'Worker',
      'SharedWorker'
    ]);
  }

  validateScript(script) {
    try {
      const results = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {}
      };

      // Validar tipo si aplica
      if (script.type && !['text/javascript', 'module', 'external', 'inline'].includes(script.type)) {
        results.errors.push('Invalid script type');
      }

      // Validar URL si es externo
      if ((script.type === 'external' || script.src) && script.src) {
        const urlValidation = this._validateScriptUrl(script.src);
        results.metadata.domain = urlValidation.domain;
        if (!urlValidation.isValid) {
          results.errors.push(...urlValidation.errors);
        }
      }

      // Validar contenido si es inline
      if ((script.type === 'inline' || script.content) && script.content) {
        const contentValidation = this._validateScriptContent(script.content);
        if (!contentValidation.isValid) {
          results.errors.push(...contentValidation.errors);
        }
        results.warnings.push(...contentValidation.warnings);
        results.metadata = { ...results.metadata, ...contentValidation.metadata };
      }

      // Validar atributos
      const attributesValidation = this._validateScriptAttributes(script);
      if (!attributesValidation.isValid) {
        results.errors.push(...attributesValidation.errors);
      }
      if (attributesValidation.warnings) {
        results.warnings.push(...attributesValidation.warnings);
      }

      results.isValid = results.errors.length === 0;
      return results;
    } catch (error) {
      logger.error('Error validating script:', error);
      return {
        isValid: false,
        errors: ['Internal validation error'],
        warnings: [],
        metadata: {}
      };
    }
  }

  validateInlineScript(content) {
    return this._validateScriptContent(content);
  }

  isTrustedSource(url) {
    try {
      const domain = urlHelpers.parseUrl(url)?.hostname;
      return domain ? this.trustedDomains.has(domain) : false;
    } catch (error) {
      logger.error('Error checking trusted source:', error);
      return false;
    }
  }

  _validateScriptUrl(url) {
    const result = {
      isValid: true,
      errors: [],
      domain: null
    };
    try {
      const parsed = urlHelpers.parseUrl(url);
      if (!parsed) {
        result.isValid = false;
        result.errors.push('Invalid script URL');
        return result;
      }
      result.domain = parsed.hostname;
      // Requerir HTTPS si no es dominio confiable
      if (!this.isTrustedSource(url) && !parsed.protocol.startsWith('https')) {
        result.errors.push('Script URL must use HTTPS protocol');
      }
      return result;
    } catch (err) {
      logger.error('Error validating script URL:', err);
      result.isValid = false;
      result.errors.push('Error validating script URL');
      return result;
    }
  }

  _validateScriptContent(content) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        apis: new Set(),
        hasAsync: false,
        hasEvents: false
      }
    };
    try {
      // Sintaxis JS
      try {
        esprima.parseScript(content, { tolerant: true });
      } catch (error) {
        logger.error('Error parsing script:', error);
        result.isValid = false;
        result.errors.push('Invalid JS syntax');
        return result;
      }
      // Patrones peligrosos
      for (const { pattern, description } of this.dangerousPatterns) {
        if (pattern.test(content)) {
          result.isValid = false;
          result.errors.push(`Dangerous pattern detected: ${description}`);
        }
      }
      // APIs sensibles
      for (const api of this.sensitiveAPIs) {
        if (content.includes(api)) {
          result.metadata.apis.add(api);
          result.warnings.push(`Use of sensitive API: ${api}`);
        }
      }
      if (content.includes('async') || content.includes('await')) {
        result.metadata.hasAsync = true;
      }
      if (content.includes('addEventListener')) {
        result.metadata.hasEvents = true;
      }
      result.metadata.apis = Array.from(result.metadata.apis);
      return result;
    } catch (error) {
      logger.error('Error validating script content:', error);
      result.isValid = false;
      result.errors.push('Internal validation error');
      return result;
    }
  }

  _validateScriptAttributes(script) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };
    try {
      if (script.async && script.defer) {
        result.warnings.push('Both async and defer are present');
      }
      if (script.crossOrigin && !['anonymous', 'use-credentials'].includes(script.crossOrigin)) {
        result.errors.push('Invalid crossorigin attribute');
      }
      if (script.integrity && !/^(sha256|sha384|sha512)-[A-Za-z0-9+/=]+$/.test(script.integrity)) {
        result.errors.push('Invalid integrity hash');
      }
      result.isValid = result.errors.length === 0;
      return result;
    } catch (error) {
      logger.error('Error validating script attributes:', error);
      result.isValid = false;
      result.errors.push('Error validating script attributes');
      return result;
    }
  }
}

module.exports = new ScriptValidator();
