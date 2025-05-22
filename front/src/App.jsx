import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import DomainList from './pages/DomainList';
import Cookies from './pages/Cookies';
import BannerEditorPage from './pages/BannerEditorPage';
import BannerPage from './pages/BannerPage';
import { Toaster } from 'react-hot-toast';
import ScriptGeneratorPage from './pages/ScriptGeneratorPage';
import AnalyticsPage from './pages/AnalitycsPage';
import Integrations from './pages/Integrations';
import UsersManagementPage from './pages/UsersManagementPage';
import ClientsManagementPage from './pages/ClientsManagementPage';
import SubscriptionPlanManagementPage from './pages/SubscriptionPlanManagementPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import Documentation from './pages/Documentation';

// Componente que verifica si el usuario está autenticado
function ProtectedRoute({ children, requiredRole, allowedRoles }) {
  const authContext = useContext(AuthContext);
  
  // Si el contexto de autenticación no está disponible, mostrar indicador de carga
  if (!authContext) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }
  
  const { token, user, isAuthenticated, isLoading } = authContext;
  
  // Si está cargando, mostrar indicador de carga
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }
  
  // Si no está autenticado, redirigir al login
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }
  
  // Si se requiere un rol específico y el usuario no lo tiene
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Si se especifican roles permitidos y el usuario no tiene ninguno de ellos
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

// Componente de layout principal que incluye Header y Footer
function MainLayout() {
  return (
    <>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-4">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <div className="flex flex-col min-h-screen">
          <Routes>
            {/* Ruta pública para invitaciones - sin Header/Footer */}
            <Route path="/invitacion/:token" element={<AcceptInvitationPage />} />
            
            {/* Ruta Login */}
            <Route path="/login" element={<Login />} />
            
            {/* Ruta de documentación - accesible públicamente */}
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/documentation/:section" element={<Documentation />} />
            
            {/* Layout principal con Header y Footer */}
            <Route path="/" element={<MainLayout />}>
              {/* Ruta Dashboard y sus rutas anidadas */}
              <Route path="dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }>
                <Route index element={<Home />} />
                
                {/* Ruta de clientes (solo para owners) */}
                <Route 
                  path="clients" 
                  element={
                    <ProtectedRoute requiredRole="owner">
                      <ClientsManagementPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Ruta de planes de suscripción (solo para owners) */}
                <Route 
                  path="plans" 
                  element={
                    <ProtectedRoute requiredRole="owner">
                      <SubscriptionPlanManagementPage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route path="domains" element={<DomainList />} />
                <Route path="cookies" element={<Cookies />} />
                <Route path="banner" element={<BannerPage />} />
                <Route path="banner-editor/:templateId" element={<BannerEditorPage />} />
                <Route path="generate-script/:bannerId" element={<ScriptGeneratorPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="integrations" element={<Integrations />} />
                
                {/* Ruta de usuarios (solo para admins y owners) */}
                <Route 
                  path="users" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'owner']}>
                      <UsersManagementPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Ruta de configuración (accesible para todos los usuarios) */}
                <Route 
                  path="settings" 
                  element={<AccountSettingsPage />}
                />
              </Route>
              
              {/* Redirección de ruta raíz a dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
            </Route>
            
            {/* Redirección para rutas no encontradas */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;