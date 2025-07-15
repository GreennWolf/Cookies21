import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

// Importar componentes de documentación
import GettingStarted from '../components/documentation/sections/GettingStarted';
import ScriptIntegration from '../components/documentation/sections/ScriptIntegration';
import BannerCustomization from '../components/documentation/sections/BannerCustomization';
import Compliance from '../components/documentation/sections/Compliance';
import Faq from '../components/documentation/sections/Faq';

const Documentation = () => {
  const { section = 'getting-started' } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(section);

  useEffect(() => {
    setActiveSection(section);
  }, [section]);

  const handleSectionChange = (sectionKey) => {
    setActiveSection(sectionKey);
    navigate(`/documentation/${sectionKey}`);
  };

  // Datos de las secciones usando componentes
  const sections = {
    'getting-started': {
      title: 'Primeros pasos',
      component: <GettingStarted />
    },
    'script-integration': {
      title: 'Integración del Script',
      component: <ScriptIntegration />
    },
    'banner-customization': {
      title: 'Personalización del Banner',
      component: <BannerCustomization />
    },
    'compliance': {
      title: 'Cumplimiento Normativo',
      component: <Compliance />
    },
    'faq': {
      title: 'Preguntas Frecuentes',
      component: <Faq />
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Cookie21 Docs</h1>
            <nav>
              <ul className="flex space-x-4">
                <li><Link to="/documentation/getting-started" className="hover:underline text-sm">Primeros pasos</Link></li>
                <li><Link to="/documentation/script-integration" className="hover:underline text-sm">Script</Link></li>
                <li><Link to="/documentation/banner-customization" className="hover:underline text-sm">Banner</Link></li>
                <li><Link to="/documentation/compliance" className="hover:underline text-sm">Cumplimiento</Link></li>
                <li><Link to="/documentation/faq" className="hover:underline text-sm">FAQ</Link></li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <div className="w-full md:w-1/4 pr-0 md:pr-8 mb-8 md:mb-0">
            <nav className="bg-white shadow-md rounded-lg p-4">
              <ul className="space-y-2">
                {Object.entries(sections).map(([key, section]) => (
                  <li key={key}>
                    <a
                      href={`/documentation/${key}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSectionChange(key);
                      }}
                      className={`block px-4 py-2 rounded-md ${
                        activeSection === key
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Content */}
          <div className="w-full md:w-3/4">
            <div className="bg-white shadow-md rounded-lg p-6">
              {sections[activeSection]?.component || (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold text-gray-700">Sección no encontrada</h2>
                  <p className="mt-2">La sección solicitada no existe o está en desarrollo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;