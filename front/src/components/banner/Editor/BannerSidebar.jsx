// /src/components/banner/Editor/BannerSidebar.jsx
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { 
  Search,
  Type, 
  Square,
  Image, 
  Box,
  Grid,
  Container,
  Lock,
  ChevronDown,
  ChevronRight,
  Languages
} from 'lucide-react';

// Variable global temporal para almacenar datos del drag
window.__dragData = null;

// Función auxiliar para extraer texto de cualquier tipo de contenido
const extractText = (content) => {
  // Si es undefined o null, devolver string vacío
  if (content === undefined || content === null) {
    return '';
  }
  
  // Si es un string, devolverlo directamente
  if (typeof content === 'string') {
    return content;
  }
  
  // Si es un objeto con texts
  if (typeof content === 'object' && content.texts) {
    // Intentar obtener el texto en inglés o el primer texto disponible
    return content.texts.es || 
           content.texts.en || 
           Object.values(content.texts)[0] || '';
  }
  
  // Si es un objeto con text
  if (typeof content === 'object' && content.text) {
    return content.text;
  }
  
  // Por defecto, devolver representación genérica
  return typeof content === 'object' ? '[Contenido complejo]' : String(content);
};

function BannerSidebar({ bannerConfig }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState('basic');
  
  // Process required components directly without state
  const getRequiredComponents = () => {
    const requiredButtons = [
      {
        id: 'acceptBtn',
        type: 'button',
        label: 'Aceptar Todo',
        icon: <Square size={16} className="text-green-600" />,
        preview: 'Botón obligatorio para aceptar todas las cookies',
        locked: false,
        action: { type: 'accept_all' },
        content: { texts: { en: 'Accept All', es: 'Aceptar Todo' } }
      },
      {
        id: 'rejectBtn',
        type: 'button',
        label: 'Rechazar Todo',
        icon: <Square size={16} className="text-red-600" />,
        preview: 'Botón obligatorio para rechazar cookies opcionales',
        locked: false,
        action: { type: 'reject_all' },
        content: { texts: { en: 'Reject All', es: 'Rechazar Todo' } }
      },
      {
        id: 'preferencesBtn',
        type: 'button',
        label: 'Mostrar Preferencias',
        icon: <Square size={16} className="text-blue-600" />,
        preview: 'Botón obligatorio para gestionar preferencias',
        locked: false,
        action: { type: 'show_preferences' },
        content: { texts: { en: 'Cookie Settings', es: 'Configuración de Cookies' } }
      },
      {
        id: 'languageBtn',
        type: 'language-button',
        label: 'Selector de Idioma',
        icon: <Languages size={16} className="text-purple-600" />,
        preview: 'Componente obligatorio para selección de idioma',
        locked: false,
        content: { 
          displayMode: 'flag-dropdown',
          supportedLanguages: ['es', 'en', 'fr', 'de', 'it'],
          defaultLanguage: 'es'
        }
      }
    ];
    
    // Verificar cuáles ya están en el banner
    const existingButtonIds = [];
    
    const checkComponentsRecursively = (components) => {
      components.forEach(comp => {
        if (comp.type === 'button' && comp.action) {
          if (comp.action.type === 'accept_all') existingButtonIds.push('acceptBtn');
          if (comp.action.type === 'reject_all') existingButtonIds.push('rejectBtn');
          if (comp.action.type === 'show_preferences') existingButtonIds.push('preferencesBtn');
        }
        if (comp.type === 'language-button') {
          existingButtonIds.push('languageBtn');
        }
        // Buscar en hijos si es contenedor
        if (comp.type === 'container' && comp.children) {
          checkComponentsRecursively(comp.children);
        }
      });
    };
    
    if (bannerConfig?.components) {
      checkComponentsRecursively(bannerConfig.components);
    }
    
    // Marcar los que ya están en el banner
    return requiredButtons.map(btn => ({
      ...btn,
      inBanner: existingButtonIds.includes(btn.id),
      disabled: existingButtonIds.includes(btn.id)
    }));
  };

  // Componentes disponibles organizados por categorías
  const componentCategories = {
    basic: {
      title: 'Básicos',
      icon: <Grid size={16} />,
      components: [
        {
          type: 'text',
          label: 'Texto',
          icon: <Type size={16} />,
          preview: 'Añade contenido de texto'
        },
        {
          type: 'image',
          label: 'Imagen',
          icon: <Image size={16} />,
          preview: 'Añade una imagen'
        }
      ]
    },
    containers: {
      title: 'Contenedores',
      icon: <Container size={16} />,
      components: [
        {
          type: 'container',
          label: 'Contenedor',
          icon: <Box size={16} />,
          preview: 'Agrupa elementos'
        },
      ]
    },
    required: {
      title: 'Componentes Obligatorios',
      icon: <Lock size={16} />,
      components: getRequiredComponents()
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term) {
      setExpandedCategory('all');
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const filterComponents = (components) => {
    if (!searchTerm) return components;
    return components.filter(comp => 
      comp.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.preview?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="w-64 bg-white border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar componentes..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Componentes */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(componentCategories).map(([key, category]) => {
          const filteredComponents = filterComponents(category.components);
          if (filteredComponents.length === 0) return null;

          return (
            <div key={key} className="border-b last:border-b-0">
              {/* Cabecera de categoría */}
              <button
                onClick={() => toggleCategory(key)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  {category.icon}
                  <span className="font-medium text-sm">{category.title}</span>
                </div>
                {expandedCategory === key ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>

              {/* Lista de componentes */}
              {expandedCategory === key && (
                <div className="p-2 space-y-1">
                  {filteredComponents.map((component) => (
                    <div
                      key={component.id || component.type}
                      className={`group relative rounded hover:bg-gray-50 ${component.inBanner ? 'opacity-50' : ''} ${component.disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                      draggable={!component.disabled}
                      onDragStart={(e) => {
                        // DEBUG:('🎯 INICIANDO DRAG desde sidebar');
                        // DEBUG:('  - Component:', component);
                        
                        if (component.disabled) {
                          // DEBUG:('  - Componente deshabilitado, cancelando');
                          e.preventDefault();
                          return;
                        }
                        const dragData = {
                          type: component.type,
                          label: component.label,
                          source: 'sidebar',
                          ...(component.content && { content: component.content }),
                          ...(component.action && { action: component.action }),
                          ...(component.locked && { locked: component.locked }),
                          ...(component.id && { id: component.id })
                        };
                        
                        // Almacenar en variable global como respaldo
                        window.__dragData = dragData;
                        // DEBUG:('🚀 DRAG START desde sidebar:', dragData);
                        
                        const dragDataString = JSON.stringify(dragData);
                        
                        // Establecer los datos en múltiples formatos
                        try {
                          e.dataTransfer.setData('application/json', dragDataString);
                          e.dataTransfer.setData('text/plain', dragDataString);
                          e.dataTransfer.setData('text', dragDataString);
                          e.dataTransfer.setData('component/sidebar', component.type);
                        } catch (error) {
                          if (process.env.NODE_ENV === 'development') {
                            console.error('Error setting dataTransfer:', error);
                          }
                        }
                        
                        e.dataTransfer.effectAllowed = 'copy';
                        e.currentTarget.style.opacity = '0.5';
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.opacity = '1';
                        // DEBUG:('🚬 DRAG END desde sidebar');
                        
                        // NO limpiar inmediatamente para dar tiempo al drop
                        setTimeout(() => {
                          // DEBUG:('  - Limpiando dragData');
                          window.__dragData = null;
                        }, 1000); // Aumentar delay para asegurar que el drop lo pueda leer
                      }}
                    >
                      {/* Vista previa del componente */}
                      <div className="p-2">
                        <div className="flex items-center gap-2 mb-1">
                          {component.icon || (
                            component.type === 'button' ? <Square size={16} /> :
                            component.type === 'text' ? <Type size={16} /> :
                            component.type === 'image' ? <Image size={16} /> :
                            <Box size={16} />
                          )}
                          <span className="text-sm font-medium">
                            {component.label || component.type}
                          </span>
                          {component.locked && <Lock size={12} className="text-red-500" />}
                        </div>
                        <p className="text-xs text-gray-500">{component.preview}</p>
                        {component.action && (
                          <p className="text-xs text-blue-500 mt-1">
                            Acción: {component.action.type}
                          </p>
                        )}
                        {component.inBanner && (
                          <p className="text-xs text-green-600 mt-1 font-medium">
                            ✓ Ya está en el banner
                          </p>
                        )}
                      </div>

                      {/* Overlay de arrastre */}
                      <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 rounded pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer con información */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500">
          Arrastra los componentes al canvas para construir tu banner
        </p>
      </div>
    </div>
  );
}

export default BannerSidebar;