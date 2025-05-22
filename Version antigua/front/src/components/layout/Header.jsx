/* /src/components/layout/Header.jsx */
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { logout } from '../../api/auth'; // Asegúrate de tener este endpoint implementado
import { toast } from 'react-hot-toast';

const Header = () => {
  const { user, setAuthData } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Llamada al endpoint de logout si aplica
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
            CMP Dashboard
          </Link>
          <nav className="hidden md:flex space-x-4">
            <Link to="/dashboard" className="hover:text-gray-300">
              Dashboard
            </Link>
            <Link to="/domains" className="hover:text-gray-300">
              Dominios
            </Link>
            <Link to="/analytics" className="hover:text-gray-300">
              Analíticas
            </Link>
            <Link to="/banner" className="hover:text-gray-300">
              Banner
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
