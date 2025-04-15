// src/utils/analyticHelpers.js
const logger = require('./logger');
const dateHelpers = require('./dateHelpers');

class AnalyticHelpers {
  /**
   * Calcula porcentajes
   * @param {number} value - Valor a calcular
   * @param {number} total - Total
   * @param {Object} options - Opciones de cálculo
   * @returns {number} - Porcentaje calculado
   */
  calculatePercentages(value, total, options = {}) {
    const {
      decimals = 2,
      roundMethod = 'round'
    } = options;

    try {
      if (total === 0) return 0;
      const percentage = (value / total) * 100;
      return Math[roundMethod](percentage * Math.pow(10, decimals)) / Math.pow(10, decimals);
    } catch (error) {
      logger.error('Error calculating percentages:', error);
      return 0;
    }
  }

  /**
   * Agrega datos por período de tiempo
   * @param {Array} data - Datos a agregar
   * @param {string} dateField - Campo de fecha
   * @param {Object} options - Opciones de agregación
   * @returns {Array} - Datos agregados
   */
  aggregateByTime(data, dateField, options = {}) {
    const {
      interval = 'day',
      metrics = [],
      fillGaps = true,
      format = 'ISO'
    } = options;

    try {
      // Ordenar datos por fecha
      const sortedData = [...data].sort((a, b) =>
        new Date(a[dateField]) - new Date(b[dateField])
      );

      // Inicializar períodos
      const periods = new Map();

      // Agrupar datos por período
      sortedData.forEach(item => {
        const date = dateHelpers.parseDate(item[dateField]);
        const periodStart = dateHelpers.getStartOfPeriod(date, interval);
        const key = dateHelpers.formatDate(periodStart, format);

        if (!periods.has(key)) {
          periods.set(key, {
            period: key,
            count: 0,
            ...this._initializeMetrics(metrics)
          });
        }

        const period = periods.get(key);
        period.count++;
        this._aggregateMetrics(period, item, metrics);
      });

      // Rellenar gaps si es necesario
      if (fillGaps && sortedData.length > 0) {
        const startDate = dateHelpers.parseDate(sortedData[0][dateField]);
        const endDate = dateHelpers.parseDate(sortedData[sortedData.length - 1][dateField]);
        this._fillTimePeriods(periods, startDate, endDate, interval, format, metrics);
      }

      // Ordenar el resultado por fecha (clave ISO) de forma ascendente
      return Array.from(periods.values()).sort((a, b) => new Date(a.period) - new Date(b.period));
    } catch (error) {
      logger.error('Error aggregating by time:', error);
      return [];
    }
  }

  /**
   * Calcula estadísticas descriptivas
   * @param {Array} data - Datos para calcular
   * @param {string} field - Campo a analizar
   * @returns {Object} - Estadísticas calculadas
   */
  calculateStats(data, field) {
    try {
      const values = data.map(item => parseFloat(item[field])).filter(val => !isNaN(val));

      if (values.length === 0) {
        return {
          count: 0,
          sum: 0,
          mean: 0,
          median: 0,
          min: 0,
          max: 0,
          variance: 0,
          stdDev: 0
        };
      }

      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((acc, val) => acc + val, 0);
      const mean = sum / values.length;
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;

      return {
        count: values.length,
        sum: sum,
        mean: mean,
        median: this._calculateMedian(sorted),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        variance: variance,
        stdDev: Math.sqrt(variance)
      };
    } catch (error) {
      logger.error('Error calculating stats:', error);
      return null;
    }
  }

  /**
   * Agrupa datos por campo
   * @param {Array} data - Datos a agrupar
   * @param {string|Function} field - Campo o función de agrupación
   * @param {Object} options - Opciones de agrupación
   * @returns {Array} - Datos agrupados
   */
  groupBy(data, field, options = {}) {
    const {
      metrics = [],
      sortBy,
      limit
    } = options;

    try {
      // Crear grupos
      const groups = new Map();

      data.forEach(item => {
        const key = typeof field === 'function' ? field(item) : item[field];

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            count: 0,
            ...this._initializeMetrics(metrics)
          });
        }

        const group = groups.get(key);
        group.count++;
        this._aggregateMetrics(group, item, metrics);
      });

      // Convertir a array
      let result = Array.from(groups.values());

      // Ordenar si es necesario
      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        result.sort((a, b) => {
          return direction === 'desc'
            ? b[field] - a[field]
            : a[field] - b[field];
        });
      }

      // Limitar resultados si es necesario
      if (limit) {
        result = result.slice(0, limit);
      }

      return result;
    } catch (error) {
      logger.error('Error grouping data:', error);
      return [];
    }
  }

  /**
   * Calcula tendencias
   * @param {Array} data - Datos históricos
   * @param {string} dateField - Campo de fecha
   * @param {string} valueField - Campo de valor
   * @returns {Object} - Análisis de tendencias
   */
  analyzeTrends(data, dateField, valueField) {
    try {
      const sortedData = [...data].sort((a, b) =>
        new Date(a[dateField]) - new Date(b[dateField])
      );

      if (sortedData.length < 2) {
        return {
          trend: 'neutral',
          change: 0,
          changePercent: 0
        };
      }

      // Calcular cambios
      const firstValue = parseFloat(sortedData[0][valueField]);
      const lastValue = parseFloat(sortedData[sortedData.length - 1][valueField]);
      const change = lastValue - firstValue;
      const changePercent = this.calculatePercentages(change, firstValue);

      // Determinar tendencia
      let trend = 'neutral';
      if (changePercent > 5) trend = 'up';
      if (changePercent < -5) trend = 'down';

      return {
        trend,
        change,
        changePercent
      };
    } catch (error) {
      logger.error('Error analyzing trends:', error);
      return null;
    }
  }

  // Métodos privados

  /**
   * Inicializa métricas
   * @private
   */
  _initializeMetrics(metrics) {
    const result = {};
    metrics.forEach(metric => {
      if (typeof metric === 'string') {
        result[metric] = 0;
      } else if (metric.type === 'avg') {
        result[metric.name] = {
          sum: 0,
          count: 0
        };
      }
    });
    return result;
  }

  /**
   * Agrega métricas
   * @private
   */
  _aggregateMetrics(group, item, metrics) {
    metrics.forEach(metric => {
      if (typeof metric === 'string') {
        group[metric] += parseFloat(item[metric]) || 0;
      } else if (metric.type === 'avg') {
        const value = parseFloat(item[metric.field]) || 0;
        group[metric.name].sum += value;
        group[metric.name].count++;
        group[metric.name].avg = group[metric.name].sum / group[metric.name].count;
      }
    });
  }

  /**
   * Rellena períodos faltantes
   * @private
   */
  _fillTimePeriods(periods, startDate, endDate, interval, format, metrics) {
    let currentDate = dateHelpers.getStartOfPeriod(startDate, interval);
    const end = dateHelpers.getEndOfPeriod(endDate, interval);

    while (currentDate <= end) {
      const key = dateHelpers.formatDate(currentDate, format);

      if (!periods.has(key)) {
        periods.set(key, {
          period: key,
          count: 0,
          ...this._initializeMetrics(metrics)
        });
      }

      currentDate = dateHelpers.addTime(currentDate, 1, interval);
    }
  }

  /**
   * Calcula la mediana
   * @private
   */
  _calculateMedian(sorted) {
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
  }
}

module.exports = new AnalyticHelpers();
