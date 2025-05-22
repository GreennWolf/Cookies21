/* /src/components/domain/DomainSelector.jsx */
import React from 'react';
import PropTypes from 'prop-types';

const DomainSelector = ({ domains, selectedDomain, onSelect }) => {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 mb-2">Selecciona un Dominio:</label>
      <select
        value={selectedDomain ? selectedDomain._id : ''}
        onChange={(e) => {
          const selected = domains.find((domain) => domain._id === e.target.value);
          onSelect(selected);
        }}
        className="w-full px-3 py-2 border rounded"
      >
        <option value="">-- Selecciona un dominio --</option>
        {domains.map((domain) => (
          <option key={domain._id} value={domain._id}>
            {domain.domain}
          </option>
        ))}
      </select>
    </div>
  );
};

DomainSelector.propTypes = {
  domains: PropTypes.array.isRequired,
  selectedDomain: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
};

export default DomainSelector;
