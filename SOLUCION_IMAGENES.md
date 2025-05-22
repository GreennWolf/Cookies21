# Solución a Problemas de Previsualización de Imágenes

## Problemas Detectados

Después de un análisis detallado de los componentes que muestran previsualizaciones de banners, se identificaron los siguientes problemas:

1. **Inconsistencia en la Obtención de URLs de Imágenes**: Cada componente manejaba las URLs de forma diferente, causando que a veces las imágenes no cargaran correctamente.

2. **Manejo Incoherente de Errores**: Cada componente tenía su propia lógica para manejar errores de carga, lo que resultaba en comportamientos impredecibles.

3. **Falta de Estandarización en Dimensiones**: El tamaño y las dimensiones de las imágenes variaban entre componentes.

4. **Ausencia de Mecanismos de Fallback**: Cuando una imagen fallaba, no siempre había un plan alternativo coherente.

5. **Diferentes Estilos Visuales**: Las previsualizaciones tenían diferente apariencia en distintos contextos.

## Solución Implementada

Se creó una solución centralizada para el manejo de imágenes con los siguientes componentes:

### 1. Utilidad Centralizada: `imageProcessing.js`

Se desarrolló un módulo utilitario en `front/src/utils/imageProcessing.js` que contiene:

- **`getImageUrl()`**: Función para obtener URLs de imágenes con múltiples estrategias de fallback.
- **`handleImageError()`**: Manejo estandarizado de errores con varias estrategias de recuperación.
- **`processImageStyles()`**: Procesamiento coherente de estilos visuales para imágenes.
- **`ImagePlaceholders`**: Constantes para mostrar placeholders en diferentes estados (carga, error, etc.).
- **`processComponentImages()`**: Función para procesar imágenes para FormData (para envío al servidor).

### 2. Actualización de Componentes

Se actualizaron los siguientes componentes para utilizar la utilidad centralizada:

- **`BannerPreview.jsx`**: Componente principal de previsualización.
- **`BannerThumbnail.jsx`**: Versión en miniatura del banner.
- **`BannerConfigStep.jsx`**: Configuración de banners en el asistente de clientes.

### 3. Estrategias de Recuperación de Errores

El sistema ahora cuenta con múltiples estrategias para lidiar con imágenes que fallan:

1. **Conversión de Rutas**: Intenta cambiar automáticamente entre `/direct-image/` y `/templates/images/`.
2. **Alternativa Local**: Intenta conectar con el servidor local para desarrollo.
3. **Placeholders Visuamente Consistentes**: Muestra indicadores coherentes en caso de error.

### 4. Mejoras en Procesamiento de Estilos

- Garantiza que las imágenes tengan dimensiones apropiadas y unidades consistentes.
- Manejo unificado de propiedades como `objectFit` y `objectPosition`.
- Asegura que las imágenes no sobresalgan de sus contenedores.
- Proporciona escalado coherente en diferentes dispositivos.

## Beneficios de la Solución

1. **Consistencia Visual**: Todas las previsualizaciones ahora tienen la misma apariencia y comportamiento.
2. **Mejor Manejo de Errores**: Menos errores visibles para el usuario y más estrategias de recuperación.
3. **Código Mantenible**: La lógica centralizada hace que el mantenimiento sea más sencillo.
4. **Reducción de Duplicación**: Se eliminó código duplicado entre componentes.
5. **Flexibilidad**: Fácil adaptación a cambios futuros modificando solo la utilidad central.

## Problemas adicionales corregidos

1. **Error con el uso de hooks en React**
   - Se corrigió un error de "Invalid hook call" moviendo `useRef` al nivel correcto
   - Se reemplazaron múltiples instancias de código que violaban las reglas de hooks

2. **Eliminación inadvertida de imágenes recién subidas**
   - El sistema estaba eliminando inmediatamente las imágenes recién subidas
   - Ahora se detectan las URLs en todos los formatos posibles
   - Se agregó protección por tiempo para no eliminar archivos recientes

3. **Rendimiento y optimización**
   - Se removieron timestamps constantes que causaban refrescos
   - Se implementó un mejor sistema de debouncing para redimensionamiento

## Pruebas Recomendadas

Para verificar que la solución funciona correctamente, se recomienda probar en diferentes escenarios:

1. **Diferentes Navegadores**: Chrome, Firefox, Safari
2. **Distintos Tipos de Imágenes**: JPG, PNG, WebP
3. **Diversos Tamaños de Imágenes**: Pequeñas, grandes, con diferentes proporciones
4. **Escenarios de Error**: Imágenes que no existen, problemas de CORS, etc.
5. **Visualización en Diferentes Dispositivos**: Desktop, tablet, móvil

## Próximos pasos

Si experimentas algún problema con la carga de imágenes:

1. Espera al menos 30 segundos después de subir imágenes antes de ejecutar limpieza manual
2. Usa el parámetro `?cleanup=true` solo cuando realmente necesites limpiar imágenes
3. Si necesitas forzar la limpieza, añade el parámetro `?force=true`

## Mejoras futuras recomendadas

- Implementar un sistema de versionamiento para imágenes
- Añadir interfaz visual para administrar imágenes no utilizadas
- Crear proceso de respaldo automático antes de eliminar archivos
- Mejorar el manejo de cache para evitar problemas de refresco

Con esta solución, las previsualizaciones de banners deberían verse y comportarse de manera consistente en toda la aplicación.