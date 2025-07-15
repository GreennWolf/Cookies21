/**
 * @fileoverview Tests para UnitConverter
 */

import { UnitConverter } from '../UnitConverter.js';

// Mock de ReferenceResolver
const mockReferenceResolver = {
  getReference: jest.fn()
};

describe('UnitConverter', () => {
  let converter;

  beforeEach(() => {
    converter = new UnitConverter(mockReferenceResolver);
  });

  describe('constructor', () => {
    test('debería requerir ReferenceResolver', () => {
      expect(() => new UnitConverter()).toThrow('UnitConverter requiere una instancia de ReferenceResolver');
    });

    test('debería inicializar correctamente con ReferenceResolver', () => {
      expect(converter.referenceResolver).toBe(mockReferenceResolver);
      expect(converter.config.fallbackSize).toBe(800);
    });
  });

  describe('parseValue', () => {
    test('debería parsear valores válidos', () => {
      expect(converter.parseValue('100px')).toEqual({ value: 100, unit: 'px' });
      expect(converter.parseValue('50%')).toEqual({ value: 50, unit: '%' });
      expect(converter.parseValue(75)).toEqual({ value: 75, unit: 'px' });
    });

    test('debería manejar valores auto como 0px', () => {
      expect(converter.parseValue('auto')).toEqual({ value: 0, unit: 'px' });
    });

    test('debería manejar valores inválidos', () => {
      expect(converter.parseValue('invalid')).toEqual({ value: 0, unit: 'px' });
      expect(converter.parseValue('')).toEqual({ value: 0, unit: 'px' });
    });
  });

  describe('convertPxToPercent', () => {
    test('debería convertir píxeles a porcentaje correctamente', () => {
      expect(converter.convertPxToPercent(100, 800)).toBe(12.5);
      expect(converter.convertPxToPercent(400, 800)).toBe(50.0);
      expect(converter.convertPxToPercent(800, 800)).toBe(100.0);
    });

    test('debería manejar referenceSize = 0', () => {
      expect(converter.convertPxToPercent(100, 0)).toBe(0);
    });

    test('debería usar fallback para referenceSize inválido', () => {
      // Con fallback de 800px, 100px = 12.5%
      expect(converter.convertPxToPercent(100, null)).toBe(12.5);
      expect(converter.convertPxToPercent(100, 'invalid')).toBe(12.5);
    });

    test('debería redondear a 1 decimal', () => {
      expect(converter.convertPxToPercent(100, 333)).toBe(30.0); // 30.030... → 30.0
    });
  });

  describe('convertPercentToPx', () => {
    test('debería convertir porcentaje a píxeles correctamente', () => {
      expect(converter.convertPercentToPx(50, 800)).toBe(400);
      expect(converter.convertPercentToPx(25, 800)).toBe(200);
      expect(converter.convertPercentToPx(100, 800)).toBe(800);
    });

    test('debería redondear a entero', () => {
      expect(converter.convertPercentToPx(33.33, 800)).toBe(267); // 266.64 → 267
    });

    test('debería manejar referenceSize = 0', () => {
      expect(converter.convertPercentToPx(50, 0)).toBe(0);
    });

    test('debería usar fallback para referenceSize inválido', () => {
      // Con fallback de 800px, 50% = 400px
      expect(converter.convertPercentToPx(50, null)).toBe(400);
      expect(converter.convertPercentToPx(50, 'invalid')).toBe(400);
    });
  });

  describe('convert', () => {
    const mockReference = { size: 800, type: 'canvas' };

    test('debería retornar mismo valor para misma unidad', () => {
      expect(converter.convert('100px', 'px', 'px', mockReference)).toBe(100);
      expect(converter.convert('50%', '%', '%', mockReference)).toBe(50);
    });

    test('debería convertir px a %', () => {
      expect(converter.convert('100px', 'px', '%', mockReference)).toBe(12.5);
      expect(converter.convert(400, 'px', '%', mockReference)).toBe(50.0);
    });

    test('debería convertir % a px', () => {
      expect(converter.convert('50%', '%', 'px', mockReference)).toBe(400);
      expect(converter.convert(25, '%', 'px', mockReference)).toBe(200);
    });

    test('debería retornar 0 para valor 0', () => {
      expect(converter.convert(0, 'px', '%', mockReference)).toBe(0);
      expect(converter.convert('0%', '%', 'px', mockReference)).toBe(0);
    });

    test('debería manejar referencia inválida', () => {
      expect(converter.convert('100px', 'px', '%', null)).toBe(100);
      expect(converter.convert('100px', 'px', '%', {})).toBe(100);
    });

    test('debería manejar conversiones no soportadas', () => {
      expect(converter.convert('100px', 'px', 'em', mockReference)).toBe(100);
      expect(converter.convert('100px', 'rem', 'px', mockReference)).toBe(100);
    });
  });
});