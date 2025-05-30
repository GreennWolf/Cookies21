const logger = require('./logger');

class ObjectHelpers {
  /**
   * Encuentra las diferencias entre dos objetos
   * @param {Object} oldObj - Objeto original
   * @param {Object} newObj - Objeto nuevo
   * @param {Object} options - Opciones de comparación
   * @returns {Array} - Array de diferencias encontradas
   */
  getDifferences(oldObj, newObj, options = {}) {
    const {
      ignoredPaths = [],
      maxDepth = 10,
      compareArrays = true,
      ignoreArrayOrder = false,
      ignoreUndefined = true
    } = options;

    const differences = [];

    try {
      this._compareObjects(
        oldObj,
        newObj,
        [],
        differences,
        {
          ignoredPaths,
          maxDepth,
          compareArrays,
          ignoreArrayOrder,
          ignoreUndefined,
          currentDepth: 0
        }
      );

      return differences;
    } catch (error) {
      logger.error('Error getting differences:', error);
      return [];
    }
  }

  /**
   * Merge profundo de objetos
   * @param {...Object} objects - Objetos a mergear
   * @returns {Object} - Objeto resultante
   */
  deepMerge(...objects) {
    try {
      return objects.reduce((result, current) => {
        if (current === null || typeof current !== 'object') {
          return result;
        }

        Object.keys(current).forEach(key => {
          const resultValue = result[key];
          const currentValue = current[key];

          if (Array.isArray(resultValue) && Array.isArray(currentValue)) {
            result[key] = resultValue.concat(...currentValue);
          } else if (
            resultValue && 
            typeof resultValue === 'object' && 
            currentValue && 
            typeof currentValue === 'object'
          ) {
            result[key] = this.deepMerge(resultValue, currentValue);
          } else {
            result[key] = currentValue;
          }
        });

        return result;
      }, {});
    } catch (error) {
      logger.error('Error in deep merge:', error);
      return {};
    }
  }

  /**
   * Copia profunda de un objeto
   * @param {Object} obj - Objeto a copiar
   * @returns {Object} - Copia del objeto
   */
  deepClone(obj) {
    try {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => this.deepClone(item));
      }

      if (obj instanceof Date) {
        return new Date(obj);
      }

      if (obj instanceof RegExp) {
        return new RegExp(obj);
      }

      const clone = {};
      Object.keys(obj).forEach(key => {
        clone[key] = this.deepClone(obj[key]);
      });

      return clone;
    } catch (error) {
      logger.error('Error in deep clone:', error);
      return {};
    }
  }

  /**
   * Obtener valor por path
   * @param {Object} obj - Objeto fuente
   * @param {string} path - Path al valor
   * @param {*} defaultValue - Valor por defecto
   * @returns {*} - Valor encontrado o default
   */
  get(obj, path, defaultValue = undefined) {
    try {
      const value = path
        .split('.')
        .reduce((current, key) => 
          current && current[key] !== undefined ? current[key] : undefined,
          obj
        );

      return value !== undefined ? value : defaultValue;
    } catch (error) {
      logger.error('Error getting value by path:', error);
      return defaultValue;
    }
  }

  /**
   * Establecer valor por path
   * @param {Object} obj - Objeto a modificar
   * @param {string} path - Path donde establecer el valor
   * @param {*} value - Valor a establecer
   * @returns {Object} - Objeto modificado
   */
  set(obj, path, value) {
    try {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((current, key) => {
        if (!(key in current)) {
          current[key] = {};
        }
        return current[key];
      }, obj);

      target[lastKey] = value;
      return obj;
    } catch (error) {
      logger.error('Error setting value by path:', error);
      return obj;
    }
  }

  /**
   * Limpia valores nulos o indefinidos de un objeto
   * @param {Object} obj - Objeto a limpiar
   * @param {Object} options - Opciones de limpieza
   * @returns {Object} - Objeto limpio
   */
  clean(obj, options = {}) {
    const {
      removeNull = true,
      removeUndefined = true,
      removeEmptyArrays = false,
      removeEmptyObjects = false
    } = options;

    try {
      const result = {};

      Object.entries(obj).forEach(([key, value]) => {
        // Validar si debemos omitir el valor
        if (
          (removeNull && value === null) ||
          (removeUndefined && value === undefined) ||
          (removeEmptyArrays && Array.isArray(value) && value.length === 0) ||
          (removeEmptyObjects && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
        ) {
          return;
        }

        // Recursión para objetos anidados
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.clean(value, options);
        } else {
          result[key] = value;
        }
      });

      return result;
    } catch (error) {
      logger.error('Error cleaning object:', error);
      return obj;
    }
  }

  /**
   * Compara si dos objetos son iguales
   * @param {Object} obj1 - Primer objeto
   * @param {Object} obj2 - Segundo objeto
   * @param {Object} options - Opciones de comparación
   * @returns {boolean} - true si son iguales
   */
  isEqual(obj1, obj2, options = {}) {
    try {
      return this.getDifferences(obj1, obj2, options).length === 0;
    } catch (error) {
      logger.error('Error comparing objects:', error);
      return false;
    }
  }

  // Métodos privados

  /**
   * Compara dos objetos recursivamente
   * @private
   */
  _compareObjects(oldObj, newObj, path, differences, options) {
    const {
      ignoredPaths,
      maxDepth,
      compareArrays,
      ignoreArrayOrder,
      ignoreUndefined,
      currentDepth
    } = options;

    // Verificar profundidad máxima
    if (currentDepth > maxDepth) {
      return;
    }

    // Verificar paths ignorados
    const currentPath = path.join('.');
    if (ignoredPaths.includes(currentPath)) {
      return;
    }

    // Comparar valores primitivos
    if (
      oldObj === null ||
      newObj === null ||
      typeof oldObj !== 'object' ||
      typeof newObj !== 'object'
    ) {
      if (oldObj !== newObj) {
        differences.push({
          path: currentPath,
          oldValue: oldObj,
          newValue: newObj,
          type: 'modified'
        });
      }
      return;
    }

    // Manejar arrays
    if (Array.isArray(oldObj) && Array.isArray(newObj)) {
      if (compareArrays) {
        this._compareArrays(
          oldObj,
          newObj,
          path,
          differences,
          {
            ...options,
            currentDepth: currentDepth + 1,
            ignoreOrder: ignoreArrayOrder
          }
        );
      }
      return;
    }

    // Obtener todas las claves
    const allKeys = new Set([
      ...Object.keys(oldObj),
      ...Object.keys(newObj)
    ]);

    // Comparar cada propiedad
    for (const key of allKeys) {
      const oldValue = oldObj[key];
      const newValue = newObj[key];
      const newPath = [...path, key];

      // Manejar valores indefinidos
      if (ignoreUndefined && (oldValue === undefined || newValue === undefined)) {
        continue;
      }

      // Recursión para objetos anidados
      this._compareObjects(
        oldValue,
        newValue,
        newPath,
        differences,
        {
          ...options,
          currentDepth: currentDepth + 1
        }
      );
    }
  }

  /**
   * Compara dos arrays
   * @private
   */
  _compareArrays(oldArray, newArray, path, differences, options) {
    const { ignoreOrder } = options;

    if (ignoreOrder) {
      // Ordenar arrays si el orden no importa
      const sortedOld = [...oldArray].sort();
      const sortedNew = [...newArray].sort();
      
      if (JSON.stringify(sortedOld) !== JSON.stringify(sortedNew)) {
        differences.push({
          path: path.join('.'),
          oldValue: oldArray,
          newValue: newArray,
          type: 'array_modified'
        });
      }
    } else {
      // Comparar arrays elemento por elemento
      const maxLength = Math.max(oldArray.length, newArray.length);
      
      for (let i = 0; i < maxLength; i++) {
        const newPath = [...path, i];
        
        this._compareObjects(
          oldArray[i],
          newArray[i],
          newPath,
          differences,
          options
        );
      }
    }
  }
}

module.exports = new ObjectHelpers();