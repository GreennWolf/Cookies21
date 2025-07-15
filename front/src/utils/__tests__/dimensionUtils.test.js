/**
 * @fileoverview Tests para utilidades de dimensiones
 */

import { parseStyleValue, formatStyleValue } from '../dimensionUtils.js';

describe('parseStyleValue', () => {
  // Caso "auto"
  test('debería manejar valor "auto"', () => {
    expect(parseStyleValue('auto')).toEqual({ value: '', unit: 'auto' });
  });

  // Caso "100px"
  test('debería parsear "100px"', () => {
    expect(parseStyleValue('100px')).toEqual({ value: 100, unit: 'px' });
  });

  // Caso "50%"
  test('debería parsear "50%"', () => {
    expect(parseStyleValue('50%')).toEqual({ value: 50, unit: '%' });
  });

  // Caso "100" (sin unidad)
  test('debería parsear "100" sin unidad como px', () => {
    expect(parseStyleValue('100')).toEqual({ value: 100, unit: 'px' });
  });

  // Caso número directo
  test('debería manejar número directo', () => {
    expect(parseStyleValue(100)).toEqual({ value: 100, unit: 'px' });
  });

  // Casos vacíos/null/undefined
  test('debería manejar valores vacíos', () => {
    expect(parseStyleValue(null)).toEqual({ value: '', unit: 'auto' });
    expect(parseStyleValue(undefined)).toEqual({ value: '', unit: 'auto' });
    expect(parseStyleValue('')).toEqual({ value: '', unit: 'auto' });
  });

  // Casos inválidos
  test('debería manejar valores inválidos', () => {
    expect(parseStyleValue('invalid')).toEqual({ value: '', unit: 'px' });
    expect(parseStyleValue('px100')).toEqual({ value: '', unit: 'px' });
  });

  // Casos decimales
  test('debería manejar valores decimales', () => {
    expect(parseStyleValue('10.5px')).toEqual({ value: 10.5, unit: 'px' });
    expect(parseStyleValue('33.33%')).toEqual({ value: 33.33, unit: '%' });
  });

  // Casos con espacios
  test('debería manejar espacios', () => {
    expect(parseStyleValue('  100px  ')).toEqual({ value: 100, unit: 'px' });
  });
});

describe('formatStyleValue', () => {
  test('debería formatear valores correctamente', () => {
    expect(formatStyleValue(100, 'px')).toBe('100px');
    expect(formatStyleValue(50, '%')).toBe('50%');
    expect(formatStyleValue('', 'auto')).toBe('auto');
    expect(formatStyleValue(null, 'px')).toBe('');
  });
});