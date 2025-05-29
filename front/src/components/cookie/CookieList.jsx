/* /src/components/cookie/CookieList.jsx */
import React from 'react';
import PropTypes from 'prop-types';
import CookieCard from './CookieCard';

const CookieList = ({ cookies, onViewDetails, onDelete, showDomainInfo = false }) => {
  if (!cookies || cookies.length === 0) {
    return <p className="text-gray-600">No se encontraron cookies.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cookies.map((cookie) => (
        <CookieCard
          key={cookie._id}
          cookie={cookie}
          onViewDetails={onViewDetails}
          onDelete={onDelete}
          showDomainInfo={showDomainInfo}
        />
      ))}
    </div>
  );
};

CookieList.propTypes = {
  cookies: PropTypes.array.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  showDomainInfo: PropTypes.bool
};

export default CookieList;
