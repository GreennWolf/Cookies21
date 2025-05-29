/* /src/components/common/DateRangePicker.jsx */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FiCalendar } from 'react-icons/fi';

const DateRangePicker = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const pickerRef = useRef(null);

  // Formatea la fecha para mostrar
  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Formatea la fecha para el input type="date"
  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Presets comunes
  const presets = [
    { label: 'Últimos 7 días', days: 7 },
    { label: 'Últimos 30 días', days: 30 },
    { label: 'Últimos 90 días', days: 90 },
    { label: 'Año actual', days: 'year' }
  ];

  // Aplica un preset
  const applyPreset = (preset) => {
    const end = new Date();
    let start;

    if (preset.days === 'year') {
      start = new Date(end.getFullYear(), 0, 1); // 1 de enero del año actual
    } else {
      start = new Date();
      start.setDate(end.getDate() - preset.days);
    }

    setLocalStartDate(start);
    setLocalEndDate(end);
  };

  // Cierra el selector al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Aplica los cambios
  const applyChanges = () => {
    onChange({ startDate: localStartDate, endDate: localEndDate });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        className="flex items-center px-3 py-2 border rounded-md bg-white hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiCalendar className="mr-2 text-gray-500" />
        <span className="text-gray-700">
          {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-10 mt-2 w-72 bg-white rounded-md shadow-lg p-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicial</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md"
                value={formatDateForInput(localStartDate)}
                onChange={(e) => setLocalStartDate(new Date(e.target.value))}
                max={formatDateForInput(localEndDate)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha final</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md"
                value={formatDateForInput(localEndDate)}
                onChange={(e) => setLocalEndDate(new Date(e.target.value))}
                min={formatDateForInput(localStartDate)}
                max={formatDateForInput(new Date())}
              />
            </div>
            <div className="border-t pt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Presets rápidos:</p>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1 text-sm bg-[#235C88] text-white rounded hover:bg-[#1e4a6b]"
                onClick={applyChanges}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DateRangePicker.propTypes = {
  startDate: PropTypes.instanceOf(Date).isRequired,
  endDate: PropTypes.instanceOf(Date).isRequired,
  onChange: PropTypes.func.isRequired
};

export default DateRangePicker;