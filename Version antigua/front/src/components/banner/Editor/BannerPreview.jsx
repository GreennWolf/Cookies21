import React, { useState } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, X, ImageOff } from 'lucide-react';

function PreferencesModal({ onClose, backgroundColor }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100]">
      <div 
        className="w-full max-w-lg rounded-lg shadow-xl p-6"
        style={{ backgroundColor: backgroundColor || '#ffffff' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Preferencias de Cookies</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h4 className="font-medium">Cookies Necesarias</h4>
              <p className="text-sm text-gray-500">Requeridas para el funcionamiento del sitio</p>
            </div>
            <div className="bg-gray-100 px-3 py-1 rounded text-sm">Siempre activas</div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h4 className="font-medium">Cookies Analíticas</h4>
              <p className="text-sm text-gray-500">Nos ayudan a mejorar el sitio</p>
            </div>
            <label className="flex items-center">
              <input type="checkbox" className="w-4 h-4 mr-2" />
              <span className="text-sm">Permitir</span>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h4 className="font-medium">Cookies de Marketing</h4>
              <p className="text-sm text-gray-500">Usadas para publicidad personalizada</p>
            </div>
            <label className="flex items-center">
              <input type="checkbox" className="w-4 h-4 mr-2" />
              <span className="text-sm">Permitir</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button 
            onClick={() => onClose(false)}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Volver
          </button>
          <button 
            onClick={() => onClose(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Guardar Preferencias
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerPreview({ bannerConfig = { layout: { desktop: {} }, components: [] } }) {
  const [currentDevice, setCurrentDevice] = useState('desktop');
  const [showBanner, setShowBanner] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  // Estado para rastrear errores de carga de imágenes
  const [imageErrors, setImageErrors] = useState({});

  const getPreviewContainerStyles = () => {
    switch (currentDevice) {
      case 'mobile':
        return 'w-[375px]';
      case 'tablet':
        return 'w-[768px]';
      default:
        return 'w-full max-w-[1200px]';
    }
  };

  const getLayoutStyles = () => {
    const layout = bannerConfig.layout[currentDevice] || {};
    const baseStyles = {
      backgroundColor: layout.backgroundColor || '#ffffff',
      width: layout.width || '100%',
      height: layout.height || 'auto',
      minHeight: layout.minHeight || '100px'
    };

    if (layout.type === 'banner') {
      // Banner
      const style = {
        ...baseStyles,
        position: 'absolute'
      };
      if (layout.position === 'top') {
        style.top = 0;
        style.left = 0;
        style.right = 0;
      } else if (layout.position === 'bottom') {
        style.bottom = 0;
        style.left = 0;
        style.right = 0;
      } else if (layout.position === 'center') {
        style.top = '50%';
        style.left = 0;
        style.right = 0;
        style.transform = 'translateY(-50%)';
      }
      return style;
    } else if (layout.type === 'floating') {
      // Flotante
      return {
        ...baseStyles,
        position: 'absolute',
        right: '20px',
        bottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 1000
      };
    } else if (layout.type === 'modal') {
      // Modal
      return {
        ...baseStyles,
        maxWidth: '600px',
        width: '90%',
        margin: '0 auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '24px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
      };
    }
    return baseStyles;
  };
  
  // Función para extraer la URL de imagen de diferentes formatos de contenido
  const getImageUrl = (component) => {
    // Si hay un estilo con vista previa, usarlo con prioridad
    const deviceStyle = component.style?.[currentDevice];
    if (deviceStyle?._previewUrl) {
      return deviceStyle._previewUrl;
    }
    
    // Si el contenido es un string, verificar si es una URL directa
    if (typeof component.content === 'string') {
      // Si es una referencia temporal, mostrar placeholder
      if (component.content.startsWith('__IMAGE_REF__')) {
        return '/placeholder.png';
      }
      // Si es una URL directa, usarla
      return component.content;
    }
    
    // Si el contenido es un objeto con textos, buscar en textos
    if (component.content && typeof component.content === 'object') {
      if (component.content.texts?.en) {
        return component.content.texts.en;
      }
      
      // Buscar en cualquier texto disponible
      if (component.content.texts) {
        const firstTextKey = Object.keys(component.content.texts)[0];
        if (firstTextKey) {
          return component.content.texts[firstTextKey];
        }
      }
    }
    
    // Si no se encuentra ninguna URL, devolver imagen predeterminada
    return '/placeholder.png';
  };

  const renderComponent = (component) => {
    if (!component) return null;
    const devicePos = component.position?.[currentDevice] || {};
    const deviceStyle = component.style?.[currentDevice] || {};
    const baseStyles = {
      position: 'absolute',
      top: devicePos.top || '0px',
      left: devicePos.left || '0px',
      ...deviceStyle
    };
  
    // Extraer el contenido textual correctamente
    let displayContent = '';
    if (typeof component.content === 'string') {
      displayContent = component.content;
    } else if (component.content && typeof component.content === 'object') {
      // Intentar obtener el texto en inglés o el primer texto disponible
      if (component.content.texts && typeof component.content.texts === 'object') {
        displayContent = component.content.texts.en || Object.values(component.content.texts)[0] || '';
      } else if (component.content.text) {
        displayContent = component.content.text;
      }
    }
  
    const handleClick = () => {
      if (component.action?.type === 'show_preferences') {
        setShowPreferences(true);
      } else if (['accept_all', 'reject_all'].includes(component.action?.type)) {
        setShowBanner(false);
      }
    };
  
    switch (component.type) {
      case 'text':
        return (
          <div key={component.id} style={baseStyles}>
            {displayContent}
          </div>
        );
      case 'button':
        return (
          <button
            key={component.id}
            onClick={handleClick}
            style={{ ...baseStyles, cursor: 'pointer' }}
          >
            {displayContent}
          </button>
        );
      case 'image':
        const imageUrl = getImageUrl(component);
        const hasError = imageErrors[component.id];
        
        // Si hay error en la carga, mostrar marcador de error
        if (hasError) {
          return (
            <div 
              key={component.id} 
              style={{
                ...baseStyles,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f8f8',
                border: '1px dashed #ccc',
                color: '#666'
              }}
            >
              <div className="flex flex-col items-center p-2">
                <ImageOff size={24} className="text-gray-400 mb-1" />
                <span className="text-xs text-center">Error al cargar imagen</span>
              </div>
            </div>
          );
        }
        
        return (
          <img
            key={component.id}
            src={imageUrl}
            alt=""
            style={baseStyles}
            onError={() => {
              // Registrar error para este componente específico
              setImageErrors(prev => ({
                ...prev,
                [component.id]: true
              }));
              console.error(`Error al cargar imagen: ${imageUrl} para componente ${component.id}`);
            }}
          />
        );
      default:
        return null;
    }
  };

  const previewBackground = () => {
    // Simula contenido del sitio
    return (
      <>
        <div className="space-y-4 mb-8">
          <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-5/6"></div>
            <div className="h-4 bg-gray-100 rounded w-4/6"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="h-40 bg-gray-100 rounded-lg"></div>
          <div className="h-40 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded-lg w-2/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-5/6"></div>
            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
          </div>
        </div>
      </>
    );
  };

  const handleClosePreferences = (shouldClose) => {
    setShowPreferences(false);
    if (shouldClose) {
      setShowBanner(false);
    }
  };

  const handleRefresh = () => {
    setShowBanner(true);
    setShowPreferences(false);
    // Limpiar errores de carga de imágenes
    setImageErrors({});
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Barra de herramientas de la vista previa */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            className={`p-2 rounded ${currentDevice === 'desktop' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
            onClick={() => setCurrentDevice('desktop')}
            title="Vista de Escritorio"
          >
            <Monitor size={20} />
          </button>
          <button 
            className={`p-2 rounded ${currentDevice === 'tablet' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
            onClick={() => setCurrentDevice('tablet')}
            title="Vista de Tablet"
          >
            <Tablet size={20} />
          </button>
          <button 
            className={`p-2 rounded ${currentDevice === 'mobile' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
            onClick={() => setCurrentDevice('mobile')}
            title="Vista de Móvil"
          >
            <Smartphone size={20} />
          </button>
        </div>
        <button 
          className="p-2 rounded hover:bg-gray-100"
          title="Actualizar vista previa"
          onClick={handleRefresh}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Área de preview */}
      <div className="flex-1 overflow-auto p-4">
        <div className={`mx-auto ${getPreviewContainerStyles()} bg-white rounded-lg shadow-lg overflow-hidden`}>
          {/* Barra de navegador simulada */}
          <div className="bg-gray-800 p-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 bg-gray-700 rounded px-3 py-1 text-gray-400 text-sm">
              www.example.com
            </div>
          </div>

          {/* Contenedor relativo que simula el alto de la página */}
          <div className="relative" style={{ height: '600px' }}>
            <div className="p-6">
              {previewBackground()}
            </div>

            {/* Banner */}
            {showBanner && (
              <div style={getLayoutStyles()} className="relative">
                {bannerConfig.components?.map(renderComponent)}
              </div>
            )}

            {/* Modal de preferencias */}
            {showPreferences && (
              <PreferencesModal 
                onClose={handleClosePreferences}
                backgroundColor={bannerConfig.layout[currentDevice]?.backgroundColor}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BannerPreview;