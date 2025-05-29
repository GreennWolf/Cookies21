import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const canManageUsers = isOwner || isAdmin;

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#181818] mb-6">
        Bienvenido al Dashboard {isOwner ? 'de Administración' : ''}
      </h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Clientes */}
        {isOwner && (
          <DashboardCard
            title="Clientes"
            description="Gestiona los clientes y sus suscripciones"
            link="/dashboard/clients"
            highlight={true}
          />
        )}

        {/* Planes de Suscripción */}
        {isOwner && (
          <DashboardCard
            title="Planes de Suscripción"
            description="Gestiona los planes y precios"
            link="/dashboard/plans"
            highlight={true}
          />
        )}
        
        {/* Dominios */}
        <DashboardCard
          title="Dominios"
          description="Gestiona tus dominios y configura banners"
          link="/dashboard/domains"
        />

        {/* Analíticas */}
        <DashboardCard
          title="Analíticas"
          description="Consulta estadísticas y reportes"
          link="/dashboard/analytics"
        />

        {/* Banner */}
        <DashboardCard
          title="Banner"
          description="Personaliza y gestiona banners de consentimiento"
          link="/dashboard/banner"
        />

        {/* Cookies */}
        <DashboardCard
          title="Cookies"
          description="Administra cookies detectadas y cumplimiento"
          link="/dashboard/cookies"
        />

        {/* Integraciones */}
        <DashboardCard
          title="Integraciones"
          description="Configura integraciones con servicios externos"
          link="/dashboard/integrations"
        />

        {/* Usuarios */}
        {canManageUsers && (
          <DashboardCard
            title="Usuarios"
            description={isOwner ? "Gestiona todos los usuarios del sistema" : "Gestiona los usuarios"}
            link="/dashboard/users"
          />
        )}

        {/* Mi Cuenta */}
        <DashboardCard
          title="Mi Cuenta"
          description="Gestiona tu perfil y preferencias"
          link="/dashboard/settings"
        />
      </div>
    </div>
  );
};

const DashboardCard = ({ title, description, link, highlight = false }) => {
  return (
    <Link
      to={link}
      className={`block bg-white rounded-lg shadow p-6 hover:shadow-lg transition ${
        highlight ? 'border-l-4 border-blue-500' : ''
      }`}
    >
      <h2 className={`text-xl font-semibold ${highlight ? 'text-blue-600' : 'text-[#235C88]'} mb-2`}>
        {title}
      </h2>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
};

export default Home;
