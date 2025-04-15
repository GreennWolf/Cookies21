const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const googleService = require('../../../services/google.service');
const logger = require('../../../utils/logger');
const { decrypt } = require('../../../utils/crypto');

// Configuramos los mocks
jest.mock('axios');
jest.mock('google-auth-library');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/crypto');

describe('GoogleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateGoogleConfig', () => {
    it('debería validar configuración de GA correctamente', async () => {
      const config = {
        measurementId: 'G-ABC123',
        credentials: 'encrypted_credentials'
      };

      // Simulamos que decrypt devuelve un objeto con token y code
      decrypt.mockReturnValue({ token: 'fake_token', code: 'fake_code' });
      // Simulamos que verifyIdToken se resuelve sin error
      OAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValue({});

      // Simulamos la respuesta de axios.get en _verifyPropertyAccess
      axios.get.mockResolvedValue({ data: { property: 'fake_property' } });

      // Simulamos getToken para que _getAccessToken funcione
      googleService.oauth2Client.getToken = jest
        .fn()
        .mockResolvedValue({ tokens: { access_token: 'fake_access_token' } });

      const result = await googleService.validateGoogleConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.measurementId).toBe(config.measurementId);
      expect(result.propertyDetails).toBeDefined();
      expect(OAuth2Client.prototype.verifyIdToken).toHaveBeenCalled();
    });

    it('debería rechazar Measurement ID inválido', async () => {
      const config = { measurementId: 'invalid', credentials: null };
      const result = await googleService.validateGoogleConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Measurement ID format');
    });

    it('debería manejar errores de validación de credenciales', async () => {
      const config = { measurementId: 'G-ABC123', credentials: 'bad_credentials' };
      // Simulamos que decrypt lanza error
      decrypt.mockImplementation(() => { throw new Error('Decrypt error'); });
      const result = await googleService.validateGoogleConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid credentials');
    });
  });

  describe('configureGTM', () => {
    it('debería configurar GTM exitosamente', async () => {
      const domain = { domain: 'example.com' };
      const config = {
        containerId: 'GTM-XYZ123',
        credentials: 'encrypted_credentials',
        workspaceId: 'default'
      };

      decrypt.mockReturnValue({ code: 'fake_code' });
      googleService.oauth2Client.getToken = jest
        .fn()
        .mockResolvedValue({ tokens: { access_token: 'fake_access_token' } });

      // Simulamos respuestas para los métodos internos
      googleService._getOrCreateContainer = jest
        .fn()
        .mockResolvedValue({ accountId: 'account1', containerId: 'GTM-XYZ123', publicId: 'public1' });
      googleService._getWorkspace = jest
        .fn()
        .mockResolvedValue({ workspaceId: 'default' });
      googleService._generateCMPConfig = jest
        .fn()
        .mockResolvedValue({ defaultConsent: {} });
      googleService._setupCMPConfiguration = jest
        .fn()
        .mockResolvedValue({});

      const result = await googleService.configureGTM(domain, config);
      expect(result).toHaveProperty('accountId', 'account1');
      expect(result).toHaveProperty('containerId', 'GTM-XYZ123');
      expect(result).toHaveProperty('workspaceId', 'default');
      expect(result).toHaveProperty('publicId', 'public1');
      expect(result).toHaveProperty('configuration');
    });

    it('debería rechazar Container ID inválido', async () => {
      const domain = { domain: 'example.com' };
      const config = { containerId: 'invalid', credentials: 'encrypted_credentials' };
      await expect(googleService.configureGTM(domain, config)).rejects.toThrow('Invalid Container ID format');
    });

    it('debería manejar errores de la API de GTM', async () => {
      const domain = { domain: 'example.com' };
      const config = {
        containerId: 'GTM-XYZ123',
        credentials: 'encrypted_credentials'
      };

      decrypt.mockReturnValue({ code: 'fake_code' });
      googleService.oauth2Client.getToken = jest
        .fn()
        .mockRejectedValue(new Error('API Error'));

      await expect(googleService.configureGTM(domain, config)).rejects.toThrow('API Error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('trackConsentEvents', () => {
    it('debería trackear eventos de consentimiento', async () => {
      const validEvents = [{ event: 'consent_given' }, { event: 'consent_updated' }];
      axios.post.mockResolvedValue({ data: { success: true, eventsTracked: validEvents.length } });

      const result = await googleService.trackConsentEvents('G-12345678', validEvents);
      expect(result.success).toBe(true);
      expect(result.eventsTracked).toBe(validEvents.length);
    });

    it('debería manejar errores al trackear eventos', async () => {
      const validEvents = [{ event: 'consent_given' }];
      axios.post.mockRejectedValue(new Error('API Error'));

      await expect(googleService.trackConsentEvents('G-12345678', validEvents))
        .rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('debería validar formato de eventos', async () => {
      const invalidEvents = [{ type: 'invalid' }]; // Falta la propiedad "event"
      await expect(googleService.trackConsentEvents('G-12345678', invalidEvents))
        .rejects.toThrow('Invalid events format');
    });
  });

  describe('generateTagConfiguration', () => {
    it('debería generar configuración de tag de Analytics', async () => {
      const config = {
        type: 'analytics',
        settings: { trackingId: 'UA-12345678-1' }
      };
      const result = await googleService.generateTagConfiguration(config);
      expect(result.name).toBe('Google Analytics');
      expect(result.type).toBe('ua');
      expect(result.parameter).toEqual([
        { key: 'trackingId', value: 'UA-12345678-1' },
        { key: 'anonymizeIp', value: true }
      ]);
      expect(result.consentSettings).toEqual({
        consentStatus: 'needed',
        consentType: googleService.CONSENT_MODES.ANALYTICS
      });
    });

    it('debería generar configuración con consent settings', async () => {
      const config = {
        type: 'analytics',
        settings: { trackingId: 'UA-12345678-1' }
      };
      const result = await googleService.generateTagConfiguration(config);
      expect(result.consentSettings).toBeDefined();
    });

    it('debería rechazar tipos de tag no soportados', async () => {
      const config = {
        type: 'unsupported',
        settings: {}
      };
      await expect(googleService.generateTagConfiguration(config))
        .rejects.toThrow('Unsupported tag type: unsupported');
    });

    it('debería validar parámetros requeridos', async () => {
      const config = {
        type: 'analytics',
        settings: {} // Falta trackingId
      };
      await expect(googleService.generateTagConfiguration(config))
        .rejects.toThrow('Missing required parameters');
    });
  });
});
