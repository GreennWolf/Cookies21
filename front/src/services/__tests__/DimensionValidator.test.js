/**
 * @fileoverview Tests para DimensionValidator
 */

import { DimensionValidator } from '../DimensionValidator.js';

describe('DimensionValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new DimensionValidator();
  });

  describe('constructor', () => {
    test('debería inicializar con reglas por defecto', () => {
      expect(validator.DEFAULT_RULES.percentage.min).toBe(10);
      expect(validator.DEFAULT_RULES.percentage.max).toBe(100);
      expect(validator.DEFAULT_RULES.pixels.min).toBe(10);
    });

    test('debería tener reglas específicas por componente', () => {
      expect(validator.COMPONENT_RULES.button.width.minPx).toBe(80);
      expect(validator.COMPONENT_RULES.text.width.minPx).toBe(40);
      expect(validator.COMPONENT_RULES.image.width.minPx).toBe(50);
    });
  });

  describe('getRules', () => {
    test('debería obtener reglas para button width', () => {
      const rules = validator.getRules('button', 'width');
      expect(rules.minPx).toBe(80);
      expect(rules.minPercent).toBe(5);
      expect(rules.maxPercent).toBe(100);
      expect(rules.componentType).toBe('button');
      expect(rules.hasSpecificRules).toBe(true);
    });

    test('debería normalizar propiedades (minWidth → width)', () => {
      const rules = validator.getRules('button', 'minWidth');
      expect(rules.property).toBe('width');
      expect(rules.minPx).toBe(80);
    });

    test('debería usar reglas por defecto para componente desconocido', () => {
      const rules = validator.getRules('unknown', 'width');
      expect(rules.minPx).toBe(30); // De default rules
      expect(rules.hasSpecificRules).toBe(false);
    });

    test('debería manejar parámetros inválidos', () => {
      const rules = validator.getRules('', '');
      expect(rules.componentType).toBe('default');
      expect(rules.property).toBe('width');
    });

    test('debería detectar propiedades de height', () => {
      const rules = validator.getRules('button', 'height');
      expect(rules.property).toBe('height');
      expect(rules.minPx).toBe(30);
    });
  });

  describe('validate', () => {
    describe('límites de porcentaje', () => {
      test('debería aplicar mínimo de porcentaje', () => {
        expect(validator.validate(5, '%', 'button', 'width')).toBe('5%'); // 5% >= minPercent (5%)
        expect(validator.validate(3, '%', 'button', 'width')).toBe('5%'); // 3% → 5% (ajustado)
      });

      test('debería aplicar máximo de porcentaje', () => {
        expect(validator.validate(100, '%', 'button', 'width')).toBe('100%');
        expect(validator.validate(150, '%', 'button', 'width')).toBe('100%'); // 150% → 100%
      });

      test('debería mantener valores válidos sin cambios', () => {
        expect(validator.validate(50, '%', 'button', 'width')).toBe('50%');
        expect(validator.validate(25, '%', 'text', 'height')).toBe('25%');
      });
    });

    describe('límites de píxeles', () => {
      test('debería aplicar mínimo de píxeles', () => {
        expect(validator.validate(80, 'px', 'button', 'width')).toBe('80px');
        expect(validator.validate(50, 'px', 'button', 'width')).toBe('80px'); // 50px → 80px
      });

      test('debería aplicar máximo de píxeles si está definido', () => {
        // Note: button height tiene maxPercent pero no maxPx definido
        expect(validator.validate(1000, 'px', 'button', 'width')).toBe('1000px'); // Sin máximo px
      });

      test('debería mantener valores válidos', () => {
        expect(validator.validate(100, 'px', 'button', 'width')).toBe('100px');
        expect(validator.validate(200, 'px', 'text', 'width')).toBe('200px');
      });
    });

    describe('casos especiales', () => {
      test('debería manejar valores no numéricos', () => {
        expect(validator.validate('auto', 'px', 'button', 'width')).toBe('autopx');
        expect(validator.validate('invalid', '%', 'text', 'width')).toBe('invalid%');
      });

      test('debería manejar valores decimales', () => {
        expect(validator.validate(12.5, '%', 'button', 'width')).toBe('12.5%');
        expect(validator.validate(85.7, 'px', 'text', 'width')).toBe('85.7px');
      });

      test('debería manejar componentes específicos', () => {
        // Language button tiene reglas específicas
        expect(validator.validate(100, 'px', 'language-button', 'width')).toBe('120px'); // 100 → 120 (mínimo)
        expect(validator.validate(130, 'px', 'language-button', 'width')).toBe('130px'); // Válido
      });

      test('debería manejar height con límites específicos', () => {
        expect(validator.validate(60, '%', 'button', 'height')).toBe('50%'); // 60% → 50% (máximo)
        expect(validator.validate(40, '%', 'button', 'height')).toBe('40%'); // Válido
      });
    });

    describe('diferentes tipos de componente', () => {
      test('container debería tener sus propios límites', () => {
        expect(validator.validate(50, 'px', 'container', 'width')).toBe('100px'); // 50px → 100px (mínimo)
        expect(validator.validate(5, '%', 'container', 'width')).toBe('10%'); // 5% → 10% (mínimo)
      });

      test('image debería tener sus límites', () => {
        expect(validator.validate(30, 'px', 'image', 'width')).toBe('50px'); // 30px → 50px (mínimo)
        expect(validator.validate(3, '%', 'image', 'height')).toBe('5%'); // 3% → 5% (mínimo)
      });
    });
  });
});