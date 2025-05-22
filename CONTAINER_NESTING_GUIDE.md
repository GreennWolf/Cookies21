# Sistema de Anidamiento de Contenedores - FASE 4

## Descripción General

El sistema robusto de anidamiento de contenedores permite crear estructuras complejas de banners con contenedores anidados de hasta 5 niveles de profundidad, con validaciones inteligentes que previenen loops circulares y errores de configuración.

## Características Principales

### 🔒 Validaciones de Seguridad
- **Profundidad máxima**: Límite de 5 niveles de anidamiento
- **Prevención de loops circulares**: Detecta y previene referencias circulares
- **Validación en tiempo real**: Retroalimentación inmediata durante drag & drop
- **Mensajes de error claros**: Explicaciones detalladas de por qué falló una operación

### 🎨 Indicadores Visuales
- **Bordes de nivel**: Cada nivel tiene un color distintivo
- **Etiquetas de profundidad**: Indicadores visuales del nivel actual
- **Retroalimentación de drop**: Indicadores de estado durante arrastre

### ⚡ Rendimiento Optimizado
- **Validación eficiente**: Algoritmos optimizados para estructuras complejas
- **Búsqueda recursiva**: Manejo eficiente de componentes anidados
- **Caché de validación**: Evita recálculos innecesarios

## Archivos Clave

### Validación Principal
- `front/src/utils/containerValidationUtils.js` - Sistema de validación robusto
- `front/src/components/banner/Editor/containerDropValidation.js` - Validaciones específicas de drop

### Componentes
- `front/src/components/banner/Editor/ComponentRenderer.jsx` - Renderizado con soporte para anidamiento
- `front/src/components/banner/Editor/hooks/useBannerEditor.js` - Hook con funciones de anidamiento

### Pruebas
- `front/src/utils/containerNestingTest.js` - Casos de prueba y ejemplos

## Funciones Principales

### `validateContainerNesting(parentContainer, childComponent, allComponents)`
Validación completa para operaciones de anidamiento.

```javascript
import { validateContainerNesting } from './utils/containerValidationUtils';

const result = validateContainerNesting(
  parentContainer,  // Contenedor donde se quiere agregar
  childComponent,   // Componente a agregar
  allComponents     // Todos los componentes para validación de loops
);

if (result.isValid) {
  // Proceder con la operación
  console.log('Profundidad resultante:', result.details.resultingDepth);
} else {
  // Manejar error
  console.error('Error:', result.reason);
}
```

### `calculateNestingDepth(component, allComponents)`
Calcula la profundidad de anidamiento de un componente.

```javascript
import { calculateNestingDepth } from './utils/containerValidationUtils';

const depth = calculateNestingDepth(component, allComponents);
console.log(`Componente está en el nivel ${depth}`);
```

### `detectCircularReference(parentContainer, childComponent, allComponents)`
Detecta referencias circulares potenciales.

```javascript
import { detectCircularReference } from './utils/containerValidationUtils';

const circularCheck = detectCircularReference(parent, child, allComponents);
if (circularCheck.hasLoop) {
  console.warn('Loop detectado:', circularCheck.loopPath);
}
```

## Reglas de Validación

### 1. Profundidad Máxima
- **Límite**: 5 niveles de anidamiento
- **Comportamiento**: Rechaza operaciones que excedan el límite
- **Mensaje**: "Se ha alcanzado la profundidad máxima de anidamiento (5 niveles)"

### 2. Referencias Circulares
- **Prevención**: Un contenedor no puede contener a sus ancestros
- **Detección**: Análisis de cadena de ancestros
- **Mensaje**: "Crear este anidamiento formaría un loop circular: A → B → A"

### 3. Auto-contenimiento
- **Regla**: Un contenedor no puede contenerse a sí mismo
- **Mensaje**: "Un contenedor no puede contenerse a sí mismo"

### 4. Límites por Modo
- **Modo libre**: Máximo 10 componentes
- **Modo flex**: Máximo 8 componentes  
- **Modo grid**: Basado en configuración de grid

## Indicadores Visuales

### Niveles de Anidamiento
- **Nivel 1**: 🔵 Azul (`#3b82f6`) - ▫️
- **Nivel 2**: 🟢 Verde (`#10b981`) - ▪️
- **Nivel 3**: 🟡 Amarillo (`#f59e0b`) - 🔸
- **Nivel 4**: 🔴 Rojo (`#ef4444`) - 🔺
- **Nivel 5**: 🟣 Púrpura (`#8b5cf6`) - ⬨
- **Excedido**: ⚠️ Rojo intenso (`#dc2626`)

### Estados de Drag & Drop
- **Válido**: Borde verde con indicador de posición
- **Inválido**: Mensaje de error con fondo rojo
- **Advertencia**: Indicador amarillo para límites próximos

## Uso en ComponentRenderer

```jsx
import { ComponentRenderer } from './components/banner/Editor/ComponentRenderer';

<ComponentRenderer
  component={component}
  deviceView={deviceView}
  allComponents={getAllComponentsFlattened()} // Importante para validación
  onAddChild={addChildToContainer}
  // ... otras props
/>
```

## Casos de Uso Comunes

### 1. Crear Estructura Compleja
```
Banner Root
├── Header Container (Nivel 1)
│   ├── Logo Image (Nivel 2)
│   └── Navigation Container (Nivel 2)
│       ├── Nav Button 1 (Nivel 3)
│       └── Nav Button 2 (Nivel 3)
├── Content Container (Nivel 1)
│   ├── Text Block (Nivel 2)
│   └── Action Container (Nivel 2)
│       ├── Primary Button (Nivel 3)
│       └── Secondary Button (Nivel 3)
└── Footer Text (Nivel 1)
```

### 2. Validar antes de Modificar
```javascript
// Antes de agregar un componente
const validation = validateContainerNesting(targetContainer, newComponent, allComponents);

if (!validation.isValid) {
  const errorMessage = formatNestingErrorMessage(validation);
  showUserError(errorMessage);
  return;
}

// Proceder con la operación segura
addChildToContainer(targetContainer.id, newComponent);
```

## Mensajes de Error Personalizados

### Tipos de Error
1. **NOT_CONTAINER**: Destino no es un contenedor
2. **MAX_DEPTH_EXCEEDED**: Profundidad máxima alcanzada
3. **CIRCULAR_REFERENCE**: Referencia circular detectada
4. **RESULTING_DEPTH_EXCEEDED**: Anidamiento resultante muy profundo
5. **MAX_CHILDREN_EXCEEDED**: Contenedor lleno

### Formato de Mensaje
```javascript
{
  title: "❌ No se puede realizar esta acción",
  description: "Descripción del problema",
  suggestion: "Sugerencia para resolverlo",
  technicalDetails: "Información técnica adicional"
}
```

## Pruebas y Debugging

### Ejecutar Pruebas
```javascript
// En la consola del navegador
window.testContainerNesting(); // Ejecuta todas las pruebas
window.testDragValidation();   // Prueba validación de drag & drop
```

### Debug de Estructura
```javascript
import { debugNestingStructure } from './utils/containerValidationUtils';

// Mostrar estructura completa en consola
debugNestingStructure(components);
```

### Ejemplo de Output
```
container[container-root] - Depth: 0
  container[container-level1-a] - Depth: 1
    container[container-level2-a] - Depth: 2
      text[text-level3-a] - Depth: 3
      button[button-level3-a] - Depth: 3
    text[text-level2-a] - Depth: 2
  container[container-level1-b] - Depth: 1
    image[image-level2-b] - Depth: 2
button[button-root] - Depth: 0
```

## Consideraciones de Rendimiento

### Optimizaciones Implementadas
- **Búsqueda eficiente**: Algoritmos O(n) para búsqueda de componentes
- **Caché de validación**: Evita recálculos de profundidad
- **Validación lazy**: Solo valida cuando es necesario
- **Eventos optimizados**: Batching de actualizaciones

### Mejores Prácticas
1. **Limitar profundidad**: Usar máximo 3-4 niveles para mejor UX
2. **Estructuras planas**: Preferir estructuras horizontales cuando sea posible
3. **Validación temprana**: Validar antes de operaciones costosas
4. **Cleanup**: Limpiar listeners y referencias cuando no se necesiten

## Integración con Otros Sistemas

### Con BannerEditor
- Se integra automáticamente con el hook `useBannerEditor`
- Usa `getAllComponentsFlattened()` para obtener todos los componentes
- Maneja eventos de actualización de estructura

### Con Drag & Drop
- Validación en tiempo real durante `dragover`
- Indicadores visuales durante el arrastre
- Prevención de drops inválidos

### Con Sistema de Estilos
- Bordes automáticos basados en nivel de anidamiento
- Indicadores de profundidad
- Colores distintivos por nivel

## Extensiones Futuras

### Posibles Mejoras
1. **Undo/Redo**: Sistema de historial para anidamiento
2. **Plantillas**: Estructuras predefinidas de contenedores
3. **Validación avanzada**: Reglas específicas por tipo de banner
4. **Exportación**: Serialización optimizada de estructuras anidadas
5. **Análisis**: Métricas de complejidad de estructura

### API Adicional
```javascript
// Futuras funciones
moveComponentToContainer(componentId, targetContainerId);
flattenContainerStructure(containerId);
optimizeNestingStructure(components);
generateNestingReport(components);
```

## Soporte y Troubleshooting

### Problemas Comunes
1. **Validación fallida**: Verificar que `allComponents` incluya todos los componentes
2. **Loops no detectados**: Asegurar que `parentId` esté correctamente configurado
3. **Indicadores no aparecen**: Verificar que el CSS no esté siendo sobrescrito

### Debug Steps
1. Verificar estructura de datos con `debugNestingStructure()`
2. Ejecutar pruebas con `window.testContainerNesting()`
3. Revisar mensajes de error en consola
4. Validar props en ComponentRenderer

---

**Nota**: Este sistema está diseñado para ser robusto y prevenir errores comunes en estructuras de contenedores anidados. Siempre valida antes de realizar operaciones de modificación de estructura.