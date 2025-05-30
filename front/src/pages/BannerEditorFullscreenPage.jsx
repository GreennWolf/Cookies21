// /src/pages/BannerEditorFullscreenPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import FullScreenBannerEditor from '../components/banner/Editor/FullScreenBannerEditor';
import { getTemplate } from '../api/bannerTemplate';
import { ArrowLeft } from 'lucide-react';

function BannerEditorFullscreenPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [initialConfig, setInitialConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar plantilla existente o crear una nueva
  useEffect(() => {
    async function loadTemplate() {
      if (!templateId) {
        setError("No se ha proporcionado un ID de plantilla");
        setLoading(false);
        return;
      }
      
      // Si es una plantilla nueva, usar configuración por defecto
      if (templateId === 'new') {
        setLoading(false);
        setInitialConfig(null);
        return;
      }

      try {
        setLoading(true);
        
        const response = await getTemplate(templateId);
        let template = response.data.template;
        
        // Procesar componentes para asegurar consistencia de datos
        if (template.components) {
          template.components = template.components.map(comp => {
            const processedComp = { ...comp };
            
            // Procesar content
            if (processedComp.content === undefined || processedComp.content === null) {
              if (processedComp.action?.type === 'accept_all') {
                processedComp.content = 'Aceptar Todas';
              } else if (processedComp.action?.type === 'reject_all') {
                processedComp.content = 'Rechazar Todas';
              } else if (processedComp.action?.type === 'show_preferences') {
                processedComp.content = 'Preferencias';
              } else {
                processedComp.content = processedComp.type || 'Componente';
              }
            } else if (typeof processedComp.content === 'object') {
              // Extraer texto de objetos complejos
              if (processedComp.content.text) {
                if (typeof processedComp.content.text === 'string') {
                  processedComp.content = processedComp.content.text;
                } else if (typeof processedComp.content.text === 'object') {
                  processedComp.content = processedComp.content.text.en || 
                                         Object.values(processedComp.content.text)[0] || 
                                         'Texto';
                }
              }
            }
            
            // Asegurar consistencia en posiciones (convertir a porcentajes)
            const ensurePercentage = (position) => {
              if (!position) return { top: '0%', left: '0%' };
              
              const result = { ...position };
              
              // Procesar top
              if (typeof result.top === 'string') {
                if (result.top.endsWith('px')) {
                  const value = parseFloat(result.top);
                  result.top = `${(value / 1000) * 100}%`; // Asumiendo contenedor de 1000px
                } else if (!result.top.endsWith('%')) {
                  result.top = `${result.top}%`;
                }
              } else if (typeof result.top === 'number') {
                result.top = `${result.top}%`;
              } else {
                result.top = '0%';
              }
              
              // Procesar left
              if (typeof result.left === 'string') {
                if (result.left.endsWith('px')) {
                  const value = parseFloat(result.left);
                  result.left = `${(value / 1000) * 100}%`; // Asumiendo contenedor de 1000px
                } else if (!result.left.endsWith('%')) {
                  result.left = `${result.left}%`;
                }
              } else if (typeof result.left === 'number') {
                result.left = `${result.left}%`;
              } else {
                result.left = '0%';
              }
              
              return result;
            };
            
            // Procesar posiciones para cada dispositivo
            processedComp.position = processedComp.position || {};
            processedComp.position = {
              desktop: ensurePercentage(processedComp.position.desktop || { top: '0%', left: '0%' }),
              tablet: ensurePercentage(processedComp.position.tablet || processedComp.position.desktop || { top: '0%', left: '0%' }),
              mobile: ensurePercentage(processedComp.position.mobile || processedComp.position.desktop || { top: '0%', left: '0%' })
            };
            
            return processedComp;
          });
        }
        
        setInitialConfig(template);
        setError(null);
      } catch (err) {
        setError(`Error al cargar la plantilla: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    
    loadTemplate();
  }, [templateId]);

  // Función para manejar el guardado exitoso
  const handleSaveSuccess = () => {
    // Después de guardar, redirigir a la lista de banners
    navigate('/dashboard/banner');
  };

  // Mostrar indicador de carga si está cargando
  if (loading && !initialConfig) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Mostrar mensaje de error si hay un error
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Volver
        </button>
      </div>
    );
  }

  // Renderizar el editor de banner en pantalla completa
  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <FullScreenBannerEditor 
        initialConfig={initialConfig} 
        onSave={handleSaveSuccess}
        onBack={() => navigate('/dashboard/banner')}
      />
    </div>
  );
}

export default BannerEditorFullscreenPage;