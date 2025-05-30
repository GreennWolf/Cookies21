/* /src/components/dashboard/DashboardCard.jsx */
import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

/**
 * DashboardCard
 * Muestra una tarjeta con título, descripción e icono (opcional) y navega al enlace indicado.
 * 
 * Props:
 * - title: Título de la tarjeta.
 * - description: Descripción o subtítulo.
 * - link: URL a la que redirige la tarjeta.
 * - icon: (Opcional) Componente de icono a mostrar.
 * - className: (Opcional) Clases CSS adicionales.
 */
const DashboardCard = ({ title, description, link, icon: Icon, className }) => {
  return (
    <Link
      to={link}
      className={clsx(
        "block bg-white rounded-lg shadow p-6 hover:shadow-lg transition",
        className
      )}
    >
      {Icon && (
        <div className="mb-4">
          <Icon className="text-[#235C88] w-8 h-8" />
        </div>
      )}
      <h2 className="text-xl font-semibold text-[#235C88] mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
};

export default DashboardCard;
