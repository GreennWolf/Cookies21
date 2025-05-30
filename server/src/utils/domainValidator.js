// DomainValidator.js
const dns = require('dns').promises;
const logger = require('./logger');

class DomainValidator {
  constructor() {
    // Patrones de dominio válidos
    this.patterns = {
      domain: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      subdomain: /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
      ip: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    };

    // Dominios restringidos
    this.restrictedDomains = new Set([
      'localhost',
      'test.com',
      'invalid',
      'local'
    ]);

    // TLDs bloqueados
    this.blockedTLDs = new Set([
      'dev',
      'local',
      'internal',
      'test',
      'example',
      'invalid'
    ]);

    // IPs privadas
    this.privateIPRanges = [
      ['10.0.0.0', '10.255.255.255'],
      ['172.16.0.0', '172.31.255.255'],
      ['192.168.0.0', '192.168.255.255']
    ];

    // Enlazar métodos que usan "this" para evitar perder el contexto
    this.validateDomain = this.validateDomain.bind(this);
    this._normalizeDomain = this._normalizeDomain.bind(this);
    this._isValidFormat = this._isValidFormat.bind(this);
    this._isRestrictedDomain = this._isRestrictedDomain.bind(this);
    this._getTLD = this._getTLD.bind(this);
    this._getBaseDomain = this._getBaseDomain.bind(this);
    this._isPrivateIP = this._isPrivateIP.bind(this);
    this._ipToNumber = this._ipToNumber.bind(this);
    this._verifyDNS = this._verifyDNS.bind(this);
    this._verifySSL = this._verifySSL.bind(this);
  }

  /**
   * Validar un dominio
   * @param {string} domain - Dominio a validar
   * @param {Object} options - Opciones de validación
   * @returns {Promise<Object>} - Resultado de la validación
   */
  async validateDomain(domain, options = {}) {
    const {
      checkDNS = true,
      allowSubdomains = true,
      allowIP = false,
      enforceSSL = true
    } = options;

    try {
      const result = {
        isValid: true,
        domain: domain.toLowerCase(),
        errors: [],
        warnings: [],
        metadata: {}
      };

      // Validaciones básicas
      if (!domain) {
        result.isValid = false;
        result.errors.push('Domain is required');
        return result;
      }

      // Normalizar dominio
      result.domain = this._normalizeDomain(domain);

      // Validar formato
      if (!this._isValidFormat(result.domain, allowSubdomains, allowIP)) {
        result.isValid = false;
        result.errors.push('Invalid domain format');
        return result;
      }

      // Verificar dominios restringidos
      if (this._isRestrictedDomain(result.domain)) {
        result.isValid = false;
        result.errors.push('Restricted domain name');
        return result;
      }

      // Verificar TLD
      const tld = this._getTLD(result.domain);
      if (this.blockedTLDs.has(tld)) {
        result.isValid = false;
        result.errors.push('Invalid TLD');
        return result;
      }

      // Verificar si es IP
      if (this.patterns.ip.test(result.domain)) {
        if (!allowIP) {
          result.isValid = false;
          result.errors.push('IP addresses not allowed');
          return result;
        }
        if (this._isPrivateIP(result.domain)) {
          result.isValid = false;
          result.errors.push('Private IP addresses not allowed');
          return result;
        }
      }

      // Verificar DNS si está habilitado
      if (checkDNS) {
        const dnsResult = await this._verifyDNS(result.domain);
        if (!dnsResult.exists) {
          result.isValid = false;
          result.errors.push('Domain DNS resolution failed');
        }
        result.metadata.dns = dnsResult;
      }

      // Verificar SSL si está habilitado
      if (enforceSSL) {
        const sslResult = await this._verifySSL(result.domain);
        if (!sslResult.valid) {
          result.warnings.push('SSL verification failed');
        }
        result.metadata.ssl = sslResult;
      }

      return result;
    } catch (error) {
      logger.error('Error validating domain:', error);
      return {
        isValid: false,
        domain,
        errors: ['Validation error occurred'],
        warnings: [],
        metadata: {}
      };
    }
  }

  /**
   * Verificar si dos dominios están relacionados
   * @param {string} domain1 - Primer dominio
   * @param {string} domain2 - Segundo dominio
   * @returns {boolean} - true si están relacionados
   */
  areDomainsRelated(domain1, domain2) {
    try {
      const base1 = this._getBaseDomain(domain1);
      const base2 = this._getBaseDomain(domain2);
      return base1 === base2;
    } catch (error) {
      logger.error('Error checking domain relation:', error);
      return false;
    }
  }

  /**
   * Obtener subdominios válidos para un dominio
   * @param {string} domain - Dominio base
   * @returns {Array<string>} - Lista de subdominios permitidos
   */
  getValidSubdomains(domain) {
    try {
      const baseDomain = this._getBaseDomain(domain);
      return [
        baseDomain,
        `www.${baseDomain}`,
        `api.${baseDomain}`,
        `cdn.${baseDomain}`,
        `stage.${baseDomain}`,
        `dev.${baseDomain}`
      ];
    } catch (error) {
      logger.error('Error getting valid subdomains:', error);
      return [];
    }
  }

  // ──────────────────────────────
  // MÉTODOS PRIVADOS
  // ──────────────────────────────

  /**
   * Normalizar un dominio eliminando protocolo, www, path y query params
   * @private
   */
  _normalizeDomain(domain) {
    // Eliminar protocolo (http, https) y "www."
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
    // Eliminar path y query params
    domain = domain.split('/')[0].split('?')[0];
    // Convertir a minúsculas y recortar espacios
    return domain.toLowerCase().trim();
  }

  /**
   * Verificar formato de dominio
   * @private
   */
  _isValidFormat(domain, allowSubdomains, allowIP) {
    if (allowIP && this.patterns.ip.test(domain)) {
      return true;
    }

    if (!allowSubdomains) {
      return this.patterns.domain.test(domain) &&
             domain.split('.').length === 2;
    }

    return this.patterns.domain.test(domain);
  }

  /**
   * Verificar si es un dominio restringido
   * @private
   */
  _isRestrictedDomain(domain) {
    const baseDomain = this._getBaseDomain(domain);
    return this.restrictedDomains.has(baseDomain);
  }

  /**
   * Obtener el TLD (extensión) de un dominio
   * @private
   */
  _getTLD(domain) {
    const parts = domain.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Obtener el dominio base (por ejemplo, "example.com" de "sub.example.com")
   * @private
   */
  _getBaseDomain(domain) {
    const parts = this._normalizeDomain(domain).split('.');
    if (parts.length < 2) return domain;
    return parts.slice(-2).join('.');
  }

  /**
   * Verificar si una IP es privada
   * @private
   */
  _isPrivateIP(ip) {
    const ipNum = this._ipToNumber(ip);
    return this.privateIPRanges.some(([start, end]) =>
      ipNum >= this._ipToNumber(start) && ipNum <= this._ipToNumber(end)
    );
  }

  /**
   * Convertir una IP (string) a un número para comparaciones
   * @private
   */
  _ipToNumber(ip) {
    return ip.split('.')
      .reduce((num, octet) => (num << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  /**
   * Verificar registros DNS del dominio
   * @private
   */
  async _verifyDNS(domain) {
    try {
      const result = {
        exists: false,
        records: {
          a: [],
          aaaa: [],
          mx: [],
          txt: []
        }
      };

      // Verificar registros A
      try {
        result.records.a = await dns.resolve4(domain);
        result.exists = true;
      } catch (e) {
        // Ignorar error
      }

      // Verificar registros AAAA
      try {
        result.records.aaaa = await dns.resolve6(domain);
        result.exists = true;
      } catch (e) {
        // Ignorar error
      }

      // Verificar registros MX
      try {
        result.records.mx = await dns.resolveMx(domain);
      } catch (e) {
        // Ignorar error
      }

      // Verificar registros TXT
      try {
        result.records.txt = await dns.resolveTxt(domain);
      } catch (e) {
        // Ignorar error
      }

      return result;
    } catch (error) {
      logger.error('Error verifying DNS:', error);
      return { exists: false, records: {} };
    }
  }

  /**
   * Verificar SSL mediante una petición HEAD a la URL https://<dominio>
   * @private
   */
  async _verifySSL(domain) {
    try {
      const url = `https://${domain}`;
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 5000
      });

      return {
        valid: true,
        protocol: response.url.split(':')[0],
        statusCode: response.status
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new DomainValidator();
