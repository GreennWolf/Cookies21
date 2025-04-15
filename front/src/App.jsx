import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function ProtectedRoute({ children }) {
  const { token } = useContext(AuthContext);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-4">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
                <Route index element={<Home />} />
                <Route path="domains" element={<DomainList />} />
                <Route path="cookies" element={<Cookies />} />
                <Route path="banner" element={<BannerPage />} />
                <Route path="banner-editor/:templateId" element={<BannerEditorPage />} />
                <Route path="generate-script/:bannerId" element={<ScriptGeneratorPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="integrations" element={<Integrations />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;