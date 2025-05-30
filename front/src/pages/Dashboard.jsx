// /src/components/dashboard/Dashboard.jsx
import React, { useState, useContext } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Globe, 
  BarChart, 
  Layout, 
  Cookie, 
  Blocks, 
  Users,
  Building,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers, // Icono para planes de suscripción
  UserCircle // Icono para configuración de cuenta
} from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const Dashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  // Solo owners y admins pueden administrar usuarios
  const canManageUsers = isOwner || isAdmin;

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Manejar el error cuando se intenta acceder a una ruta no autorizada
  const handleNavigationError = () => {
    console.error("Error de navegación o permisos");
    // No cerrar sesión, solo mostrar mensaje o redirigir
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside 
        className={`
          bg-[#235C88] text-white transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        <div className="flex justify-between items-center p-4">
          <h2 className={`text-2xl font-bold ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            Dashboard
          </h2>
          <button 
            onClick={toggleSidebar}
            className="p-2 hover:bg-[#1a4666] rounded-full"
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-4">
            <li>
              <Link 
                to="/dashboard" 
                className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname === '/dashboard' ? 'bg-[#1a4666]' : ''}`}
                title={isSidebarCollapsed ? 'Inicio' : ''}
              >
                <Home size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Inicio
                </span>
              </Link>
            </li>
            
            {/* Sección de Clientes - Solo visible para owners */}
            {isOwner && (
              <li>
                <Link 
                  to="/dashboard/clients" 
                  className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname.includes('/dashboard/clients') ? 'bg-[#1a4666]' : ''}`}
                  title={isSidebarCollapsed ? 'Clientes' : ''}
                >
                  <Building size={20} />
                  <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                    Clientes
                  </span>
                </Link>
              </li>
            )}
            
            {/* Sección de Planes de Suscripción - Solo visible para owners */}
            {isOwner && (
              <li>
                <Link 
                  to="/dashboard/plans" 
                  className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname.includes('/dashboard/plans') ? 'bg-[#1a4666]' : ''}`}
                  title={isSidebarCollapsed ? 'Planes de Suscripción' : ''}
                >
                  <Layers size={20} />
                  <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                    Planes de Suscripción
                  </span>
                </Link>
              </li>
            )}
            
            <li>
              <Link 
                to="/dashboard/domains" 
                className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname.includes('/dashboard/domains') ? 'bg-[#1a4666]' : ''}`}
                title={isSidebarCollapsed ? 'Dominios' : ''}
              >
                <Globe size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Dominios
                </span>
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/analytics" 
                className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname.includes('/dashboard/analytics') ? 'bg-[#1a4666]' : ''}`}
                title={isSidebarCollapsed ? 'Analíticas' : ''}
              >
                <BarChart size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Analíticas
                </span>
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/banner" 
                className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname.includes('/dashboard/banner') ? 'bg-[#1a4666]' : ''}`}
                title={isSidebarCollapsed ? 'Banner' : ''}
              >
                <Layout size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Banner
                </span>
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/cookies" 
                className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname.includes('/dashboard/cookies') ? 'bg-[#1a4666]' : ''}`}
                title={isSidebarCollapsed ? 'Cookies' : ''}
              >
                <Cookie size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Cookies
                </span>
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/integrations" 
                className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname.includes('/dashboard/integrations') ? 'bg-[#1a4666]' : ''}`}
                title={isSidebarCollapsed ? 'Integraciones' : ''}
              >
                <Blocks size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Integraciones
                </span>
              </Link>
            </li>
            
            {/* Sección de Usuarios - Solo visible para admins y owners */}
            {canManageUsers && (
              <li>
                <Link 
                  to="/dashboard/users" 
                  className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname.includes('/dashboard/users') ? 'bg-[#1a4666]' : ''}`}
                  title={isSidebarCollapsed ? 'Usuarios' : ''}
                >
                  <Users size={20} />
                  <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                    Usuarios
                  </span>
                </Link>
              </li>
            )}
            
            {/* Sección de Configuración de Cuenta - Visible para todos los usuarios */}
            <li>
              <Link 
                to="/dashboard/settings" 
                className={`flex items-center hover:bg-[#1a4666] p-2 rounded ${location.pathname.includes('/dashboard/settings') ? 'bg-[#1a4666]' : ''}`}
                title={isSidebarCollapsed ? 'Mi Cuenta' : ''}
              >
                <UserCircle size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Mi Cuenta
                </span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Área principal */}
      <div className="flex-grow bg-[#F0F0F0] p-2">
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;