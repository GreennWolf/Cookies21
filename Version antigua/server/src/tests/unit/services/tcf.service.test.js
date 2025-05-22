// tests/unit/services/tcf.service.test.js
const tcfService = require('../../../services/tfc.service');
const logger = require('../../../utils/logger');

jest.mock('../../../utils/logger');

describe('TCFService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTCString', () => {
    test('debería generar TC String válido', async () => {
      const config = {
        vendorList: {
          version: 2,
          vendors: {
            1: { id: 1, name: 'Vendor 1' },
            2: { id: 2, name: 'Vendor 2' }
          },
          purposes: {
            1: { id: 1, name: 'Purpose 1' },
            2: { id: 2, name: 'Purpose 2' }
          }
        },
        decisions: {
          purposes: [
            { id: 1, allowed: true, legalBasis: 'consent' },
            { id: 2, allowed: false, legalBasis: 'legitimate_interest' }
          ],
          vendors: [
            { id: 1, allowed: true },
            { id: 2, allowed: false }
          ]
        },
        metadata: {
          language: 'en',
          deviceType: 'desktop'
        }
      };

      const tcString = await tcfService.generateTCString(config);

      expect(tcString).toBeTruthy();
      expect(typeof tcString).toBe('string');
      expect(tcString.split('.')).toHaveLength(4); // 4 segmentos esperados
    });

    test('debería manejar errores al generar TC String', async () => {
      const invalidConfig = null;

      await expect(tcfService.generateTCString(invalidConfig))
        .rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    test('debería incluir versión TCF correcta', async () => {
      const config = {
        vendorList: {
          version: 2,
          vendors: { 1: { id: 1, name: 'Vendor 1' } },
          purposes: { 1: { id: 1, name: 'Purpose 1' } }
        },
        decisions: {
          purposes: [{ id: 1, allowed: true }],
          vendors: [{ id: 1, allowed: true }]
        }
      };

      const tcString = await tcfService.generateTCString(config);
      const decoded = await tcfService.decodeTCString(tcString);

      // Se espera que la versión core sea igual a TCF_VERSION
      expect(decoded.core.version).toBe(tcfService.TCF_VERSION);
    });
  });

  describe('decodeTCString', () => {
    test('debería decodificar TC String correctamente', async () => {
      const config = {
        vendorList: {
          version: 2,
          vendors: { 1: { id: 1, name: 'Vendor 1' } },
          purposes: { 1: { id: 1, name: 'Purpose 1' } }
        },
        decisions: {
          purposes: [{ id: 1, allowed: true }],
          vendors: [{ id: 1, allowed: true }]
        }
      };

      const tcString = await tcfService.generateTCString(config);
      const decoded = await tcfService.decodeTCString(tcString);

      expect(decoded).toEqual(expect.objectContaining({
        core: expect.objectContaining({
          version: tcfService.TCF_VERSION,
          created: expect.any(Date),
          lastUpdated: expect.any(Date),
          cmpId: undefined, // Dado que process.env.IAB_CMP_ID no está seteado en test
          cmpVersion: expect.any(Number),
          consentScreen: expect.any(Number),
          consentLanguage: expect.any(String),
          vendorListVersion: expect.any(Number),
          purposesConsent: expect.any(Array),
          vendorConsent: expect.any(Array)
        }),
        publisherTC: expect.any(Object),
        vendorsAllowed: expect.objectContaining({
          maxVendorId: expect.any(Number),
          vendorConsent: expect.any(Array)
        }),
        vendorsDisclosed: expect.objectContaining({
          maxVendorId: expect.any(Number),
          vendorConsent: expect.any(Array)
        })
      }));
    });

    test('debería manejar TC Strings inválidos', async () => {
      const invalidTCString = 'invalid.tc.string.format';

      await expect(tcfService.decodeTCString(invalidTCString))
        .rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    test('debería preservar propósitos y vendors en decodificación', async () => {
      const config = {
        vendorList: {
          version: 2,
          vendors: {
            1: { id: 1, name: 'Vendor 1' },
            2: { id: 2, name: 'Vendor 2' }
          },
          purposes: {
            1: { id: 1, name: 'Purpose 1' },
            2: { id: 2, name: 'Purpose 2' }
          }
        },
        decisions: {
          purposes: [
            { id: 1, allowed: true },
            { id: 2, allowed: false }
          ],
          vendors: [
            { id: 1, allowed: true },
            { id: 2, allowed: false }
          ]
        }
      };

      const tcString = await tcfService.generateTCString(config);
      const decoded = await tcfService.decodeTCString(tcString);

      expect(decoded.core.purposesConsent).toHaveLength(24);
      expect(decoded.core.purposesConsent[0].allowed).toBe(true);
      expect(decoded.core.purposesConsent[1].allowed).toBe(false);
    });
  });

  describe('validateConsent', () => {
    test('debería validar consentimiento válido', async () => {
      const decisions = {
        purposes: [
          { id: 1, allowed: true },
          { id: 2, allowed: false }
        ],
        vendors: [
          { id: 1, allowed: true },
          { id: 2, allowed: false }
        ]
      };

      const vendorList = {
        vendors: {
          1: { id: 1, name: 'Vendor 1' },
          2: { id: 2, name: 'Vendor 2' }
        },
        purposes: {
          1: { id: 1, name: 'Purpose 1' },
          2: { id: 2, name: 'Purpose 2' }
        }
      };

      const validation = await tcfService.validateConsent(decisions, vendorList);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('debería detectar propósitos inválidos', async () => {
      const decisions = {
        purposes: [{ id: 999, allowed: true }],
        vendors: [{ id: 1, allowed: true }]
      };

      const vendorList = {
        vendors: { 1: { id: 1, name: 'Vendor 1' } },
        purposes: { 1: { id: 1, name: 'Purpose 1' } }
      };

      const validation = await tcfService.validateConsent(decisions, vendorList);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid purpose ID: 999');
    });

    test('debería detectar vendors inválidos', async () => {
      const decisions = {
        purposes: [{ id: 1, allowed: true }],
        vendors: [{ id: 999, allowed: true }]
      };

      const vendorList = {
        vendors: { 1: { id: 1, name: 'Vendor 1' } },
        purposes: { 1: { id: 1, name: 'Purpose 1' } }
      };

      const validation = await tcfService.validateConsent(decisions, vendorList);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid vendor ID: 999');
    });

    test('debería manejar errores de validación', async () => {
      const decisions = null;
      const vendorList = {};

      await expect(tcfService.validateConsent(decisions, vendorList))
        .rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Métodos de codificación/decodificación', () => {
    describe('_encodeSegment', () => {
      test('debería codificar segmento correctamente', () => {
        const segment = {
          version: 2,
          created: Date.now(),
          cmpId: 1
        };

        const encoded = tcfService._encodeSegment(segment);
        expect(typeof encoded).toBe('string');
        expect(encoded).not.toContain('='); // Base64URL no usa padding
      });
    });

    describe('_decodeSegment', () => {
      test('debería decodificar segmento correctamente', () => {
        const segment = {
          version: 2,
          created: Date.now(),
          cmpId: 1
        };

        const encoded = tcfService._encodeSegment(segment);
        const decoded = tcfService._decodeSegment(encoded);

        expect(decoded).toEqual(segment);
      });

      test('debería manejar strings inválidos', () => {
        expect(() => tcfService._decodeSegment('invalid-base64')).toThrow();
      });
    });
  });

  describe('Métodos de parsing', () => {
    describe('_parseCoreSegment', () => {
      test('debería parsear segmento core correctamente', () => {
        const rawSegment = {
          version: 2,
          created: Date.now(),
          lastUpdated: Date.now(),
          cmpId: 123,
          cmpVersion: 1,
          consentScreen: 1,
          consentLanguage: 'EN',
          vendorListVersion: 48,
          purposesConsent: [1, 0, 1, 0],
          vendorConsent: [1, 1, 0]
        };

        const parsed = tcfService._parseCoreSegment(rawSegment);

        expect(parsed).toEqual(expect.objectContaining({
          version: rawSegment.version,
          created: expect.any(Date),
          lastUpdated: expect.any(Date),
          cmpId: rawSegment.cmpId,
          cmpVersion: rawSegment.cmpVersion,
          consentScreen: rawSegment.consentScreen,
          consentLanguage: rawSegment.consentLanguage,
          vendorListVersion: rawSegment.vendorListVersion,
          purposesConsent: expect.any(Array),
          vendorConsent: expect.any(Array)
        }));
      });
    });

    describe('_parseVendorsDisclosedSegment', () => {
      test('debería parsear segmento de vendors revelados', () => {
        const segment = {
          maxVendorId: 3,
          vendorConsent: [1, 0, 1]
        };

        const parsed = tcfService._parseVendorsDisclosedSegment(segment);

        expect(parsed.maxVendorId).toBe(3);
        expect(parsed.vendorConsent).toEqual([
          { id: 1, allowed: true },
          { id: 2, allowed: false },
          { id: 3, allowed: true }
        ]);
      });
    });

    describe('_parseBitField', () => {
      test('debería convertir bitfield a array de objetos', () => {
        const bitField = [1, 0, 1, 0, 1];

        const parsed = tcfService._parseBitField(bitField);

        expect(parsed).toEqual([
          { id: 1, allowed: true },
          { id: 2, allowed: false },
          { id: 3, allowed: true },
          { id: 4, allowed: false },
          { id: 5, allowed: true }
        ]);
      });
    });
  });
});
