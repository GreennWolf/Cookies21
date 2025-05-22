/* /src/components/dashboard/Home.jsx */
import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#181818] mb-6">
        Bienvenido al Dashboard
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="Dominios"
          description="Gestiona tus dominios y configura banners"
          link="/dashboard/domains"
        />
        <DashboardCard
          title="Analíticas"
          description="Consulta estadísticas y reportes"
          link="/dashboard/analytics"
        />
        <DashboardCard
          title="Banner"
          description="Personaliza y gestiona banners de consentimiento"
          link="/dashboard/banner"
        />
        <DashboardCard
          title="Cookies"
          description="Administra cookies detectadas y cumplimiento"
          link="/dashboard/cookies"
        />
        <DashboardCard
          title="Integraciones"
          description="Configura integraciones con servicios externos"
          link="/dashboard/integrations"
        />
        <DashboardCard
          title="Consentimiento"
          description="Gestiona el consentimiento de usuarios"
          link="/dashboard/consent"
        />
      </div>
    </div>
  );
};

const DashboardCard = ({ title, description, link }) => {
  return (
    <Link
      to={link}
      className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
    >
      <h2 className="text-xl font-semibold text-[#235C88] mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
};

export default Home;
