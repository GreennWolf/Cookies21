import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaCalendarAlt, FaExchangeAlt } from 'react-icons/fa';

const DateRangePicker = ({ dateRange, onDateRangeChange }) => {
  const [startDate, setStartDate] = useState(formatDateForInput(dateRange.startDate));
  const [endDate, setEndDate] = useState(formatDateForInput(dateRange.endDate));
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Actualizar los estados locales cuando cambian las props
  useEffect(() => {
    setStartDate(formatDateForInput(dateRange.startDate));
    setEndDate(formatDateForInput(dateRange.endDate));
  }, [dateRange.startDate, dateRange.endDate]);

  // Función para formatear fecha para input
  function formatDateForInput(date) {
    if (!(date instanceof Date) || isNaN(date)) {
      return '';
    }
    return date.toISOString().split('T')[0];
  }

  // Función para formatear fecha para display
  function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    
    // Validación: la fecha de inicio debe ser anterior a la fecha de fin
    const start = new Date(newStartDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setIsValid(false);
      setErrorMessage('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }
    
    setIsValid(true);
    setErrorMessage('');
    
    onDateRangeChange({
      startDate: new Date(newStartDate),
      endDate: dateRange.endDate
    });
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    
    // Validación: la fecha de fin debe ser posterior a la fecha de inicio
    const start = new Date(startDate);
    const end = new Date(newEndDate);
    
    if (end < start) {
      setIsValid(false);
      setErrorMessage('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }
    
    setIsValid(true);
    setErrorMessage('');
    
    onDateRangeChange({
      startDate: dateRange.startDate,
      endDate: new Date(newEndDate)
    });
  };

  const handlePresetRange = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    setStartDate(formatDateForInput(startDate));
    setEndDate(formatDateForInput(endDate));
    setIsValid(true);
    setErrorMessage('');
    
    onDateRangeChange({ startDate, endDate });
  };

  // Función para establecer rangos personalizados predefinidos
  const handlePredefinedRange = (range) => {
    let startDate, endDate;
    const now = new Date();
    
    switch(range) {
      case 'thisMonth': {
        // Primer día del mes actual
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        // Último día del mes actual
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      }
      case 'lastMonth': {
        // Primer día del mes anterior
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // Último día del mes anterior
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      }
      case 'thisYear': {
        // Primer día del año actual
        startDate = new Date(now.getFullYear(), 0, 1);
        // Hoy
        endDate = now;
        break;
      }
      case 'lastYear': {
        // Primer día del año anterior
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        // Último día del año anterior
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      }
      default:
        return;
    }
    
    setStartDate(formatDateForInput(startDate));
    setEndDate(formatDateForInput(endDate));
    setIsValid(true);
    setErrorMessage('');
    
    onDateRangeChange({ startDate, endDate });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex items-center bg-white rounded shadow-sm">
          <div className="absolute left-3 text-gray-400">
            <FaCalendarAlt />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className={`border rounded-l pl-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isValid ? 'border-red-500' : 'border-gray-300'}`}
            aria-label="Fecha de inicio"
          />
          <div className="px-2 text-gray-400">
            <FaExchangeAlt />
          </div>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className={`border rounded-r pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isValid ? 'border-red-500' : 'border-gray-300'}`}
            aria-label="Fecha de fin"
          />
        </div>
        
        {!isValid && (
          <p className="text-red-500 text-xs italic">{errorMessage}</p>
        )}
        
        <div className="text-sm text-gray-600 hidden sm:block">
          <span className="font-medium">Rango actual:</span> {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <div className="space-x-1">
          <button
            onClick={() => handlePresetRange(7)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Últimos 7 días"
          >
            7 días
          </button>
          <button
            onClick={() => handlePresetRange(30)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Últimos 30 días"
          >
            30 días
          </button>
          <button
            onClick={() => handlePresetRange(90)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Últimos 90 días"
          >
            90 días
          </button>
        </div>
        
        <div className="space-x-1">
          <button
            onClick={() => handlePredefinedRange('thisMonth')}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Este mes"
          >
            Este mes
          </button>
          <button
            onClick={() => handlePredefinedRange('lastMonth')}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Mes anterior"
          >
            Mes anterior
          </button>
          <button
            onClick={() => handlePredefinedRange('thisYear')}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Este año"
          >
            Este año
          </button>
        </div>
      </div>
    </div>
  );
};

DateRangePicker.propTypes = {
  dateRange: PropTypes.shape({
    startDate: PropTypes.instanceOf(Date).isRequired,
    endDate: PropTypes.instanceOf(Date).isRequired
  }).isRequired,
  onDateRangeChange: PropTypes.func.isRequired
};

export default DateRangePicker;