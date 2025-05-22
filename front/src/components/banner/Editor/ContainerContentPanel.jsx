import React, { useState } from 'react';
import { Plus, Type, Square, Image, Box, ChevronDown, ChevronUp, Trash2, GripVertical, MoreVertical, X } from 'lucide-react';

/**
 * Panel de contenido especializado para contenedores
 * FASE 4 - Gestión completa: Panel para agregar, eliminar y reordenar componentes
 */
function ContainerContentPanel({ 
  component, 
  deviceView, 
  onAddChild,
  onRemoveChild, // Nueva función para quitar hijos
  onSelectChild, // Nueva función para seleccionar hijos
  onReorderChildren, // Nueva función para reordenar hijos
  selectedComponent // Componente actualmente seleccionado
}) {
  const [showAddComponents, setShowAddComponents] = useState(false);
  const [draggedChild, setDraggedChild] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showChildActions, setShowChildActions] = useState(null);
  
  // Lista de componentes disponibles para agregar
  const availableComponents = [
    {
      type: 'text',
      name: 'Texto',
      icon: Type,
      description: 'Agregar texto al contenedor',
      defaultContent: 'Texto nuevo',
      color: '#374151'
    },
    {
      type: 'button',
      name: 'Botón',
      icon: Square,
      description: 'Agregar botón interactivo',
      defaultContent: 'Botón',
      color: '#3b82f6'
    },
    {
      type: 'image',
      name: 'Imagen',
      icon: Image,
      description: 'Agregar imagen',
      defaultContent: '',
      color: '#10b981'
    }
  ];

  // Función para agregar un componente específico
  const handleAddComponent = (componentType) => {
    const componentData = availableComponents.find(c => c.type === componentType);
    if (!componentData) return;

    // Crear componente con configuración por defecto
    const newComponent = {
      type: componentType,
      content: componentData.defaultContent,
      style: {
        [deviceView]: getDefaultStyles(componentType)
      },
      position: {
        [deviceView]: getDefaultPosition(componentType)
      }
    };

    console.log(`🎯 Agregando ${componentType} desde panel de contenido:`, newComponent);
    
    // Llamar función de agregar hijo si existe
    if (typeof onAddChild === 'function') {
      onAddChild(component.id, newComponent);
    } else {
      console.warn('No se proporcionó función onAddChild');
    }

    // Cerrar el panel después de agregar
    setShowAddComponents(false);
  };

  // Obtener estilos por defecto para cada tipo de componente
  const getDefaultStyles = (type) => {
    switch (type) {
      case 'text':
        return {
          fontSize: '16px',
          color: '#374151',
          padding: '8px',
          width: 'auto',
          height: 'auto'
        };
      case 'button':
        return {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          border: '2px solid #3b82f6',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 'bold',
          width: '120px',
          height: '36px'
        };
      case 'image':
        return {
          width: '100px',
          height: '100px',
          objectFit: 'contain'
        };
      default:
        return {};
    }
  };

  // Obtener posición por defecto según el modo del contenedor
  const getDefaultPosition = (type) => {
    const containerConfig = component.containerConfig?.[deviceView] || {};
    const displayMode = containerConfig.displayMode || 'libre';
    
    if (displayMode === 'libre') {
      // En modo libre, posicionar en una ubicación libre
      const childrenCount = component.children?.length || 0;
      const offsetX = (childrenCount * 10) % 80; // Distribuir un poco
      const offsetY = Math.floor(childrenCount / 8) * 10; // Nueva fila cada 8
      
      return {
        top: `${10 + offsetY}%`,
        left: `${10 + offsetX}%`,
        percentX: 10 + offsetX,
        percentY: 10 + offsetY
      };
    } else {
      // En flex/grid, posición automática
      return {
        top: '0%',
        left: '0%',
        percentX: 0,
        percentY: 0
      };
    }
  };

  // Funciones para gestión de hijos
  const getChildDisplayContent = (child) => {
    if (typeof child.content === 'string') {
      return child.content || `${child.type} sin contenido`;
    } else if (child.content?.texts?.en) {
      return child.content.texts.en;
    } else if (child.content?.text) {
      return child.content.text;
    }
    return `${child.type} sin contenido`;
  };

  const handleRemoveChild = (childId) => {
    if (onRemoveChild) {
      onRemoveChild(childId);
    }
  };

  const handleMoveChildUp = (index) => {
    if (index > 0 && onReorderChildren) {
      const newOrder = [...component.children];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      onReorderChildren(component.id, newOrder);
    }
  };

  const handleMoveChildDown = (index) => {
    if (index < component.children.length - 1 && onReorderChildren) {
      const newOrder = [...component.children];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      onReorderChildren(component.id, newOrder);
    }
  };

  // Funciones de drag & drop para reordenamiento
  const handleChildDragStart = (e, child, index) => {
    setDraggedChild({ child, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleChildDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleChildDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleChildDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedChild && draggedChild.index !== dropIndex && onReorderChildren) {
      const newOrder = [...component.children];
      const draggedItem = newOrder.splice(draggedChild.index, 1)[0];
      newOrder.splice(dropIndex, 0, draggedItem);
      onReorderChildren(component.id, newOrder);
    }
    
    setDraggedChild(null);
  };

  // Cerrar menú contextual al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowChildActions(null);
    };
    
    if (showChildActions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showChildActions]);

  return (
    <div className="space-y-4">
      {/* Información del contenedor */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Box size={16} className="text-blue-600" />
          <span className="font-medium text-sm text-blue-800">Contenedor</span>
        </div>
        <div className="text-xs text-blue-700">
          <div className="mb-1">
            <strong>Modo:</strong> {component.containerConfig?.[deviceView]?.displayMode || 'libre'}
          </div>
          <div>
            <strong>Componentes:</strong> {component.children?.length || 0}
          </div>
        </div>
      </div>

      {/* Lista de componentes hijos existentes con gestión completa */}
      {component.children && component.children.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-gray-800">Componentes ({component.children.length})</h4>
            <div className="text-xs text-gray-500">
              Arrastra para reordenar
            </div>
          </div>
          
          <div className="space-y-1">
            {component.children.map((child, index) => (
              <div 
                key={child.id || index} 
                className={`relative group flex items-center gap-2 p-2 rounded border transition-all
                  ${selectedComponent?.id === child.id 
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }
                  ${dragOverIndex === index ? 'border-blue-400 border-t-2' : ''}
                `}
                draggable
                onDragStart={(e) => handleChildDragStart(e, child, index)}
                onDragOver={(e) => handleChildDragOver(e, index)}
                onDragLeave={handleChildDragLeave}
                onDrop={(e) => handleChildDrop(e, index)}
                onClick={() => onSelectChild && onSelectChild(child)}
              >
                {/* Handle de arrastre */}
                <GripVertical 
                  size={14} 
                  className="text-gray-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" 
                />
                
                {/* Icono del tipo */}
                <div className="flex items-center gap-2">
                  {child.type === 'text' && <Type size={14} className="text-gray-600" />}
                  {child.type === 'button' && <Square size={14} className="text-blue-600" />}
                  {child.type === 'image' && <Image size={14} className="text-green-600" />}
                  <span className="text-sm font-medium capitalize">{child.type}</span>
                </div>
                
                {/* Contenido truncado */}
                <div className="flex-1 text-xs text-gray-500 truncate">
                  {getChildDisplayContent(child)}
                </div>
                
                {/* Z-index indicator */}
                <div className="text-xs text-gray-400 bg-gray-200 px-1 rounded">
                  {index + 1}
                </div>
                
                {/* Acciones */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChildActions(showChildActions === child.id ? null : child.id);
                    }}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title="Más opciones"
                  >
                    <MoreVertical size={12} />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveChild(child.id);
                    }}
                    className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                    title="Quitar del contenedor"
                  >
                    <X size={12} />
                  </button>
                </div>
                
                {/* Menú contextual */}
                {showChildActions === child.id && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px]">
                    <div className="p-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChild && onSelectChild(child);
                          setShowChildActions(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors"
                      >
                        Seleccionar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveChildUp(index);
                          setShowChildActions(null);
                        }}
                        disabled={index === 0}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mover arriba
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveChildDown(index);
                          setShowChildActions(null);
                        }}
                        disabled={index === component.children.length - 1}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mover abajo
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveChild(child.id);
                          setShowChildActions(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Quitar del contenedor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Información de reordenamiento */}
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            💡 <strong>Tip:</strong> El orden aquí determina el z-index. El primer elemento aparece al fondo.
          </div>
        </div>
      )}

      {/* Botón para agregar componentes */}
      <div className="space-y-2">
        <button
          onClick={() => setShowAddComponents(!showAddComponents)}
          className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-blue-600" />
            <span className="font-medium text-blue-700">Agregar Componente</span>
          </div>
          {showAddComponents ? (
            <ChevronUp size={16} className="text-blue-600" />
          ) : (
            <ChevronDown size={16} className="text-blue-600" />
          )}
        </button>

        {/* Lista de componentes disponibles */}
        {showAddComponents && (
          <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="text-xs text-gray-600 mb-2">
              Selecciona un componente para agregar al contenedor:
            </div>
            
            {availableComponents.map((comp) => {
              const IconComponent = comp.icon;
              return (
                <button
                  key={comp.type}
                  onClick={() => handleAddComponent(comp.type)}
                  className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors group"
                >
                  <div 
                    className="p-2 rounded-lg"
                    style={{ 
                      backgroundColor: `${comp.color}15`,
                      border: `1px solid ${comp.color}30`
                    }}
                  >
                    <IconComponent 
                      size={16} 
                      style={{ color: comp.color }}
                    />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm text-gray-800 group-hover:text-gray-900">
                      {comp.name}
                    </div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-600">
                      {comp.description}
                    </div>
                  </div>
                  
                  <Plus size={14} className="text-gray-400 group-hover:text-gray-600" />
                </button>
              );
            })}
            
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500 text-center">
                Los componentes se agregarán automáticamente según el modo del contenedor
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Información de ayuda */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-xs text-gray-600">
          <div className="font-medium mb-1">💡 Consejos:</div>
          <ul className="space-y-1 text-xs">
            <li>• También puedes arrastrar componentes desde la barra lateral</li>
            <li>• Los componentes se posicionarán automáticamente según el modo del contenedor</li>
            <li>• En modo libre puedes mover los componentes libremente</li>
            <li>• En modo flex/grid se organizan automáticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ContainerContentPanel;