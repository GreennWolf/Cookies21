import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomDomainSelector = ({ domains, selectedDomain, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (domain) => {
    onSelect(domain);
    setIsOpen(false);
  };

  return (
    <div className="mb-4" ref={dropdownRef}>
      <label className="block text-gray-700 mb-2">Selecciona un Dominio:</label>
      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
        >
          <span className={selectedDomain ? 'text-gray-900' : 'text-gray-500'}>
            {selectedDomain ? selectedDomain.domain : '-- Selecciona un dominio --'}
          </span>
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
            <div 
              className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f1f5f9'
              }}
            >
              {/* Opción por defecto */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full px-3 py-2 text-left text-gray-500 hover:bg-gray-100 transition-colors text-sm"
              >
                -- Selecciona un dominio --
              </button>

              {/* Dominios */}
              {domains.map((domain) => (
                <button
                  key={domain._id}
                  type="button"
                  onClick={() => handleSelect(domain)}
                  className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${
                    selectedDomain?._id === domain._id 
                      ? 'bg-blue-100 text-blue-900 font-medium' 
                      : 'text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{domain.domain}</span>
                    {domain.status && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        domain.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {domain.status}
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {domains.length === 0 && (
                <div className="px-3 py-2 text-gray-500 text-sm">
                  No hay dominios disponibles
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomDomainSelector;