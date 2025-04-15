
// tests/unit/utils/objectHelpers.test.js
const objectHelpers = require('../../../utils/objectHelpers');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
jest.mock('../../../utils/logger');

describe('ObjectHelpers', () => {
  describe('getDifferences', () => {
    test('debería detectar diferencias entre objetos', () => {
      const oldObj = { a: 1, b: 2, c: { d: 3 } };
      const newObj = { a: 1, b: 3, c: { d: 4 } };

      const differences = objectHelpers.getDifferences(oldObj, newObj);
      expect(differences).toContainEqual(
        expect.objectContaining({
          path: 'b',
          oldValue: 2,
          newValue: 3
        })
      );
    });

    test('debería respetar opciones de comparación', () => {
      const oldObj = { arr: [1, 2, 3] };
      const newObj = { arr: [3, 2, 1] };

      const withOrder = objectHelpers.getDifferences(oldObj, newObj, { ignoreArrayOrder: false });
      const withoutOrder = objectHelpers.getDifferences(oldObj, newObj, { ignoreArrayOrder: true });

      expect(withOrder.length).toBeGreaterThan(0);
      expect(withoutOrder.length).toBe(0);
    });
  });

  describe('deepMerge', () => {
    test('debería fusionar objetos profundamente', () => {
      const obj1 = { a: { b: 1 }, c: 2 };
      const obj2 = { a: { d: 3 }, e: 4 };

      const merged = objectHelpers.deepMerge(obj1, obj2);
      expect(merged).toEqual({
        a: { b: 1, d: 3 },
        c: 2,
        e: 4
      });
    });
  });

  describe('deepClone', () => {
    test('debería clonar objetos profundamente', () => {
      const original = {
        date: new Date(),
        regex: /test/,
        nested: { array: [1, 2, { test: true }] }
      };

      const clone = objectHelpers.deepClone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
      expect(clone.nested).not.toBe(original.nested);
    });
  });
});