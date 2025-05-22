// tests/unit/utils/styleSanitizer.test.js

const styleSanitizer = require('../../../utils/styleSanitizer');
const logger = require('../../../utils/logger');

jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

describe('StyleSanitizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeStyles', () => {
    test('debería sanitizar estilos válidos', () => {
      const styles = {
        backgroundColor: '#ffffff',
        color: 'rgb(0, 0, 0)',
        padding: '10px',
        margin: '20px',
        display: 'flex',
        position: 'relative',
        fontSize: '16px',
        borderRadius: '4px'
      };

      const sanitized = styleSanitizer.sanitizeStyles(styles);
      expect(sanitized).toEqual(styles);
    });

    test('debería remover propiedades inválidas', () => {
      const styles = {
        backgroundColor: '#fff',
        behavior: 'malicious',
        expression: 'javascript:alert(1)',
        '-moz-binding': 'url(malicious.xml)'
      };

      const sanitized = styleSanitizer.sanitizeStyles(styles);

      expect(sanitized).toHaveProperty('backgroundColor');
      expect(sanitized).not.toHaveProperty('behavior');
      expect(sanitized).not.toHaveProperty('expression');
      expect(sanitized).not.toHaveProperty('-moz-binding');
    });

    test('debería validar valores de color', () => {
      const validColors = {
        color: '#fff',
        backgroundColor: '#ffffff',
        borderColor: 'rgb(0, 0, 0)',
        outlineColor: 'rgba(0, 0, 0, 0.5)'
      };

      const invalidColors = {
        color: 'invalid',
        backgroundColor: 'javascript:alert(1)',
        borderColor: 'rgb(999, 999, 999)',
        outlineColor: 'rgba(0,0,0)' // Missing alpha value
      };

      const sanitizedValid = styleSanitizer.sanitizeStyles(validColors);
      const sanitizedInvalid = styleSanitizer.sanitizeStyles(invalidColors);

      // Verificar colores válidos
      expect(sanitizedValid).toEqual(validColors);
      expect(Object.keys(sanitizedValid)).toHaveLength(4);

      // Verificar que los colores inválidos son removidos
      expect(Object.keys(sanitizedInvalid)).toHaveLength(0);
    });

    test('debería validar unidades CSS', () => {
      const validUnits = {
        width: '100px',
        height: '50%',
        margin: '1rem',
        padding: '2em',
        fontSize: '16px'
      };

      const invalidUnits = {
        width: '100vmin',
        height: '50vm',
        margin: '1xy',
        padding: 'invalid'
      };

      const sanitizedValid = styleSanitizer.sanitizeStyles(validUnits);
      const sanitizedInvalid = styleSanitizer.sanitizeStyles(invalidUnits);

      expect(Object.keys(sanitizedValid)).toHaveLength(5);
      expect(Object.keys(sanitizedInvalid)).toHaveLength(0);
    });

    test('debería manejar valores numéricos', () => {
      const styles = {
        zIndex: 999,
        opacity: 0.5,
        flex: 1
      };

      const sanitized = styleSanitizer.sanitizeStyles(styles);
      expect(sanitized).toEqual(styles);
    });

    test('debería validar propiedades flexbox', () => {
      const styles = {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      };

      const sanitized = styleSanitizer.sanitizeStyles(styles);
      expect(sanitized).toEqual(styles);
    });
  });

  describe('sanitizeInlineStyles', () => {
    test('debería sanitizar estilos inline', () => {
      const cssString = 'background-color: #fff; color: #000; padding: 10px;';
      const sanitized = styleSanitizer.sanitizeInlineStyles(cssString);

      expect(sanitized).toContain('background-color');
      expect(sanitized).toContain('color');
      expect(sanitized).toContain('padding');
    });

    test('debería remover estilos maliciosos', () => {
      const maliciousCss = `
        color: #ff0000;
        behavior: url(malicious.htc);
        -moz-binding: url(malicious.xml);
        expression: javascript:alert(1);
      `;

      const sanitized = styleSanitizer.sanitizeInlineStyles(maliciousCss);

      expect(sanitized).toContain('#ff0000');
      expect(sanitized).not.toContain('behavior');
      expect(sanitized).not.toContain('-moz-binding');
      expect(sanitized).not.toContain('expression');
    });

    test('debería manejar entradas inválidas', () => {
      const invalidInputs = [null, undefined, 123, {}];

      invalidInputs.forEach(input => {
        const result = styleSanitizer.sanitizeInlineStyles(input);
        expect(result).toBe('');
      });
    });
  });

  describe('_validateValueByType', () => {
    test('debería validar diferentes tipos de valores', () => {
      const testCases = [
        { property: 'color', value: '#fff', expected: '#fff' },
        { property: 'width', value: '100px', expected: '100px' },
        { property: 'margin', value: '10px 20px', expected: '10px 20px' },
        { property: 'zIndex', value: '999', expected: '999' },
        { property: 'background', value: 'url(javascript:alert)', expected: null },
        { property: 'width', value: '100invalid', expected: null }
      ];

      testCases.forEach(({ property, value, expected }) => {
        const result = styleSanitizer._validateValueByType(property, value);
        expect(result).toBe(expected);
      });
    });
  });

  describe('_camelToKebab/_kebabToCamel', () => {
    test('debería convertir entre camelCase y kebab-case', () => {
      const testCases = [
        { camel: 'backgroundColor', kebab: 'background-color' },
        { camel: 'marginTop', kebab: 'margin-top' },
        { camel: 'webkitTransform', kebab: 'webkit-transform' }
      ];

      testCases.forEach(({ camel, kebab }) => {
        expect(styleSanitizer._camelToKebab(camel)).toBe(kebab);
        expect(styleSanitizer._kebabToCamel(kebab)).toBe(camel);
      });
    });
  });

  describe('error handling', () => {
    test('debería manejar errores de manera elegante', () => {
      const circularObj = {};
      circularObj.self = circularObj;

      const result = styleSanitizer.sanitizeStyles(circularObj);
      expect(result).toEqual({});
      expect(logger.error).toHaveBeenCalled();
    });

    test('debería manejar valores undefined y null', () => {
      const styles = {
        color: undefined,
        backgroundColor: null,
        margin: '10px'
      };

      const sanitized = styleSanitizer.sanitizeStyles(styles);

      expect(sanitized).toHaveProperty('margin', '10px');
      expect(sanitized).not.toHaveProperty('color');
      expect(sanitized).not.toHaveProperty('backgroundColor');
    });
  });
});