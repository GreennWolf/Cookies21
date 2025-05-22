// /src/components/dashboard/Dashboard.jsx
import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { 
  Home, 
  Globe, 
  BarChart, 
  Layout, 
  Cookie, 
  Blocks, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';

const Dashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
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
                className="flex items-center hover:bg-[#1a4666] p-2 rounded"
                title={isSidebarCollapsed ? 'Inicio' : ''}
              >
                <Home size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Inicio
                </span>
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/domains" 
                className="flex items-center hover:bg-[#1a4666] p-2 rounded"
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
                className="flex items-center hover:bg-[#1a4666] p-2 rounded"
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
                className="flex items-center hover:bg-[#1a4666] p-2 rounded"
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
                className="flex items-center hover:bg-[#1a4666] p-2 rounded"
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
                className="flex items-center hover:bg-[#1a4666] p-2 rounded"
                title={isSidebarCollapsed ? 'Integraciones' : ''}
              >
                <Blocks size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Integraciones
                </span>
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard/consent" 
                className="flex items-center hover:bg-[#1a4666] p-2 rounded"
                title={isSidebarCollapsed ? 'Consentimiento' : ''}
              >
                <ShieldCheck size={20} />
                <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Consentimiento
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