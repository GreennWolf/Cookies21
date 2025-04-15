// tests/unit/utils/dateHelpers.test.js
const dateHelpers = require('../../../utils/dateHelpers');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
jest.mock('../../../utils/logger');

describe('DateHelpers', () => {
  describe('formatDate', () => {
    test('debería formatear fechas en diferentes formatos', () => {
      const testDate = new Date('2024-01-25T12:00:00Z');
      
      expect(dateHelpers.formatDate(testDate, 'ISO')).toBe('2024-01-25T12:00:00.000Z');
      expect(dateHelpers.formatDate(testDate, 'SHORT')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(dateHelpers.formatDate(testDate, 'LONG')).toContain('2024');
    });

    test('debería manejar diferentes tipos de entrada', () => {
      const testCases = [
        new Date(),
        '2024-01-25',
        1706169600000
      ];

      testCases.forEach(date => {
        expect(() => dateHelpers.formatDate(date)).not.toThrow();
      });
    });
  });

  describe('getDateDiff', () => {
    test('debería calcular diferencias de tiempo correctamente', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-02-01');

      expect(dateHelpers.getDateDiff(date1, date2, 'days')).toBe(31);
      expect(dateHelpers.getDateDiff(date1, date2, 'months')).toBe(1);
      expect(dateHelpers.getDateDiff(date1, date2, 'hours')).toBe(31 * 24);
    });
  });

  describe('isDateBetween', () => {
    test('debería verificar si una fecha está en un rango', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const testDate = new Date('2024-06-15');
      
      expect(dateHelpers.isDateBetween(testDate, start, end)).toBe(true);
      expect(dateHelpers.isDateBetween(new Date('2025-01-01'), start, end)).toBe(false);
    });
  });
});