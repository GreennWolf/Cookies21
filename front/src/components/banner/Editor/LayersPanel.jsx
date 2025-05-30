// LayersPanel.jsx - FASE 5: Panel de Capas/Jerarquía con Z-Index dinámico (estilo Photoshop)
import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
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
  onMoveToContainer,
  onMoveOutOfContainer,
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
  
  const handleDragEnd = useCallback((e) => {
    setIsDragging(false);
    setDragOverPosition(null);
    
    // Limpiar cualquier indicación visual residual
    e.currentTarget.style.opacity = '1';
    
    // Emitir evento personalizado para limpiar estados globales
    window.dispatchEvent(new CustomEvent('dragend:cleanup'));
  }, []);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDragging) return; // No permitir drop sobre sí mismo
    
    // Si es un contenedor, mostrar indicación especial para mover dentro
    if (component.type === 'container') {
      setDragOverPosition('container');
    } else {
      // Para otros componentes, mostrar reordenamiento normal
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'above' : 'below';
      setDragOverPosition(position);
    }
  }, [isDragging, component.type]);
  
  const handleDragLeave = useCallback((e) => {
    // Solo limpiar si realmente salimos del elemento, no durante el drop
    const currentTarget = e.currentTarget; // Capturar la referencia antes del timeout
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    setTimeout(() => {
      // Verificar que el elemento aún existe
      if (!currentTarget) {
        setDragOverPosition(null);
        return;
      }
      
      try {
        const rect = currentTarget.getBoundingClientRect();
        
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
          setDragOverPosition(null);
        }
      } catch (error) {
        // Si hay error obteniendo el rect, limpiar el estado
        setDragOverPosition(null);
      }
    }, 50); // Pequeño delay para que el drop se procese primero
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Limpiar inmediatamente el estado visual
    setDragOverPosition(null);
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      const sourceRealIndex = dragData.sourceIndex; // Índice real en el array original
      const targetRealIndex = arrayIndex; // Índice real del target
      const sourceComponentId = dragData.componentId;
      
      // Si el target es un contenedor y es diferente del source, mover al contenedor
      if (component.type === 'container' && sourceComponentId !== component.id) {
        
        // Usar la nueva función mejorada con validación
        if (typeof onMoveToContainer === 'function') {
          const success = onMoveToContainer(sourceComponentId, component.id);
          if (success) {
          } else {
            console.error('❌ Movimiento bloqueado por validación');
            // Aquí podrías mostrar feedback visual al usuario
          }
        } else {
          console.error('❌ onMoveToContainer no es una función:', onMoveToContainer);
        }
      } else {
        // Reordenamiento normal
        let newRealIndex = targetRealIndex;
        if (dragOverPosition === 'below') {
          newRealIndex = targetRealIndex + 1;
        }
        
        // Permitir reordenamiento si los índices son diferentes
        if (sourceRealIndex !== newRealIndex) {
          onReorder(sourceRealIndex, newRealIndex);
        }
      }
    } catch (error) {
      console.error('❌ Error en drop:', error);
    }
  }, [arrayIndex, dragOverPosition, onReorder, component.type, component.id, onMoveToContainer]);
  
  if (!matchesSearch) return null;
  
  return (
    <div className="relative">
      {/* Indicador de drop arriba */}
      {dragOverPosition === 'above' && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 z-50"></div>
      )}
      
      {/* Indicador de drop en contenedor */}
      {dragOverPosition === 'container' && !isDragging && (
        <div className="absolute inset-0 border-2 border-green-500 bg-green-50 bg-opacity-50 rounded z-40 flex items-center justify-center animate-pulse pointer-events-none">
          <span className="text-green-700 font-medium text-xs bg-green-100 px-2 py-1 rounded shadow flex items-center gap-1">
            📦 Mover al contenedor
            {component.children && component.children.length > 0 && (
              <span className="text-green-600">({component.children.length} hijos)</span>
            )}
          </span>
        </div>
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
              onMoveToContainer={onMoveToContainer}
              onMoveOutOfContainer={onMoveOutOfContainer}
              arrayIndex={index}
            />
          ))}
        </div>
      )}
    </div>
  );
});

LayerItem.displayName = 'LayerItem';

// Hook para limpiar timeouts al desmontar
const useCleanupOnUnmount = (timeoutRefs) => {
  useEffect(() => {
    return () => {
      // Limpiar todos los timeouts al desmontar
      timeoutRefs.forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });
    };
  }, []);
};

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
  onMoveToContainer,
  onMoveOutOfContainer,
  onClose,
  // Nuevas props opcionales para feedback
  showValidationErrors = true,
  onValidationError = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedContainers, setExpandedContainers] = useState({});
  const [isDragOverMain, setIsDragOverMain] = useState(false);
  const [canMoveOutOfContainer, setCanMoveOutOfContainer] = useState(false);
  const dragLeaveTimeoutRef = useRef(null);
  const dropProcessedRef = useRef(false);
  
  // Limpiar timeouts al desmontar
  useCleanupOnUnmount([dragLeaveTimeoutRef]);
  
  // Listener global para limpiar estados cuando termine cualquier drag
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDragOverMain(false);
      setCanMoveOutOfContainer(false);
      dropProcessedRef.current = false;
    };
    
    window.addEventListener('dragend:cleanup', handleGlobalDragEnd);
    
    // También escuchar el evento nativo dragend
    document.addEventListener('dragend', handleGlobalDragEnd);
    
    return () => {
      window.removeEventListener('dragend:cleanup', handleGlobalDragEnd);
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);
  
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
  
  // Manejadores para mover componentes fuera de contenedores
  const handleMainDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Cancelar timeout de drag leave si existe
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
      dragLeaveTimeoutRef.current = null;
    }
    
    // Solo mostrar indicación si el componente está en un contenedor
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      const sourceComponentId = dragData.componentId;
      
      if (sourceComponentId) {
        // Verificar si el componente está en un contenedor
        const findComponentParent = (components, targetId) => {
          for (const comp of components) {
            if (comp.children) {
              const childIndex = comp.children.findIndex(child => child.id === targetId);
              if (childIndex !== -1) {
                return comp.id; // Retornar ID del contenedor padre
              }
              // Buscar recursivamente
              const parentId = findComponentParent(comp.children, targetId);
              if (parentId) return parentId;
            }
          }
          return null;
        };
        
        const parentId = findComponentParent(bannerConfig.components, sourceComponentId);
        
        // Solo mostrar indicación si está en un contenedor
        if (parentId) {
          setIsDragOverMain(true);
          setCanMoveOutOfContainer(true);
        } else {
          setCanMoveOutOfContainer(false);
        }
      }
    } catch (error) {
      // Si no se puede parsear dragData, no mostrar indicación
    }
  }, [bannerConfig.components]);
  
  const handleMainDragLeave = useCallback((e) => {
    // Cancelar timeout anterior si existe
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
    }
    
    // Usar timeout para evitar parpadeos
    dragLeaveTimeoutRef.current = setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setIsDragOverMain(false);
        setCanMoveOutOfContainer(false);
      }
    }, 100);
  }, []);
  
  const handleMainDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevenir procesamiento múltiple
    if (dropProcessedRef.current) {
      return;
    }
    
    dropProcessedRef.current = true;
    
    // Limpiar estados inmediatamente
    setIsDragOverMain(false);
    setCanMoveOutOfContainer(false);
    
    // Cancelar timeout de drag leave si existe
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
      dragLeaveTimeoutRef.current = null;
    }
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      const sourceComponentId = dragData.componentId;
      
      
      // Verificar si el componente está en un contenedor
      const findComponentParent = (components, targetId) => {
        for (const comp of components) {
          if (comp.children) {
            const childIndex = comp.children.findIndex(child => child.id === targetId);
            if (childIndex !== -1) {
              return comp.id; // Retornar ID del contenedor padre
            }
            // Buscar recursivamente
            const parentId = findComponentParent(comp.children, targetId);
            if (parentId) return parentId;
          }
        }
        return null;
      };
      
      const parentId = findComponentParent(bannerConfig.components, sourceComponentId);
      
      if (parentId && onMoveOutOfContainer) {
        onMoveOutOfContainer(sourceComponentId, parentId);
      } else if (!parentId) {
        // Mostrar feedback visual de que el componente ya es independiente
        setIsDragOverMain(false);
        setCanMoveOutOfContainer(false);
      } else {
        console.warn('❌ No se puede mover el componente fuera del contenedor - función no disponible');
        // Mostrar error si no se puede mover
        if (onValidationError) {
          onValidationError('No se puede mover el componente fuera del contenedor');
        }
      }
    } catch (error) {
      console.error('❌ Error al sacar componente del contenedor:', error);
    } finally {
      // Resetear flag después de un breve delay
      setTimeout(() => {
        dropProcessedRef.current = false;
      }, 100);
    }
  }, [bannerConfig.components, onMoveOutOfContainer, onValidationError]);
  
  return (
    <div 
      className={`w-64 bg-white border-r h-full flex flex-col relative ${
        isDragOverMain ? 'bg-orange-50 border-orange-300' : ''
      }`}
      onDragOver={handleMainDragOver}
      onDragLeave={handleMainDragLeave}
      onDrop={handleMainDrop}
    >
      {/* Indicador visual para sacar del contenedor */}
      {isDragOverMain && canMoveOutOfContainer && (
        <div className="absolute inset-0 border-2 border-orange-500 bg-orange-100 bg-opacity-30 z-50 flex items-center justify-center pointer-events-none animate-pulse">
          <div className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2">
            📤 Sacar del contenedor
            <span className="text-orange-100 text-xs">(Convertir a independiente)</span>
          </div>
        </div>
      )}
      
      {/* Indicador cuando no se puede mover fuera */}
      {isDragOverMain && !canMoveOutOfContainer && (
        <div className="absolute inset-0 border-2 border-gray-400 bg-gray-100 bg-opacity-30 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2">
            ℹ️ Ya es independiente
          </div>
        </div>
      )}
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
                  onMoveToContainer={onMoveToContainer}
                  onMoveOutOfContainer={onMoveOutOfContainer}
                  arrayIndex={realIndex} // Usar el índice real del array original
                />
              );
            })}
          </div>
        )}
      </div>
      
      {/* Info del z-index */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center gap-1 mb-1">
          <Move size={12} />
          <span>Arrastra para reordenar • Arriba = Mayor z-index</span>
        </div>
        <div className="flex items-center gap-1">
          <Container size={12} className="text-green-600" />
          <span>Arrastra hacia contenedores para mover dentro</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>Arrastra al panel para sacar de contenedor</span>
        </div>
      </div>
    </div>
  );
});

LayersPanel.displayName = 'LayersPanel';

export default memo(LayersPanel);