import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const DocSidebar = ({ activeSection, onSectionChange }) => {
  const sections = {
    'getting-started': {
      title: 'Primeros pasos',
      subSections: {
        'introduction': 'Introducción',
        'quick-start': 'Inicio rápido',
        'key-concepts': 'Conceptos clave'
      }
    },
    'script-integration': {
      title: 'Integración del Script',
      subSections: {
        'basic-integration': 'Integración básica',
        'cms-integration': 'Integración en CMS',
        'script-blocking': 'Bloqueo de scripts',
        'advanced-options': 'Opciones avanzadas'
      }
    },
    'banner-customization': {
      title: 'Personalización del Banner',
      subSections: {
        'visual-editor': 'Editor visual',
        'appearance': 'Apariencia',
        'content': 'Contenido y textos',
        'behavior': 'Comportamiento'
      }
    },
    'compliance': {
      title: 'Cumplimiento Normativo',
      subSections: {
        'gdpr': 'RGPD / GDPR',
        'lopd': 'LOPD-GDD',
        'cookies-guide': 'Guía de Cookies 2023',
        'tcf': 'Soporte TCF 2.2'
      }
    },
    'api': {
      title: 'API y Desarrollo',
      subSections: {
        'javascript-api': 'API JavaScript',
        'rest-api': 'API REST',
        'events': 'Eventos',
        'hooks': 'Hooks y plugins'
      }
    },
    'faq': {
      title: 'Preguntas Frecuentes',
      subSections: {
        'general': 'Preguntas generales',
        'technical': 'Preguntas técnicas',
        'compliance-faq': 'Cumplimiento',
        'troubleshooting': 'Solución de problemas'
      }
    }
  };

  return (
    <div className="doc-sidebar py-4">
      <Nav className="flex-column sticky-top">
        {Object.entries(sections).map(([sectionKey, section]) => (
          <div key={sectionKey} className="mb-3">
            <Nav.Link
              as={Link}
              to={`/documentation/${sectionKey}`}
              className={`fw-bold ${activeSection === sectionKey ? 'text-primary' : 'text-dark'}`}
              onClick={(e) => {
                e.preventDefault();
                onSectionChange(sectionKey);
              }}
            >
              {section.title}
            </Nav.Link>
            
            {activeSection === sectionKey && (
              <Nav className="flex-column ms-3 mt-2">
                {Object.entries(section.subSections).map(([subKey, title]) => (
                  <Nav.Link
                    key={subKey}
                    as={Link}
                    to={`/documentation/${sectionKey}#${subKey}`}
                    className="small text-secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(subKey);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    {title}
                  </Nav.Link>
                ))}
              </Nav>
            )}
          </div>
        ))}
      </Nav>
    </div>
  );
};

export default DocSidebar;