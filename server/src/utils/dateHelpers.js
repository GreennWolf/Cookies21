const logger = require('./logger');

class DateHelpers {
  constructor() {
    // Formatos de fecha predefinidos
    this.DATE_FORMATS = {
      ISO: 'ISO',
      SHORT: 'SHORT',
      LONG: 'LONG',
      TIMESTAMP: 'TIMESTAMP'
    };

    // Nombres de meses y días
    this.MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    this.DAYS = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday'
    ];
  }

  /**
   * Formatea una fecha según el formato especificado
   * @param {Date|string|number} date - Fecha a formatear
   * @param {string} format - Formato deseado
   * @param {Object} options - Opciones adicionales
   * @returns {string} - Fecha formateada
   */
  formatDate(date, format = this.DATE_FORMATS.ISO, options = {}) {
    try {
      const dateObj = this.parseDate(date);
      
      switch (format) {
        case this.DATE_FORMATS.ISO:
          return dateObj.toISOString();
        
        case this.DATE_FORMATS.SHORT:
          return dateObj.toLocaleDateString(options.locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
        
        case this.DATE_FORMATS.LONG:
          return dateObj.toLocaleDateString(options.locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          });
        
        case this.DATE_FORMATS.TIMESTAMP:
          return dateObj.getTime().toString();
        
        default:
          return dateObj.toISOString();
      }
    } catch (error) {
      logger.error('Error formatting date:', error);
      return '';
    }
  }

  /**
   * Parsea una fecha a objeto Date
   * @param {Date|string|number} date - Fecha a parsear
   * @returns {Date} - Objeto Date
   */
  parseDate(date) {
    try {
      if (date instanceof Date) {
        return date;
      }

      if (typeof date === 'number') {
        return new Date(date);
      }

      if (typeof date === 'string') {
        // Intentar múltiples formatos
        const timestamp = Date.parse(date);
        if (!isNaN(timestamp)) {
          return new Date(timestamp);
        }

        // Intentar formato ISO
        if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
          return new Date(date);
        }

        throw new Error('Invalid date format');
      }

      throw new Error('Invalid date type');
    } catch (error) {
      logger.error('Error parsing date:', error);
      return new Date();
    }
  }

  /**
   * Calcula la diferencia entre dos fechas
   * @param {Date} date1 - Primera fecha
   * @param {Date} date2 - Segunda fecha
   * @param {string} unit - Unidad de tiempo
   * @returns {number} - Diferencia en la unidad especificada
   */
  getDateDiff(date1, date2, unit = 'days') {
    try {
      const d1 = this.parseDate(date1);
      const d2 = this.parseDate(date2);
      const diff = d2.getTime() - d1.getTime();

      switch (unit.toLowerCase()) {
        case 'years':
          return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
        case 'months':
          return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
        case 'days':
          return Math.floor(diff / (1000 * 60 * 60 * 24));
        case 'hours':
          return Math.floor(diff / (1000 * 60 * 60));
        case 'minutes':
          return Math.floor(diff / (1000 * 60));
        case 'seconds':
          return Math.floor(diff / 1000);
        default:
          return diff;
      }
    } catch (error) {
      logger.error('Error calculating date difference:', error);
      return 0;
    }
  }

  /**
   * Añade tiempo a una fecha
   * @param {Date} date - Fecha base
   * @param {number} amount - Cantidad a añadir
   * @param {string} unit - Unidad de tiempo
   * @returns {Date} - Nueva fecha
   */
  addTime(date, amount, unit = 'days') {
    try {
      const dateObj = this.parseDate(date);
      const newDate = new Date(dateObj);

      switch (unit.toLowerCase()) {
        case 'years':
          newDate.setFullYear(dateObj.getFullYear() + amount);
          break;
        case 'months':
          newDate.setMonth(dateObj.getMonth() + amount);
          break;
        case 'days':
          newDate.setDate(dateObj.getDate() + amount);
          break;
        case 'hours':
          newDate.setHours(dateObj.getHours() + amount);
          break;
        case 'minutes':
          newDate.setMinutes(dateObj.getMinutes() + amount);
          break;
        case 'seconds':
          newDate.setSeconds(dateObj.getSeconds() + amount);
          break;
      }

      return newDate;
    } catch (error) {
      logger.error('Error adding time:', error);
      return date;
    }
  }

  /**
   * Verifica si una fecha está entre otras dos
   * @param {Date} date - Fecha a verificar
   * @param {Date} start - Fecha de inicio
   * @param {Date} end - Fecha de fin
   * @returns {boolean} - true si está en el rango
   */
  isDateBetween(date, start, end) {
    try {
      const d = this.parseDate(date).getTime();
      const s = this.parseDate(start).getTime();
      const e = this.parseDate(end).getTime();
      return d >= s && d <= e;
    } catch (error) {
      logger.error('Error checking date range:', error);
      return false;
    }
  }

  /**
   * Obtiene el inicio del período especificado
   * @param {Date} date - Fecha base
   * @param {string} period - Período (day, week, month, year)
   * @returns {Date} - Fecha de inicio del período
   */
  getStartOfPeriod(date, period = 'day') {
    try {
      const dateObj = this.parseDate(date);
      const newDate = new Date(dateObj);

      switch (period.toLowerCase()) {
        case 'day':
          newDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          const day = dateObj.getDay();
          newDate.setDate(dateObj.getDate() - day);
          newDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          newDate.setDate(1);
          newDate.setHours(0, 0, 0, 0);
          break;
        case 'year':
          newDate.setMonth(0, 1);
          newDate.setHours(0, 0, 0, 0);
          break;
      }

      return newDate;
    } catch (error) {
      logger.error('Error getting start of period:', error);
      return date;
    }
  }

  /**
   * Obtiene el fin del período especificado
   * @param {Date} date - Fecha base
   * @param {string} period - Período (day, week, month, year)
   * @returns {Date} - Fecha de fin del período
   */
  getEndOfPeriod(date, period = 'day') {
    try {
      const dateObj = this.parseDate(date);
      const newDate = new Date(dateObj);

      switch (period.toLowerCase()) {
        case 'day':
          newDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          const day = dateObj.getDay();
          newDate.setDate(dateObj.getDate() + (6 - day));
          newDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1, 0);
          newDate.setHours(23, 59, 59, 999);
          break;
        case 'year':
          newDate.setMonth(11, 31);
          newDate.setHours(23, 59, 59, 999);
          break;
      }

      return newDate;
    } catch (error) {
      logger.error('Error getting end of period:', error);
      return date;
    }
  }

  /**
   * Calcula la edad a partir de una fecha
   * @param {Date} birthDate - Fecha de nacimiento
   * @returns {number} - Edad en años
   */
  calculateAge(birthDate) {
    try {
      const birth = this.parseDate(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      logger.error('Error calculating age:', error);
      return 0;
    }
  }

  /**
   * Valida una fecha
   * @param {Date} date - Fecha a validar
   * @returns {boolean} - true si es válida
   */
  isValidDate(date) {
    try {
      const d = this.parseDate(date);
      return d instanceof Date && !isNaN(d);
    } catch (error) {
      return false;
    }
  }
}

module.exports = new DateHelpers();