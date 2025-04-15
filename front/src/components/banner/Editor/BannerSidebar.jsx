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
  ChevronRight
} from 'lucide-react';

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
  const [requiredComponents, setRequiredComponents] = useState([]);

  useEffect(() => {
    // Procesar los componentes obligatorios al cargar o cambiar la configuración
    if (bannerConfig?.components) {
      console.log('📋 Procesando componentes para la barra lateral');
      
      const required = bannerConfig.components
        .filter(comp => comp.locked)
        .map(comp => {
          const displayText = extractText(comp.content);
          console.log(`  🔒 Componente obligatorio ${comp.id}: "${displayText}"`);
          
          return {
            id: comp.id,
            type: comp.type,
            label: displayText || comp.type,
            preview: displayText || 'Componente obligatorio',
            locked: true,
            action: comp.action
          };
        });
      
      setRequiredComponents(required);
      console.log(`  ✅ ${required.length} componentes obligatorios procesados`);
    }
  }, [bannerConfig]);

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
      components: requiredComponents
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
                      className="group relative rounded hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => {
                        const dragData = {
                          type: component.type,
                          label: component.label,
                          preview: component.preview
                        };
                        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                        e.currentTarget.classList.add('opacity-50');
                        console.log(`🖱️ Iniciando arrastre de componente tipo ${component.type}`);
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('opacity-50');
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