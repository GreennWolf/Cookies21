import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#235C88]"></div>
    </div>
  );
};

export default LoadingSpinner;