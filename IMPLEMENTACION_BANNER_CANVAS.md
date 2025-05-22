# Implementación del BannerCanvas

Este documento detalla las modificaciones realizadas para reemplazar la implementación actual del componente BannerCanvas por una versión basada en la implementación antigua, manteniendo las funcionalidades de modal flotante.

## Cambios principales

### 1. Modelo de Drag and Drop

Se ha reemplazado el sistema actual de drag and drop basado en eventos de mouse (mousedown, mousemove, mouseup) por el sistema antiguo basado en la API nativa de HTML5 Drag and Drop (dragstart, drag, dragend, drop).

**Ventajas:**
- Mayor compatibilidad con navegadores y sistemas operativos
- Menor complejidad en el código
- Experiencia de usuario más consistente
- Mejor integración con otros componentes arrastables

### 2. Sistema de Snap y Guidelines

Se ha implementado el sistema de snap y guidelines directamente en el componente (como en la versión antigua) pero con las siguientes mejoras:

- Se ha añadido un toggle para activar/desactivar el snap
- Se ha mejorado el sistema de "escape" de snap con teclas de flecha
- Se han mejorado las guías visuales para hacerlas más nítidas
- Se mantuvo el sistema de distancias entre componentes

### 3. Posicionamiento de Modal Flotante

Para mantener las funcionalidades de modal flotante, se han agregado los siguientes atributos al contenedor principal:

```jsx
data-layout-type={layout[deviceView]?.type || 'banner'}
data-floating-corner={layout[deviceView]?.floatingCorner || 'bottom-right'}
data-floating-margin={layout[deviceView]?.floatingMargin || '20'}
```

Estos atributos son utilizados por el servicio `ensureFloatingPosition.js` para aplicar el posicionamiento correcto a los modales flotantes.

### 4. Manejo de Imágenes

Se ha mejorado el soporte para imágenes, incluyendo:

- Manejo de blob URLs
- Soporte para arrastrar y soltar imágenes directamente
- Almacenamiento de imágenes temporales en la variable global `window._imageFiles`

### 5. Control de Componentes

Se han implementado mejoras en la interacción con componentes:

- Mejor sistema de selección y manipulación
- Soporte para escape de snap al usar teclas de flecha
- Mejor gestión de las colisiones entre componentes
- Panel de control para configuración de pasos de movimiento y resize

## Diferencias clave con la versión actual

1. **Abstracción del Drag and Drop**:
   - Versión actual: Usa un hook `useDragAndDrop` para abstraer la lógica
   - Nueva versión: Implementa la lógica directamente en el componente

2. **Eventos**:
   - Versión actual: Eventos de mouse (mousedown, mousemove, mouseup)
   - Nueva versión: API nativa de Drag and Drop (dragstart, drag, dragend, drop)

3. **Manejo de Referencias**:
   - Versión actual: Usa un objeto para las referencias
   - Nueva versión: Usa un Map para las referencias, manteniendo mejor el rendimiento

4. **Estilo y Visuales**:
   - Versión actual: Estilos en línea y clases
   - Nueva versión: Combinación de estilos en línea, clases y CSS en la etiqueta `<style>`

## Compatibilidad con el Posicionamiento Flotante

La implementación mantiene plena compatibilidad con el servicio `ensureFloatingPosition.js` que se encarga de posicionar correctamente los banners flotantes, mediante:

1. Atributos `data-` en el contenedor principal que guardan la información de posicionamiento
2. Soporte para los diferentes tipos de layout ('banner', 'modal', 'floating')
3. Mantenimiento de las clases CSS necesarias para el posicionamiento
4. Exportación de los mismos valores de configuración para el script de posicionamiento

## Mejoras en la UX

1. **Panel de Control**:
   - Toggle para activar/desactivar snap
   - Selector de paso de movimiento (1px, 5px, 10px, 20px)
   - Selector de paso de redimensionamiento

2. **Visuales**:
   - Guías de alineación más visibles (opacity: 0.7)
   - Animación para las guías de distancia (fadeIn)
   - Mejor feedback visual durante el arrastre (outline, box-shadow)

3. **Interacción**:
   - Mejor manejo del arrastre con teclas de flecha
   - Sistema más intuitivo para escapar del snap
   - Mejor manejo de los componentes seleccionados
   - Mayor precisión en el posicionamiento (toFixed(2) para porcentajes)

## Conclusión

La nueva implementación combina lo mejor de ambas versiones, proporcionando una experiencia más estable y consistente, manteniendo todas las funcionalidades importantes y mejorando la usabilidad general del editor de banners. El código es más directo y menos propenso a errores, siguiendo un enfoque más tradicional para el drag and drop que resulta más predecible tanto para desarrolladores como para usuarios.