const advancedCookieAnalyzer = require('../../../services/advancedCookieAnalyzer.service');
const CookieAnalysisResult = require('../../../models/CookieAnalysisResult');

// Mock de Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      goto: jest.fn().mockResolvedValue({ ok: () => true }),
      cookies: jest.fn().mockResolvedValue([
        {
          name: 'test_cookie',
          value: 'test_value',
          domain: 'example.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'Lax'
        }
      ]),
      evaluate: jest.fn().mockResolvedValue([]),
      close: jest.fn(),
      setRequestInterception: jest.fn(),
      on: jest.fn(),
      waitForTimeout: jest.fn()
    }),
    close: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true)
  })
}));

// Mock del modelo
jest.mock('../../../models/CookieAnalysisResult');

describe('Advanced Cookie Analyzer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cookie Analysis', () => {
    test('should categorize cookies correctly', () => {
      const testCases = [
        { name: '_ga', expected: 'analytics' },
        { name: 'session_id', expected: 'necessary' },
        { name: '_fbp', expected: 'advertising' },
        { name: 'prefs_theme', expected: 'functional' },
        { name: 'unknown_cookie', expected: 'unknown' }
      ];

      testCases.forEach(({ name, expected }) => {
        const result = advancedCookieAnalyzer.categorizeCookie({ name });
        expect(result).toBe(expected);
      });
    });

    test('should identify providers correctly', () => {
      const testCases = [
        { name: '_ga', expectedProvider: 'Google Analytics' },
        { name: '_fbp', expectedProvider: 'Facebook' },
        { name: '_hjid', expectedProvider: 'Hotjar' },
        { name: 'unknown', expectedProvider: 'Unknown' }
      ];

      testCases.forEach(({ name, expectedProvider }) => {
        const result = advancedCookieAnalyzer.identifyProvider({ name, domain: 'example.com' });
        expect(result.name).toBe(expectedProvider);
      });
    });

    test('should detect PII in cookie values', () => {
      const testCases = [
        { value: 'user@example.com', expected: true },
        { value: '123-45-6789', expected: true },
        { value: 'simple_value', expected: false },
        { value: 'GA1.2.123456789.1234567890', expected: false }
      ];

      testCases.forEach(({ value, expected }) => {
        const result = advancedCookieAnalyzer.detectPII(value);
        expect(result).toBe(expected);
      });
    });

    test('should detect tracking data patterns', () => {
      const testCases = [
        { value: 'GA1.2.123456789.1234567890', expected: true },
        { value: '550e8400-e29b-41d4-a716-446655440000', expected: true },
        { value: '1234567890123', expected: true },
        { value: 'simple_text', expected: false }
      ];

      testCases.forEach(({ value, expected }) => {
        const result = advancedCookieAnalyzer.detectTrackingData(value);
        expect(result).toBe(expected);
      });
    });

    test('should determine cookie complexity', () => {
      const testCases = [
        { value: 'simple', expected: 'simple' },
        { value: 'dGVzdA==', expected: 'encrypted' },
        { value: 'value1|value2&param=test', expected: 'complex' },
        { value: 'medium_length_encoded_value', expected: 'encoded' }
      ];

      testCases.forEach(({ value, expected }) => {
        const result = advancedCookieAnalyzer.determineComplexity(value);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Subdomain Discovery', () => {
    test('should generate common subdomain list', async () => {
      // Mock browser para subdomain discovery
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue({ ok: () => true }),
          close: jest.fn()
        })
      };
      
      advancedCookieAnalyzer.browser = mockBrowser;
      
      const subdomains = await advancedCookieAnalyzer.discoverSubdomains('example.com');
      
      expect(Array.isArray(subdomains)).toBe(true);
      expect(mockBrowser.newPage).toHaveBeenCalled();
    });
  });

  describe('Risk Assessment', () => {
    test('should calculate risk levels correctly', () => {
      const testCases = [
        { score: 3, thresholds: [5, 15, 30], expected: 'low' },
        { score: 10, thresholds: [5, 15, 30], expected: 'medium' },
        { score: 20, thresholds: [5, 15, 30], expected: 'high' },
        { score: 40, thresholds: [5, 15, 30], expected: 'critical' }
      ];

      testCases.forEach(({ score, thresholds, expected }) => {
        const result = advancedCookieAnalyzer.getRiskLevel(score, thresholds);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Script Analysis', () => {
    test('should categorize scripts by URL', () => {
      const testCases = [
        { src: 'https://www.google-analytics.com/analytics.js', expected: 'analytics' },
        { src: 'https://connect.facebook.net/en_US/fbevents.js', expected: 'social' },
        { src: 'https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js', expected: 'functionality' },
        { src: 'https://example.com/custom.js', expected: 'unknown' }
      ];

      testCases.forEach(({ src, expected }) => {
        const result = advancedCookieAnalyzer.categorizeScript(src);
        expect(result).toBe(expected);
      });
    });

    test('should detect tracking in script content', () => {
      const testCases = [
        { content: 'gtag("event", "purchase");', expected: true },
        { content: 'analytics.track("user_id", 123);', expected: true },
        { content: 'console.log("Hello world");', expected: false },
        { content: 'function track() { /* tracking code */ }', expected: true }
      ];

      testCases.forEach(({ content, expected }) => {
        const result = advancedCookieAnalyzer.detectTrackingInScript(content);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Duration Analysis', () => {
    test('should analyze cookie duration correctly', () => {
      const now = Date.now() / 1000;
      
      const testCases = [
        { expires: null, expected: 'session' },
        { expires: now + 3600, expected: 'session' }, // 1 hora
        { expires: now + 86400 * 15, expected: 'persistent' }, // 15 días
        { expires: now + 86400 * 365, expected: 'long-term' } // 1 año
      ];

      testCases.forEach(({ expires, expected }) => {
        const result = advancedCookieAnalyzer.analyzeDuration({ expires });
        expect(result).toBe(expected);
      });
    });
  });

  describe('GDPR Compliance', () => {
    test('should evaluate GDPR compliance correctly', () => {
      const testCases = [
        {
          cookie: { category: 'necessary', secure: true, sameSite: 'Strict', duration: 'session' },
          expected: true
        },
        {
          cookie: { category: 'analytics', secure: false, sameSite: null, duration: 'long-term' },
          expected: false
        },
        {
          cookie: { category: 'advertising', secure: true, sameSite: 'Lax', duration: 'persistent' },
          expected: true
        }
      ];

      testCases.forEach(({ cookie, expected }) => {
        const result = advancedCookieAnalyzer.evaluateGDPRCompliance(cookie);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Storage Analysis', () => {
    test('should infer storage purpose correctly', () => {
      const testCases = [
        { key: 'auth_token', expected: 'auth' },
        { key: 'user_preferences', expected: 'preferences' },
        { key: 'analytics_data', expected: 'analytics' },
        { key: 'shopping_cart', expected: 'cart' },
        { key: 'random_key', expected: 'unknown' }
      ];

      testCases.forEach(({ key, expected }) => {
        const result = advancedCookieAnalyzer.inferStoragePurpose(key, 'test_value');
        expect(result).toBe(expected);
      });
    });
  });

  describe('Network Analysis', () => {
    test('should identify tracking purposes in URLs', () => {
      const testCases = [
        { url: 'https://www.google-analytics.com/collect', expected: 'analytics' },
        { url: 'https://www.facebook.com/tr/', expected: 'social' },
        { url: 'https://doubleclick.net/ads', expected: 'advertising' },
        { url: 'https://example.com/api/data', expected: null }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = advancedCookieAnalyzer.identifyTrackingPurpose(url);
        expect(result).toBe(expected);
      });
    });

    test('should detect tracking pixels', () => {
      const testCases = [
        { url: 'https://facebook.com/tr/?pixel=123', type: 'image', expected: true },
        { url: 'https://example.com/tracking.gif?id=123', type: 'image', expected: true },
        { url: 'https://example.com/image.jpg', type: 'image', expected: false },
        { url: 'https://example.com/script.js', type: 'script', expected: false }
      ];

      testCases.forEach(({ url, type, expected }) => {
        const result = advancedCookieAnalyzer.isTrackingPixel(url, type);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Form Analysis', () => {
    test('should detect PII in form fields', () => {
      const testCases = [
        { name: 'email', type: 'email', placeholder: 'Enter email', expected: true },
        { name: 'phone', type: 'tel', placeholder: '', expected: true },
        { name: 'firstName', type: 'text', placeholder: 'Your name', expected: true },
        { name: 'newsletter', type: 'checkbox', placeholder: '', expected: false }
      ];

      testCases.forEach(({ name, type, placeholder, expected }) => {
        const result = advancedCookieAnalyzer.fieldContainsPII({ name, type, placeholder });
        expect(result).toBe(expected);
      });
    });
  });

  describe('Browser Management', () => {
    test('should initialize browser correctly', async () => {
      const browser = await advancedCookieAnalyzer.initBrowser();
      expect(browser).toBeDefined();
      expect(browser.newPage).toBeDefined();
    });

    test('should close browser properly', async () => {
      await advancedCookieAnalyzer.initBrowser();
      await advancedCookieAnalyzer.closeBrowser();
      expect(advancedCookieAnalyzer.browser).toBeNull();
    });
  });
});

describe('Cookie Analysis Integration', () => {
  test('should perform complete cookie analysis', async () => {
    const mockCookie = {
      name: '_ga',
      value: 'GA1.2.123456789.1234567890',
      domain: 'example.com',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'Lax',
      expires: (Date.now() / 1000) + 86400 * 30 // 30 días
    };

    const result = await advancedCookieAnalyzer.analyzeCookie(mockCookie, 'https://example.com');

    expect(result).toHaveProperty('name', '_ga');
    expect(result).toHaveProperty('category', 'analytics');
    expect(result).toHaveProperty('provider');
    expect(result.provider.name).toBe('Google Analytics');
    expect(result).toHaveProperty('isFirstParty', true);
    expect(result).toHaveProperty('duration', 'persistent');
    expect(result).toHaveProperty('containsTrackingData', true);
    expect(result).toHaveProperty('gdprCompliant');
  });
});