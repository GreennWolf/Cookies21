# 🔧 NUEVA IMPLEMENTACIÓN: MOUSE EVENTS PARA DRAG DE COMPONENTES HIJOS

## 🎯 **PROBLEMA IDENTIFICADO**
La implementación anterior con HTML5 Drag & Drop API (`draggable={true}`, `onDragStart`, `onDrag`, `onDragEnd`) estaba interfiriendo con:
- El sistema de resize de contenedores
- El posicionamiento manual que ya funciona en BannerCanvas
- Los eventos de mouse del contenedor padre

## 🔧 **NUEVA SOLUCIÓN: MOUSE EVENTS**

### **1. Enfoque Unificado**
Cambié de HTML5 Drag & Drop API a **mouse events** (`onMouseDown`, `mousemove`, `mouseup`) que es el mismo sistema que usa BannerCanvas y ya está probado.

### **2. Implementación Mouse Events**

```jsx
// NUEVO ENFOQUE: Mouse events en lugar de HTML5 drag & drop
const handleChildMouseDown = (e, child, displayMode) => {
  if (displayMode !== 'libre' || child.locked) return;
  
  // ✅ Verificar que no sea un handle de resize
  const target = e.target;
  const computedStyle = window.getComputedStyle(target);
  if (computedStyle.cursor.includes('resize')) {
    return; // No manejar drag si es un handle de resize
  }
  
  e.stopPropagation(); // Evitar que interfiera con el drag del contenedor padre
  e.preventDefault();
  
  // Calcular offset del cursor relativo al hijo
  const childRect = e.currentTarget.getBoundingClientRect();
  const containerRect = containerRef.current.getBoundingClientRect();
  
  // Estados de drag
  setIsChildDragging(true);
  setDraggedChild(child);
  isDraggingChildRef.current = true;
  
  // Efectos visuales
  document.body.style.cursor = 'grabbing';
  e.currentTarget.style.opacity = '0.7';
  
  // ✅ Listeners globales (como en BannerCanvas)
  const handleMouseMove = (moveEvent) => {
    // Calcular nueva posición relativa al contenedor
    // Limitar dentro del contenedor
    // Convertir a porcentajes
    // Actualizar posición en tiempo real
  };
  
  const handleMouseUp = () => {
    // Limpiar estados
    // Restaurar cursor y opacidad
    // Remover listeners
  };
  
  // Agregar listeners globales
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
```

### **3. Detección de Conflictos con Resize**

```jsx
// ✅ En el onMouseDown del componente hijo
onMouseDown={(e) => {
  // Verificar que el click sea directamente en el componente hijo, no en elementos de control
  if (e.target.closest('[data-resize-handle]') || 
      e.target.closest('.resize-handle') ||
      e.target.style.cursor.includes('resize')) {
    return; // No procesar si es un control de resize
  }
  
  // En modo libre, iniciar drag con mouse events
  if (displayMode === 'libre' && !child.locked) {
    handleChildMouseDown(e, child, displayMode);
  }
}}

// ✅ Handles de resize marcados correctamente
<div 
  className="resize-handle"
  data-resize-handle="true"
  style={{ cursor: 'nwse-resize' }}
  onMouseDown={handleResizeStart}
>
```

### **4. Ventajas del Nuevo Enfoque**

#### ✅ **Compatible con BannerCanvas**
- Usa el mismo sistema de mouse events que ya funciona
- No interfiere con el drag de componentes principales
- Mantiene la arquitectura existente

#### ✅ **Preserva Funcionalidad de Resize**
- Los handles de resize siguen funcionando normalmente
- Detección inteligente de conflictos
- No hay interferencia entre drag y resize

#### ✅ **Control Granular**
- Detección precisa de área de click
- Diferenciación clara entre hijo y contenedor
- Prevención de propagación de eventos

#### ✅ **Efectos Visuales Mejorados**
- Cursor apropiado durante drag (grab/grabbing)
- Opacidad y escala durante el movimiento
- zIndex temporal para elevar el elemento

### **5. Flujo de Funcionamiento**

```
1. Usuario hace mouseDown en componente hijo (modo libre)
   ↓
2. Verificar que NO es handle de resize
   ↓
3. e.stopPropagation() para evitar drag del contenedor
   ↓
4. Calcular offset del cursor
   ↓
5. Agregar listeners globales (mousemove, mouseup)
   ↓
6. Durante mousemove: calcular nueva posición, actualizar estado
   ↓
7. Durante mouseup: limpiar estados, remover listeners
```

### **6. Estados y Referencias**

```jsx
// Estados para el nuevo enfoque
const [isChildDragging, setIsChildDragging] = useState(false);
const [childDragOffset, setChildDragOffset] = useState({ x: 0, y: 0 });
const [draggedChild, setDraggedChild] = useState(null);
const childDragRef = useRef(null);
const isDraggingChildRef = useRef(false);
```

### **7. Integración con Sistema Existente**

```jsx
// ✅ Misma función updateChildPosition del hook
if (onUpdateChildPosition) {
  onUpdateChildPosition(child.id, component.id, {
    top: `${topPercent.toFixed(2)}%`,
    left: `${leftPercent.toFixed(2)}%`,
    percentX: parseFloat(leftPercent.toFixed(2)),
    percentY: parseFloat(topPercent.toFixed(2))
  });
}

// ✅ Misma cadena de props
useBannerEditor → BannerEditor → BannerCanvas → ComponentRenderer
```

## 🎯 **RESULTADO ESPERADO**

### ✅ **LO QUE DEBE FUNCIONAR AHORA**

1. **Drag de componentes hijos**: Mouse down → drag → posicionamiento dentro del contenedor
2. **Resize de contenedores**: Los handles de resize funcionan sin interferencia
3. **Drag de contenedores**: El contenedor padre se puede mover sin afectar hijos
4. **Selección de hijos**: Click simple selecciona el hijo para edición
5. **Efectos visuales**: Cursor, opacidad y escala durante las operaciones

### ✅ **SEPARACIÓN CLARA DE RESPONSABILIDADES**

- **Mouse Events**: Para drag de hijos dentro de contenedores
- **HTML5 Drag & Drop**: Solo para drag desde sidebar hacia canvas/contenedores
- **Resize Handles**: Eventos específicos sin interferencia
- **Click Events**: Para selección y edición

## 📊 **ESTADO ACTUAL**

- ✅ **Enfoque de mouse events implementado**: **COMPLETADO**
- ✅ **Detección de conflictos con resize**: **IMPLEMENTADO**
- ✅ **Handles de resize marcados**: **COMPLETADO**
- ✅ **Integración con sistema existente**: **MANTENIDO**
- ✅ **Limpieza de código anterior**: **REALIZADA**

**READY FOR TESTING** 🚀