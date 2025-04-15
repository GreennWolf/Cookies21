/* /src/components/layout/Footer.jsx */
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#181818] text-gray-300 py-4">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} CMP System. Todos los derechos reservados.
        </p>
        <p className="text-xs">Desarrollado por Tu Compañía.</p>
      </div>
    </footer>
  );
};

export default Footer;
