import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { logout } from '../../api/auth';
import { toast } from 'react-hot-toast';
import logo from '../../assets/logo.png';

const Header = () => {
  const { user, setAuthData } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const canManageUsers = isOwner || isAdmin;

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
                <Link to="/dashboard/clients" className="hover:text-gray-300">
                  Clientes
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
