import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { logout } from '../../api/auth';
import { getClients } from '../../api/client';
import { renewalNotificationManager } from '../../utils/renewalNotifications';
import { toast } from 'react-hot-toast';
import logo from '../../assets/logo.png';
// Alternative logos available:
// import logo from '../../assets/logo-final.svg';
// import logo from '../../assets/logo-modern.svg';
// import logo from '../../assets/logo-minimal.svg';
// import logo from '../../assets/logo-professional.svg';

const Header = () => {
  const { user, setAuthData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [pendingRenewalCount, setPendingRenewalCount] = useState(0);
  
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const canManageUsers = isOwner || isAdmin;

  // Obtener el contador de solicitudes pendientes para owners
  useEffect(() => {
    if (isOwner) {
      fetchPendingRenewalCount();
      // Actualizar cada 60 segundos
      const interval = setInterval(fetchPendingRenewalCount, 60000);
      
      // Suscribirse a notificaciones en tiempo real
      const unsubscribe = renewalNotificationManager.subscribe(() => {
        fetchPendingRenewalCount();
      });
      
      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }
  }, [isOwner]);

  const fetchPendingRenewalCount = async () => {
    try {
      const response = await getClients({ subscriptionStatus: 'pending_renewal', limit: 100 });
      const pendingCount = response.data.clients.filter(client => client.hasPendingRenewal).length;
      setPendingRenewalCount(pendingCount);
    } catch (error) {
      console.error('Error fetching pending renewal count:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setAuthData({ token: null, user: null });
      navigate('/login');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <header className="bg-[#235C88] text-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard" className="text-xl font-bold">
            <img src={logo} width={125} alt="Logo" />
          </Link>
          <nav className="hidden md:flex space-x-4">
            <Link to="/dashboard" className="hover:text-gray-300">
              Inicio
            </Link>

            {isOwner && (
              <>
                <Link to="/dashboard/clients" className="hover:text-gray-300 relative">
                  Clientes
                  {pendingRenewalCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-white text-[#235C88] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse border-2 border-[#235C88]">
                      {pendingRenewalCount > 9 ? '9+' : pendingRenewalCount}
                    </span>
                  )}
                </Link>
                <Link to="/dashboard/plans" className="hover:text-gray-300">
                  Planes
                </Link>
              </>
            )}

            <Link to="/dashboard/domains" className="hover:text-gray-300">
              Dominios
            </Link>
            <Link to="/dashboard/analytics" className="hover:text-gray-300">
              Analíticas
            </Link>
            <Link to="/dashboard/banner" className="hover:text-gray-300">
              Banner
            </Link>
            <Link to="/dashboard/cookies" className="hover:text-gray-300">
              Cookies
            </Link>
            <Link to="/dashboard/integrations" className="hover:text-gray-300">
              Integraciones
            </Link>

            {canManageUsers && (
              <Link to="/dashboard/users" className="hover:text-gray-300">
                Usuarios
              </Link>
            )}

            <Link to="/dashboard/settings" className="hover:text-gray-300">
              Mi Cuenta
            </Link>
          </nav>
        </div>
        <div>
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline">Bienvenido, {user.name}</span>
              <button
                onClick={handleLogout}
                className="bg-white text-[#235C88] px-3 py-1 rounded hover:bg-gray-100 transition"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-white text-[#235C88] px-3 py-1 rounded hover:bg-gray-100 transition"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
