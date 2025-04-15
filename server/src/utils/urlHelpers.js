const { URL, URLSearchParams } = require('url');
const ipRangeCheck = require('ip-range-check');
const logger = require('./logger');

class URLHelpers {
  constructor() {
    // Constantes para validación
    this.MAX_URL_LENGTH = 2048;
    this.MAX_HOSTNAME_LENGTH = 255;
    this.MAX_PATH_LENGTH = 1024;

    // Lista de protocolos permitidos
    this.ALLOWED_PROTOCOLS = ['http:', 'https:'];

    // Patrones de expresiones regulares
    this.patterns = {
      domain: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      subdomain: /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
      ip: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      trackingParam: /^(?:utm_|fbclid|gclid|msclkid|_hs)/i
    };

    // Lista de TLDs comunes
    this.commonTLDs = new Set([
      'com', 'org', 'net', 'edu', 'gov', 'mil',
      'co.uk', 'co.jp', 'co.kr', 'com.br', 'com.au'
    ]);

    // Rangos de IPs privadas
    this.privateIPRanges = [
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      '127.0.0.0/8'
    ];
  }

  /**
   * Parsea una URL de manera segura
   * @param {string} url - URL a parsear
   * @returns {URL|null} - Objeto URL parseado o null si es inválida
   */
  parseUrl(url) {
    try {
      // Asegurar que la URL es string
      if (typeof url !== 'string') {
        return null;
      }

      // Intentar parsear la URL
      const parsedUrl = new URL(url);

      // Validar longitud
      if (url.length > this.MAX_URL_LENGTH) {
        return null;
      }

      // Validar protocolo
      if (!this.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
        return null;
      }

      return parsedUrl;
    } catch (error) {
      logger.debug('URL parsing failed:', { url, error: error.message });
      return null;
    }
  }

  /**
   * Normaliza una URL
   * @param {string} url - URL a normalizar
   * @returns {string} - URL normalizada
   */
  normalizeUrl(url) {
    try {
      const parsedUrl = this.parseUrl(url);
      if (!parsedUrl) {
        throw new Error('Invalid URL');
      }

      // Convertir a minúsculas para protocolo y host
      let normalizedUrl = parsedUrl.protocol + '//' + parsedUrl.host.toLowerCase();

      // Normalizar path (convertir a minúsculas y eliminar múltiples slashes)
      if (parsedUrl.pathname) {
        normalizedUrl += parsedUrl.pathname.replace(/\/+/g, '/').toLowerCase();
      }

      // Normalizar query params
      if (parsedUrl.search) {
        const params = new URLSearchParams(parsedUrl.search);
        // Ordenar y filtrar parámetros
        const cleanParams = this._cleanQueryParams(params);
        if (cleanParams.toString()) {
          normalizedUrl += '?' + cleanParams.toString();
        }
      }

      // Eliminar trailing slash
      return normalizedUrl.replace(/\/$/, '');
    } catch (error) {
      logger.error('URL normalization failed:', error);
      return url;
    }
  }

  /**
   * Extrae el dominio base de una URL
   * @param {string} url - URL de la que extraer el dominio
   * @returns {string|null} - Dominio base
   */
  extractBaseDomain(url) {
    try {
      const parsedUrl = this.parseUrl(url);
      if (!parsedUrl) {
        return null;
      }

      const hostnameParts = parsedUrl.hostname.split('.');
      
      // Manejar casos especiales (co.uk, com.br, etc.)
      if (hostnameParts.length > 2) {
        const lastTwo = hostnameParts.slice(-2).join('.');
        if (this.commonTLDs.has(lastTwo)) {
          return hostnameParts.slice(-3).join('.');
        }
      }

      return hostnameParts.slice(-2).join('.');
    } catch (error) {
      logger.error('Domain extraction failed:', error);
      return null;
    }
  }

  /**
   * Verifica si dos URLs son del mismo dominio
   * @param {string} url1 - Primera URL
   * @param {string} url2 - Segunda URL
   * @returns {boolean} - true si son del mismo dominio
   */
  isSameDomain(url1, url2) {
    try {
      const domain1 = this.extractBaseDomain(url1);
      const domain2 = this.extractBaseDomain(url2);
      return domain1 && domain2 && domain1 === domain2;
    } catch (error) {
      logger.error('Domain comparison failed:', error);
      return false;
    }
  }

  /**
   * Valida una URL
   * @param {string} url - URL a validar
   * @param {Object} options - Opciones de validación
   * @returns {Object} - Resultado de la validación
   */
  validateUrl(url, options = {}) {
    const result = {
      isValid: false,
      errors: []
    };

    try {
      const parsedUrl = this.parseUrl(url);
      if (!parsedUrl) {
        result.errors.push('Invalid URL format');
        return result;
      }

      // Validar protocolo si se especifica
      if (options.protocols && !options.protocols.includes(parsedUrl.protocol)) {
        result.errors.push('Invalid protocol');
      }

      // Si el hostname no es una IP, validar formato de dominio
      if (!this.patterns.ip.test(parsedUrl.hostname) && !this.patterns.domain.test(parsedUrl.hostname)) {
        result.errors.push('Invalid domain format');
      }

      // Validar longitudes
      if (parsedUrl.hostname.length > this.MAX_HOSTNAME_LENGTH) {
        result.errors.push('Hostname too long');
      }
      if (parsedUrl.pathname.length > this.MAX_PATH_LENGTH) {
        result.errors.push('Path too long');
      }

      // Validar IP
      if (this.patterns.ip.test(parsedUrl.hostname)) {
        if (options.allowIPs === false) {
          result.errors.push('IP addresses not allowed');
        } else if (this._isPrivateIP(parsedUrl.hostname)) {
          result.errors.push('Private IP addresses not allowed');
        }
      }

      result.isValid = result.errors.length === 0;
      return result;
    } catch (error) {
      logger.error('URL validation failed:', error);
      result.errors.push('Validation failed');
      return result;
    }
  }

  /**
   * Construye una URL absoluta
   * @param {string} base - URL base
   * @param {string} path - Path relativo
   * @returns {string|null} - URL absoluta
   */
  resolveUrl(base, path) {
    try {
      const baseUrl = this.parseUrl(base);
      if (!baseUrl) {
        logger.error('Invalid base URL');
        return null;
      }

      return new URL(path, baseUrl).toString();
    } catch (error) {
      logger.error('URL resolution failed:', error);
      return null;
    }
  }

  // Métodos privados

  /**
   * Limpia y ordena los parámetros de query
   * @private
   */
  _cleanQueryParams(params) {
    const cleanParams = new URLSearchParams();
    
    // Obtener y ordenar las claves
    const keys = Array.from(params.keys()).sort();
    
    for (const key of keys) {
      // Omitir parámetros de tracking conocidos
      if (!this.patterns.trackingParam.test(key)) {
        cleanParams.set(key, params.get(key));
      }
    }

    return cleanParams;
  }

  /**
   * Verifica si una IP es privada
   * @private
   */
  _isPrivateIP(ip) {
    return ipRangeCheck(ip, this.privateIPRanges);
  }

  /**
   * Verifica si un dominio es válido
   * @private
   */
  _isValidDomain(domain) {
    return this.patterns.domain.test(domain);
  }
}

module.exports = new URLHelpers();
