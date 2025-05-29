// tests/unit/utils/analyticHelpers.test.js

const analyticHelpers = require('../../../utils/analyticHelpers');
const logger = require('../../../utils/logger');
const dateHelpers = require('../../../utils/dateHelpers');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../utils/logger');
jest.mock('../../../utils/dateHelpers');

describe('AnalyticHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePercentages', () => {
    test('debería calcular porcentajes correctamente', () => {
      const tests = [
        { value: 50, total: 100, expected: 50 },
        { value: 75, total: 100, expected: 75 },
        { value: 33, total: 100, expected: 33 }
      ];

      tests.forEach(({ value, total, expected }) => {
        const result = analyticHelpers.calculatePercentages(value, total);
        expect(result).toBe(expected);
      });
    });

    test('debería retornar 0 cuando el total es 0', () => {
      const result = analyticHelpers.calculatePercentages(50, 0);
      expect(result).toBe(0);
    });

    test('debería respetar las opciones de decimales', () => {
      const result = analyticHelpers.calculatePercentages(33.333, 100, { 
        decimals: 3
      });
      expect(result).toBe(33.333);
    });

    test('debería manejar errores y loggearlos', () => {
      const result = analyticHelpers.calculatePercentages(50, 100, { roundMethod: 'nonExistentMethod' });
      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('aggregateByTime', () => {
    beforeEach(() => {
      const mockDate = (dateStr) => new Date(dateStr + 'T00:00:00Z');
      
      dateHelpers.parseDate.mockImplementation(dateStr => mockDate(dateStr));
      
      dateHelpers.getStartOfPeriod.mockImplementation((date) => {
        const d = new Date(date);
        return mockDate(d.toISOString().split('T')[0]);
      });
      
      dateHelpers.getEndOfPeriod.mockImplementation((date) => {
        const d = new Date(date);
        d.setUTCHours(23, 59, 59, 999);
        return d;
      });
      
      dateHelpers.formatDate.mockImplementation((date) => {
        return date.toISOString().split('T')[0];
      });
      
      dateHelpers.addTime.mockImplementation((date, amount, interval) => {
        const d = new Date(date);
        if (interval === 'day') {
          d.setUTCDate(d.getUTCDate() + amount);
        }
        return d;
      });
    });

    test('debería agregar datos por período de tiempo', () => {
      const mockData = [
        { date: '2024-01-01', visits: 100 },
        { date: '2024-01-01', visits: 150 },
        { date: '2024-01-02', visits: 200 }
      ];

      const result = analyticHelpers.aggregateByTime(mockData, 'date', {
        interval: 'day',
        metrics: ['visits']
      });

      expect(result).toEqual([
        {
          period: '2024-01-01',
          count: 2,
          visits: 250
        },
        {
          period: '2024-01-02',
          count: 1,
          visits: 200
        }
      ]);
    });

    test('debería rellenar gaps cuando se solicita', () => {
      const mockData = [
        { date: '2024-01-01', visits: 100 },
        { date: '2024-01-03', visits: 200 }
      ];

      const result = analyticHelpers.aggregateByTime(mockData, 'date', {
        interval: 'day',
        metrics: ['visits'],
        fillGaps: true
      });

      expect(result).toEqual([
        {
          period: '2024-01-01',
          count: 1,
          visits: 100
        },
        {
          period: '2024-01-02',
          count: 0,
          visits: 0
        },
        {
          period: '2024-01-03',
          count: 1,
          visits: 200
        }
      ]);
    });
  });

  describe('calculateStats', () => {
    test('debería calcular estadísticas descriptivas', () => {
      const mockData = [
        { value: 10 },
        { value: 20 },
        { value: 30 },
        { value: 40 },
        { value: 50 }
      ];

      const stats = analyticHelpers.calculateStats(mockData, 'value');

      expect(stats).toEqual(expect.objectContaining({
        count: 5,
        sum: 150,
        mean: 30,
        median: 30,
        min: 10,
        max: 50,
        variance: expect.any(Number),
        stdDev: expect.any(Number)
      }));
    });

    test('debería manejar array vacío', () => {
      const stats = analyticHelpers.calculateStats([], 'value');

      expect(stats).toEqual({
        count: 0,
        sum: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        variance: 0,
        stdDev: 0
      });
    });
  });

  describe('analyzeTrends', () => {
    test('debería analizar tendencias correctamente', () => {
      const mockData = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 110 },
        { date: '2024-01-03', value: 120 }
      ];

      const trends = analyticHelpers.analyzeTrends(mockData, 'date', 'value');

      expect(trends).toEqual(expect.objectContaining({
        trend: 'up',
        change: 20,
        changePercent: expect.any(Number)
      }));
    });

    test('debería identificar tendencia a la baja', () => {
      const mockData = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 90 },
        { date: '2024-01-03', value: 80 }
      ];

      const trends = analyticHelpers.analyzeTrends(mockData, 'date', 'value');

      expect(trends).toEqual(expect.objectContaining({
        trend: 'down',
        change: -20,
        changePercent: expect.any(Number)
      }));
    });

    test('debería manejar datos insuficientes', () => {
      const mockData = [
        { date: '2024-01-01', value: 100 }
      ];

      const trends = analyticHelpers.analyzeTrends(mockData, 'date', 'value');

      expect(trends).toEqual({
        trend: 'neutral',
        change: 0,
        changePercent: 0
      });
    });
  });

  describe('groupBy', () => {
    test('debería agrupar datos correctamente', () => {
      const mockData = [
        { category: 'A', value: 10 },
        { category: 'A', value: 20 },
        { category: 'B', value: 30 },
        { category: 'B', value: 40 }
      ];

      const result = analyticHelpers.groupBy(mockData, 'category', {
        metrics: ['value']
      });

      expect(result).toEqual([
        {
          key: 'A',
          count: 2,
          value: 30
        },
        {
          key: 'B',
          count: 2,
          value: 70
        }
      ]);
    });

    test('debería aplicar ordenamiento cuando se especifica', () => {
      const mockData = [
        { category: 'A', value: 10 },
        { category: 'B', value: 30 },
        { category: 'C', value: 20 }
      ];

      const result = analyticHelpers.groupBy(mockData, 'category', {
        metrics: ['value'],
        sortBy: 'value:desc'
      });

      expect(result[0].key).toBe('B');
      expect(result[2].key).toBe('A');
    });

    test('debería respetar el límite cuando se especifica', () => {
      const mockData = [
        { category: 'A', value: 10 },
        { category: 'B', value: 20 },
        { category: 'C', value: 30 }
      ];

      const result = analyticHelpers.groupBy(mockData, 'category', {
        metrics: ['value'],
        limit: 2
      });

      expect(result).toHaveLength(2);
    });
  });
});