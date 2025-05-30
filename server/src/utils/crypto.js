const crypto = require('crypto');
const logger = require('./logger');

class CryptoUtil {
  constructor() {
    // Algoritmo de encriptación
    this.algorithm = 'aes-256-gcm';
    
    // Longitud del IV (Vector de Inicialización)
    this.ivLength = 16;
    
    // Longitud del salt
    this.saltLength = 64;
    
    // Longitud de la auth tag
    this.authTagLength = 16;
    
    // Encoding por defecto
    this.defaultEncoding = 'hex';

    // Clave maestra derivada de la variable de entorno
    this.masterKey = this._deriveMasterKey(
      process.env.ENCRYPTION_KEY || this._generateRandomKey()
    );

    // Verificar configuración
    this._validateConfiguration();
  }

  /**
   * Encripta datos sensibles
   * @param {string|object} data - Datos a encriptar
   * @param {Object} options - Opciones de encriptación
   * @returns {string} - Datos encriptados
   */
  encrypt(data, options = {}) {
    try {
      // Convertir objeto a string si es necesario
      const stringData = typeof data === 'object' ? JSON.stringify(data) : data;

      // Generar IV aleatorio
      const iv = crypto.randomBytes(this.ivLength);

      // Generar salt aleatorio
      const salt = crypto.randomBytes(this.saltLength);

      // Derivar clave con salt
      const key = this._deriveKey(this.masterKey, salt);

      // Crear cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv, {
        authTagLength: this.authTagLength
      });

      // Encriptar datos
      const encrypted = Buffer.concat([
        cipher.update(stringData, 'utf8'),
        cipher.final()
      ]);

      // Obtener auth tag
      const authTag = cipher.getAuthTag();

      // Combinar todos los componentes
      const result = Buffer.concat([
        salt,
        iv,
        authTag,
        encrypted
      ]);

      // Devolver string codificado
      return result.toString(this.defaultEncoding);

    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Desencripta datos
   * @param {string} encryptedData - Datos encriptados
   * @param {Object} options - Opciones de desencriptación
   * @returns {string|object} - Datos desencriptados
   */
  decrypt(encryptedData, options = {}) {
    try {
      // Convertir string a Buffer
      const buffer = Buffer.from(encryptedData, this.defaultEncoding);

      // Extraer componentes
      const salt = buffer.slice(0, this.saltLength);
      const iv = buffer.slice(this.saltLength, this.saltLength + this.ivLength);
      const authTag = buffer.slice(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.authTagLength
      );
      const encrypted = buffer.slice(this.saltLength + this.ivLength + this.authTagLength);

      // Derivar clave con salt
      const key = this._deriveKey(this.masterKey, salt);

      // Crear decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv, {
        authTagLength: this.authTagLength
      });

      // Establecer auth tag
      decipher.setAuthTag(authTag);

      // Desencriptar datos
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]).toString('utf8');

      // Intentar parsear como JSON si es posible
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }

    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Genera un hash seguro de una contraseña
   * @param {string} password - Contraseña a hashear
   * @returns {string} - Hash de la contraseña
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      100000, // Iteraciones
      64,     // Longitud clave
      'sha512'
    );
    return `${salt}:${hash.toString('hex')}`;
  }

  /**
   * Verifica una contraseña contra su hash
   * @param {string} password - Contraseña a verificar
   * @param {string} hashedPassword - Hash almacenado
   * @returns {boolean} - Resultado de la verificación
   */
  verifyPassword(password, hashedPassword) {
    const [salt, hash] = hashedPassword.split(':');
    const calculatedHash = crypto.pbkdf2Sync(
      password,
      salt,
      100000,
      64,
      'sha512'
    ).toString('hex');
    return hash === calculatedHash;
  }

  /**
   * Genera un token seguro
   * @param {number} length - Longitud deseada del token
   * @returns {string} - Token generado
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Genera una firma HMAC
   * @param {string} data - Datos a firmar
   * @param {string} key - Clave para la firma
   * @returns {string} - Firma generada
   */
  generateHmac(data, key) {
    return crypto
      .createHmac('sha256', key)
      .update(data)
      .digest('hex');
  }

  /**
   * Verifica una firma HMAC
   * @param {string} data - Datos originales
   * @param {string} signature - Firma a verificar
   * @param {string} key - Clave de la firma
   * @returns {boolean} - Resultado de la verificación
   */
  verifyHmac(data, signature, key) {
    const calculatedSignature = this.generateHmac(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(calculatedSignature, 'hex')
    );
  }

  // Métodos privados

  /**
   * Deriva una clave maestra
   * @private
   */
  _deriveMasterKey(key) {
    return crypto.pbkdf2Sync(
      key,
      'master-salt',
      100000,
      32,
      'sha512'
    );
  }

  /**
   * Deriva una clave de encriptación
   * @private
   */
  _deriveKey(masterKey, salt) {
    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      10000,
      32,
      'sha512'
    );
  }

  /**
   * Genera una clave aleatoria
   * @private
   */
  _generateRandomKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Valida la configuración
   * @private
   */
  _validateConfiguration() {
    if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
      logger.warn('No encryption key provided, using random key');
    }

    try {
      const test = this.encrypt('test');
      this.decrypt(test);
    } catch (error) {
      logger.error('Crypto configuration validation failed:', error);
      throw new Error('Invalid crypto configuration');
    }
  }
}

module.exports = new CryptoUtil();