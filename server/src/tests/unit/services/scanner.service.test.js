const puppeteer = require('puppeteer');
const scannerService = require('../../../services/scanner.service');
const logger = require('../../../utils/logger');

jest.mock('puppeteer');
jest.mock('../../../utils/logger');
jest.mock('../../../config/redis');

describe('ScannerService', () => {
  let mockPage;
  let mockBrowser;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reiniciar el estado del servicio
    scannerService.browserPool = null;

    mockPage = {
      goto: jest.fn(),
      cookies: jest.fn(),
      setRequestInterception: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      setDefaultTimeout: jest.fn(),
      setUserAgent: jest.fn(),
      evaluate: jest.fn(),
      on: jest.fn(),
      close: jest.fn()
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn()
    };

    puppeteer.launch.mockResolvedValue(mockBrowser);
  });

  describe('initBrowserPool', () => {
    test('debería inicializar el browser pool con las opciones correctas', async () => {
      await scannerService.initBrowserPool();

      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]),
        ignoreHTTPSErrors: true,
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      });
    });
  });

  describe('_normalizeUrl', () => {
    test('debería normalizar URLs correctamente', () => {
      const url = 'http://example.com/page?utm_source=test&fbclid=123';
      const normalized = scannerService._normalizeUrl(url);
      
      expect(normalized).toBe('https://example.com/page');
    });

    test('debería manejar URLs inválidas', () => {
      const invalidUrl = 'not-a-url';
      const result = scannerService._normalizeUrl(invalidUrl);
      
      expect(result).toBe(invalidUrl);
    });
  });

  describe('_isValidUrl', () => {
    test('debería validar URLs del mismo dominio', () => {
      const baseUrl = 'https://example.com';
      const testUrl = 'https://example.com/page';
      
      expect(scannerService._isValidUrl(testUrl, baseUrl)).toBe(true);
    });

    test('debería rechazar URLs de diferente dominio', () => {
      const baseUrl = 'https://example.com';
      const testUrl = 'https://different.com/page';
      
      expect(scannerService._isValidUrl(testUrl, baseUrl)).toBe(false);
    });
  });

  describe('_parseSetCookieHeader', () => {
    test('debería parsear header de cookie simple', () => {
      const cookieHeader = 'sessionId=abc123; Path=/; Secure';
      const parsed = scannerService._parseSetCookieHeader(cookieHeader);

      expect(parsed).toEqual([
        expect.objectContaining({
          name: 'sessionId',
          value: 'abc123',
          path: '/',
          secure: true
        })
      ]);
    });

    test('debería parsear múltiples cookies', () => {
      const cookieHeaders = [
        'id=123; Path=/',
        'session=xyz; Secure'
      ];
      const parsed = scannerService._parseSetCookieHeader(cookieHeaders);

      expect(parsed).toHaveLength(2);
    });
  });

  describe('_chunkArray', () => {
    test('debería dividir array en chunks del tamaño especificado', () => {
      const array = [1, 2, 3, 4, 5];
      const chunks = scannerService._chunkArray(array, 2);

      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe('_countBy', () => {
    test('debería contar elementos por propiedad simple', () => {
      const items = [
        { type: 'a' },
        { type: 'b' },
        { type: 'a' }
      ];
      const counts = scannerService._countBy(items, 'type');

      expect(counts).toEqual({
        a: 2,
        b: 1
      });
    });

    test('debería contar elementos usando función personalizada', () => {
      const items = [
        { url: 'https://example.com/1' },
        { url: 'https://example.com/2' }
      ];
      const counts = scannerService._countBy(items, item => new URL(item.url).hostname);

      expect(counts).toEqual({
        'example.com': 2
      });
    });
  });

  describe('_determineScriptCategory', () => {
    test('debería categorizar scripts externos', () => {
      const script = { src: 'https://analytics.google.com/tracking.js' };
      expect(scannerService._determineScriptCategory(script)).toBe('analytics');
    });

    test('debería categorizar scripts inline', () => {
      const script = { content: 'window.dataLayer = window.dataLayer || [];' };
      expect(scannerService._determineScriptCategory(script)).toBe('tag_manager');
    });
  });
});