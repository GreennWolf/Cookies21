// LayersPanel.jsx - FASE 5: Panel de Capas/Jerarquía con Z-Index dinámico (estilo Photoshop)
import React, { useState, useCallback, useMemo, memo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  Type,
  Square,
  Image as ImageIcon,
  Box,
  Container,
  Edit3,
  Move,
  Trash2,
  Search,
  X
} from 'lucide-react';

// Iconos para diferentes tipos de componentes
const getComponentIcon = (type) => {
  switch (type) {
    case 'text': return <Type size={16} className="text-blue-500" />;
    case 'button': return <Square size={16} className="text-green-500" />;
    case 'image': return <ImageIcon size={16} className="text-purple-500" />;
    case 'container': return <Container size={16} className="text-orange-500" />;
    default: return <Box size={16} className="text-gray-500" />;
  }
};

// Función para obtener el nombre a mostrar del componente
const getComponentDisplayName = (component) => {
  // Si tiene nombre personalizado, usarlo
  if (component.name) return component.name;
  
  // Nombres específicos por ID (componentes del sistema)
  if (component.id === 'acceptBtn') return 'Botón Aceptar';
  if (component.id === 'rejectBtn') return 'Botón Rechazar';
  if (component.id === 'preferencesBtn') return 'Botón Preferencias';
  if (component.id === 'mainText') return 'Texto Principal';
  if (component.id === 'titleText') return 'Título';
  if (component.id === 'logoImage') return 'Logo';
  
  // Para otros componentes, usar el contenido si existe
  if (component.content && typeof component.content === 'string') {
    const trimmed = component.content.trim();
    if (trimmed.length > 0) {
      if (trimmed.length > 25) return trimmed.substring(0, 25) + '...';
      return trimmed;
    }
  }
  
  // Nombres por tipo como último recurso
  const typeNames = {
    'text': 'Texto',
    'button': 'Botón',
    'image': 'Imagen',
    'container': 'Contenedor'
  };
  
  return typeNames[component.type] || `Componente ${component.type}`;
};

// Componente individual de capa con drag & drop corregido
const LayerItem = memo(({ 
  component, 
  level = 0, 
  isSelected, 
  onSelect, 
  onToggleVisibility, 
  onToggleLock, 
  onRename, 
  onDelete,
  searchTerm,
  expandedContainers,
  onToggleExpanded,
  zIndexNumber,
  onReorder,
  arrayIndex
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(getComponentDisplayName(component));
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverPosition, setDragOverPosition] = useState(null);
  
  const hasChildren = component.children && component.children.length > 0;
  const isExpanded = expandedContainers[component.id];
  const isVisible = component.visible !== false;
  const isLocked = component.locked === true;
  const displayName = getComponentDisplayName(component);
  
  // Filtrar componente por búsqueda
  const matchesSearch = useMemo(() => {
    if (!searchTerm) return true;
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  }, [displayName, searchTerm]);
  
  // Manejar renombrado
  const handleRename = useCallback(() => {
    if (editName.trim() !== displayName) {
      onRename(component.id, editName.trim());
    }
    setIsEditing(false);
  }, [component.id, editName, displayName, onRename]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(displayName);
      setIsEditing(false);
    }
  }, [handleRename, displayName]);
  
  // Drag & Drop handlers corregidos
  const handleDragStart = useCallback((e) => {
    if (isEditing) {
      e.preventDefault();
      return;
    }
    
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      componentId: component.id,
      sourceIndex: arrayIndex
    }));
    
    // Drag iniciado
  }, [component.id, arrayIndex, isLocked, isEditing]);
  
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragOverPosition(null);
  }, []);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDragging) return; // No permitir drop sobre sí mismo
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';
    
    setDragOverPosition(position);
  }, [isDragging]);
  
  const handleDragLeave = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverPosition(null);
    }
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      const sourceRealIndex = dragData.sourceIndex; // Índice real en el array original
      const targetRealIndex = arrayIndex; // Índice real del target
      
      let newRealIndex = targetRealIndex;
      if (dragOverPosition === 'below') {
        newRealIndex = targetRealIndex + 1;
      }
      
      // Permitir reordenamiento si los índices son diferentes
      if (sourceRealIndex !== newRealIndex) {
        // Reordenando componentes
        
        onReorder(sourceRealIndex, newRealIndex);
      }
    } catch (error) {
      // Error en drop
    }
    
    setDragOverPosition(null);
  }, [arrayIndex, dragOverPosition, onReorder]);
  
  if (!matchesSearch) return null;
  
  return (
    <div className="relative">
      {/* Indicador de drop arriba */}
      {dragOverPosition === 'above' && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 z-50"></div>
      )}
      
      <div
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          group flex items-center justify-between py-2 px-2 hover:bg-gray-50 cursor-pointer
          ${isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : ''}
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${dragOverPosition ? 'bg-blue-50' : ''}
          ${isLocked ? 'cursor-not-allowed opacity-75' : ''}
        `}
        style={{ paddingLeft: `${(level * 20) + 8}px` }}
        onClick={() => !isEditing && onSelect(component)}
        onDoubleClick={() => setIsEditing(true)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Icono de expansión para contenedores */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded(component.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-gray-600" />
              ) : (
                <ChevronRight size={14} className="text-gray-600" />
              )}
            </button>
          )}
          
          {/* Icono del tipo de componente */}
          <div className="flex-shrink-0">
            {getComponentIcon(component.type)}
          </div>
          
          {/* Z-Index indicator */}
          <span className="text-xs text-gray-400 font-mono min-w-[30px] bg-gray-100 px-1.5 py-0.5 rounded">
            z:{zIndexNumber}
          </span>
          
          {/* Nombre del componente */}
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm bg-white border rounded px-1 py-0.5"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`flex-1 text-sm truncate ${!isVisible ? 'italic text-gray-400' : ''}`}>
              {displayName}
            </span>
          )}
          
          {/* Icono de drag handle */}
          {!isEditing && (
            <Move size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          )}
        </div>
        
        {/* Controles */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Visibilidad */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(component.id);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title={isVisible ? 'Ocultar' : 'Mostrar'}
          >
            {isVisible ? (
              <Eye size={12} className="text-blue-500" />
            ) : (
              <EyeOff size={12} className="text-gray-400" />
            )}
          </button>
          
          {/* Bloqueo */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(component.id);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title={isLocked ? 'Desbloquear' : 'Bloquear'}
          >
            {isLocked ? (
              <Lock size={12} className="text-red-500" />
            ) : (
              <Unlock size={12} className="text-green-500" />
            )}
          </button>
          
          {/* Eliminar - ocultar para componentes obligatorios */}
          {!['acceptBtn', 'rejectBtn', 'preferencesBtn', 'mainText', 'titleText'].includes(component.id) && 
           !(component.locked && component.action && ['accept_all', 'reject_all', 'show_preferences'].includes(component.action.type)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                
                // Verificar si es un componente obligatorio
                const isEssentialByAction = component.action && ['accept_all', 'reject_all', 'show_preferences'].includes(component.action.type);
                const isEssentialById = ['acceptBtn', 'rejectBtn', 'preferencesBtn', 'acceptAll', 'rejectAll', 'preferencesButton'].includes(component.id);
                const isEssential = isEssentialByAction || isEssentialById;
                
                const actionText = isEssential ? 'sacar del contenedor' : 'eliminar';
                const confirmText = `¿${actionText.charAt(0).toUpperCase() + actionText.slice(1)} "${displayName}"?`;
                
                if (window.confirm(confirmText)) {
                  onDelete(component.id); // La lógica de desadjuntar vs eliminar se maneja en handleDeleteComponent
                }
              }}
              className="p-1 hover:bg-red-100 rounded"
              title={
                (component.action && ['accept_all', 'reject_all', 'show_preferences'].includes(component.action.type)) ||
                ['acceptBtn', 'rejectBtn', 'preferencesBtn', 'acceptAll', 'rejectAll', 'preferencesButton'].includes(component.id)
                  ? 'Sacar del contenedor'
                  : 'Eliminar'
              }
            >
              <Trash2 size={12} className={
                (component.action && ['accept_all', 'reject_all', 'show_preferences'].includes(component.action.type)) ||
                ['acceptBtn', 'rejectBtn', 'preferencesBtn', 'acceptAll', 'rejectAll', 'preferencesButton'].includes(component.id)
                  ? 'text-orange-500' 
                  : 'text-red-500'
              } />
            </button>
          )}
        </div>
      </div>
      
      {/* Indicador de drop abajo */}
      {dragOverPosition === 'below' && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 z-50"></div>
      )}
      
      {/* Hijos del contenedor */}
      {hasChildren && isExpanded && (
        <div>
          {component.children.map((child, index) => (
            <LayerItem
              key={child.id}
              component={child}
              level={level + 1}
              isSelected={child.id === (typeof component === 'object' ? component.id : null)}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onRename={onRename}
              onDelete={onDelete}
              searchTerm={searchTerm}
              expandedContainers={expandedContainers}
              onToggleExpanded={onToggleExpanded}
              zIndexNumber={10 + (component.children.length - index)}
              onReorder={onReorder}
              arrayIndex={index}
            />
          ))}
        </div>
      )}
    </div>
  );
});

LayerItem.displayName = 'LayerItem';

// Componente principal del panel de capas
const LayersPanel = memo(({
  bannerConfig,
  selectedComponent,
  onSelectComponent,
  onToggleComponentVisibility,
  onToggleComponentLock,
  onRenameComponent,
  onReorderComponents,
  onDeleteComponent,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedContainers, setExpandedContainers] = useState({});
  
  // Auto-expandir contenedores al inicio
  const autoExpandContainers = useCallback(() => {
    const newExpanded = {};
    const expandContainersRecursively = (components) => {
      components.forEach(comp => {
        if (comp.type === 'container' && comp.children && comp.children.length > 0) {
          newExpanded[comp.id] = true;
          expandContainersRecursively(comp.children);
        }
      });
    };
    
    if (bannerConfig.components) {
      expandContainersRecursively(bannerConfig.components);
    }
    
    setExpandedContainers(newExpanded);
  }, [bannerConfig.components]);
  
  // Auto-expandir al cambiar configuración
  React.useEffect(() => {
    autoExpandContainers();
  }, [autoExpandContainers]);
  
  const handleToggleExpanded = useCallback((containerId) => {
    setExpandedContainers(prev => ({
      ...prev,
      [containerId]: !prev[containerId]
    }));
  }, []);
  
  const handleExpandAll = useCallback(() => {
    const newExpanded = {};
    const expandAll = (components) => {
      components.forEach(comp => {
        if (comp.type === 'container') {
          newExpanded[comp.id] = true;
          if (comp.children) {
            expandAll(comp.children);
          }
        }
      });
    };
    
    if (bannerConfig.components) {
      expandAll(bannerConfig.components);
    }
    
    setExpandedContainers(newExpanded);
  }, [bannerConfig.components]);
  
  const handleCollapseAll = useCallback(() => {
    setExpandedContainers({});
  }, []);
  
  const components = useMemo(() => bannerConfig.components || [], [bannerConfig.components]);
  
  // Función de reordenamiento simplificada
  const handleReorder = useCallback((sourceIndex, targetIndex) => {
    onReorderComponents(sourceIndex, targetIndex);
  }, [onReorderComponents]);
  
  return (
    <div className="w-64 bg-white border-r h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Container size={16} className="text-blue-500" />
            Panel de Capas
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {components.length} capas
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded"
                title="Cerrar panel de capas"
              >
                <X size={16} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>
        
        {/* Búsqueda */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-2 top-1.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar capas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border rounded pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        {/* Controles de expansión */}
        <div className="flex gap-1">
          <button
            onClick={handleExpandAll}
            className="flex-1 text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center gap-1"
            title="Expandir todo"
          >
            <ChevronDown size={12} />
            Expandir
          </button>
          <button
            onClick={handleCollapseAll}
            className="flex-1 text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center gap-1"
            title="Contraer todo"
          >
            <ChevronRight size={12} />
            Contraer
          </button>
        </div>
      </div>
      
      {/* Lista de capas */}
      <div className="flex-1 overflow-y-auto">
        {components.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No hay componentes en el banner
          </div>
        ) : (
          <div className="py-1">
            {/* Renderizar componentes en orden inverso - Photoshop style: arriba = mayor z-index */}
            {[...components].reverse().map((component, reverseIndex) => {
              const realIndex = components.length - 1 - reverseIndex;
              return (
                <LayerItem
                  key={component.id}
                  component={component}
                  level={0}
                  isSelected={selectedComponent?.id === component.id}
                  onSelect={onSelectComponent}
                  onToggleVisibility={onToggleComponentVisibility}
                  onToggleLock={onToggleComponentLock}
                  onRename={onRenameComponent}
                  onDelete={onDeleteComponent}
                  searchTerm={searchTerm}
                  expandedContainers={expandedContainers}
                  onToggleExpanded={handleToggleExpanded}
                  zIndexNumber={realIndex + 1 + 100} // El que está arriba en la lista = mayor z-index
                  onReorder={handleReorder}
                  arrayIndex={realIndex} // Usar el índice real del array original
                />
              );
            })}
          </div>
        )}
      </div>
      
      {/* Info del z-index */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Move size={12} />
          <span>Arrastra para reordenar • Arriba = Mayor z-index</span>
        </div>
      </div>
    </div>
  );
});

LayersPanel.displayName = 'LayersPanel';

export default memo(LayersPanel);