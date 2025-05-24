# Sistema de Imágenes - Documentación Técnica

## Resumen del Sistema

El sistema de imágenes maneja la carga, procesamiento y visualización de imágenes tanto en componentes raíz como en componentes hijos (dentro de contenedores). El sistema funciona con referencias temporales que se procesan en el servidor y se convierten en URLs reales.

## Arquitectura del Sistema

### Frontend (Cliente)

#### 1. Carga de Imágenes
- **Archivo**: `ImageUploader.jsx`
- **Proceso**: 
  1. Usuario selecciona imagen
  2. Se crea referencia temporal: `__IMAGE_REF__[componentId]_[timestamp]`
  3. Archivo se renombra con patrón: `IMAGE_REF_[componentId]_[timestamp]_[filename]`
  4. Se almacena en `window._imageFiles` para envío posterior

#### 2. Vista Previa Local
- **Archivos**: `ComponentRenderer.jsx`, `BannerPropertyPanel.jsx`
- **Proceso**:
  1. Se crea blob URL temporal para vista previa
  2. Se almacena en `deviceStyle._previewUrl`
  3. ComponentRenderer prioriza `_previewUrl` sobre content para mostrar preview

#### 3. Envío al Servidor
- **Archivo**: `useBannerEditor.js` (función `saveBannerToServer`)
- **Proceso**:
  1. Se crea FormData con template JSON y archivos de imágenes
  2. Se envían todos los archivos de una vez
  3. Servidor procesa y devuelve template con URLs reales

### Backend (Servidor)

#### 1. Recepción de Archivos
- **Archivo**: `BannerTemplateController.js`
- **Middleware**: Multer con configuración personalizada
- **Proceso**:
  1. Archivos se guardan temporalmente en `/public/templates/temp/`
  2. Se validan tipo y tamaño
  3. Se procesan con función recursiva

#### 2. Procesamiento Recursivo
- **Función**: `processComponentsImages()`
- **Ubicación**: Línea 21 de `BannerTemplateController.js`
- **Proceso**:
  ```
  1. Recorre componentes de nivel raíz
  2. Para cada componente imagen:
     - Busca referencia temporal (__IMAGE_REF__)
     - Extrae componentId de la referencia
     - Busca archivo correspondiente por patrón: IMAGE_REF_[componentId]_
     - Copia archivo a directorio final: /templates/images/[bannerId]/
     - Actualiza component.content con URL final
  3. Para contenedores con hijos:
     - Llama recursivamente a processComponentsImages(comp.children)
     - Mantiene estructura jerárquica
  ```

#### 3. Estructura de Archivos
```
/public/templates/
├── temp/                          # Archivos temporales
│   └── IMAGE_REF_[id]_[file]     # Archivos de carga
├── images/
│   └── [bannerId]/               # Directorio por banner
│       ├── img_[compId]_[timestamp].ext  # Imágenes finales
```

## Flujo Completo

### Componentes Raíz
```
1. [Cliente] Usuario sube imagen → __IMAGE_REF__comp-123_456789
2. [Cliente] Archivo renombrado → IMAGE_REF_comp-123_456789_foto.jpg
3. [Cliente] Vista previa → blob URL temporal
4. [Cliente] Guardar → FormData enviado al servidor
5. [Servidor] processComponentsImages() procesa nivel raíz
6. [Servidor] Encuentra comp-123 → Copia archivo
7. [Servidor] Actualiza content → /templates/images/bannerId/img_comp-123_789012.jpg
8. [Cliente] Recibe template actualizado → setInitialConfig()
9. [Cliente] ComponentRenderer muestra imagen final
```

### Componentes Hijos (Dentro de Contenedores)
```
1. [Cliente] Usuario sube imagen en hijo → __IMAGE_REF__image_456_789012
2. [Cliente] Archivo renombrado → IMAGE_REF_image_456_789012_foto.jpg
3. [Cliente] updateChildContent() actualiza contenido
4. [Cliente] Vista previa → blob URL temporal
5. [Cliente] Guardar → FormData enviado al servidor
6. [Servidor] processComponentsImages() procesa nivel raíz
7. [Servidor] Para contenedores: llama recursivamente con comp.children
8. [Servidor] Encuentra image_456 en nivel hijo → Copia archivo
9. [Servidor] Actualiza comp.children[x].content → URL real
10. [Cliente] Recibe template con estructura anidada actualizada
11. [Cliente] ComponentRenderer renderiza hijos con URLs reales
```

## Componentes Clave

### Frontend
- **`ImageUploader.jsx`**: Manejo de carga y preview
- **`ComponentRenderer.jsx`**: Visualización de imágenes (funciones `getImageUrl()` y `getImageInfo()`)
- **`BannerPropertyPanel.jsx`**: Interfaz para actualizar imágenes
- **`useBannerEditor.js`**: Gestión de estado y comunicación con servidor
  - `updateChildContent()`: Actualiza contenido de componentes hijos
  - `saveBannerToServer()`: Envía datos al servidor
  - `setInitialConfig()`: Actualiza estado con respuesta del servidor

### Backend
- **`BannerTemplateController.js`**: Controlador principal
  - `processComponentsImages()`: Función recursiva de procesamiento
  - Endpoint PATCH `/api/v1/banner-templates/:id`
- **`multerConfig.js`**: Configuración de upload de archivos

## Debugging

### Logs del Cliente
- `📸 CLIENTE`: Carga de archivo
- `📎 CLIENTE`: Actualización de imagen
- `🔄 Estado actualizado`: Confirmación de actualización de estado

### Logs del Servidor
- `🔍 [SERVER DEBUG]`: Procesamiento por niveles
- `🖼️ [SERVER DEBUG]`: Detección de componentes imagen
- `🏠 [SERVER DEBUG]`: Identificación de componentes hijos
- `🌍 [SERVER DEBUG]`: Identificación de componentes raíz
- `✅ [SERVER DEBUG]`: Procesamiento exitoso

## Patrones de Nombres

### Referencias Temporales
- **Frontend**: `__IMAGE_REF__[componentId]_[timestamp]`
- **Archivos**: `IMAGE_REF_[componentId]_[timestamp]_[originalFilename]`

### URLs Finales
- **Relativas**: `/templates/images/[bannerId]/img_[componentId]_[timestamp].[ext]`
- **Absolutas**: `http://domain.com/templates/images/[bannerId]/img_[componentId]_[timestamp].[ext]`

## Troubleshooting

### Imagen no se muestra después de guardar
1. Verificar logs del servidor para `🔍 [SERVER DEBUG]`
2. Confirmar que se encuentra archivo con patrón correcto
3. Verificar que `setInitialConfig()` se ejecuta en frontend
4. Comprobar que ComponentRenderer recibe URLs reales

### Referencias temporales persisten
1. Verificar que el servidor está usando `processComponentsImages()` recursiva
2. Confirmar que la función se llama con parámetros correctos (req, bannerDir)
3. Verificar que no hay errores en el procesamiento del servidor

### Componentes hijos no procesan imágenes
1. Confirmar que `processComponentsImages()` incluye lógica recursiva
2. Verificar que la estructura de `comp.children` se mantiene
3. Comprobar que `parentId` está correctamente asignado

## Mantenimiento

### Archivos temporales
- Se eliminan automáticamente después del procesamiento exitoso
- Cleanup manual disponible en endpoint específico

### Caché de imágenes
- Frontend mantiene caché de aspect ratios
- Blob URLs se limpian automáticamente al cambiar componente

## Versiones del Sistema

### v1 (Original)
- Solo componentes raíz
- Procesamiento no recursivo
- Sistema simple de asociación archivo-componente

### v2 (Actual)
- Componentes raíz y hijos
- Procesamiento recursivo completo
- Manejo mejorado de estructura jerárquica
- Logs detallados para debugging
- Sistema robusto de referencias temporales