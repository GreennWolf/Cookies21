import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getClients } from '../api/client';
import { renewalNotificationManager } from '../utils/renewalNotifications';

const Home = () => {
  const { user } = useContext(AuthContext);
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const canManageUsers = isOwner || isAdmin;
  const [pendingRenewalCount, setPendingRenewalCount] = useState(0);
  const [pendingRenewalClients, setPendingRenewalClients] = useState([]);

  // Obtener solicitudes pendientes para owners
  useEffect(() => {
    if (isOwner) {
      fetchPendingRenewals();
      
      // Suscribirse a notificaciones en tiempo real
      const unsubscribe = renewalNotificationManager.subscribe(() => {
        fetchPendingRenewals();
      });
      
      return () => unsubscribe();
    }
  }, [isOwner]);

  const fetchPendingRenewals = async () => {
    try {
      const response = await getClients({ subscriptionStatus: 'pending_renewal', limit: 100 });
      const pendingClients = response.data.clients.filter(client => client.hasPendingRenewal);
      setPendingRenewalCount(pendingClients.length);
      setPendingRenewalClients(pendingClients.slice(0, 5)); // Mostrar máximo 5
    } catch (error) {
      console.error('Error fetching pending renewals:', error);
    }
  };

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
            notification={pendingRenewalCount}
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

const DashboardCard = ({ title, description, link, highlight = false, notification = 0 }) => {
  return (
    <Link
      to={link}
      className={`block bg-white rounded-lg shadow p-6 hover:shadow-lg transition relative ${
        highlight ? 'border-l-4 border-blue-500' : ''
      }`}
    >
      {/* Notificación en la esquina superior derecha */}
      {notification > 0 && (
        <div className="absolute -top-2 -right-2 bg-[#235C88] text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
          {notification > 9 ? '9+' : notification}
        </div>
      )}
      
      <h2 className={`text-xl font-semibold ${highlight ? 'text-blue-600' : 'text-[#235C88]'} mb-2`}>
        {title}
      </h2>
      <p className="text-gray-600">{description}</p>
      
      {/* Mensaje adicional si hay notificaciones */}
      {notification > 0 && (
        <div className="mt-3 text-sm text-[#235C88] font-medium">
          {notification === 1 ? '1 solicitud pendiente' : `${notification} solicitudes pendientes`}
        </div>
      )}
    </Link>
  );
};

export default Home;
