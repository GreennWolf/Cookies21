const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Función para crear directorios si no existen - versión simplificada
const ensureDirectoryExists = async (directory) => {
  try {
    console.log(`🔍 MULTER: Intentando crear/verificar directorio: ${directory}`);
    await fs.mkdir(directory, { recursive: true });
    console.log(`✅ MULTER: Directorio creado/verificado correctamente: ${directory}`);
    return true;
  } catch (error) {
    console.error(`❌ MULTER ERROR: Error al crear directorio ${directory}:`, error);
    // En lugar de lanzar error, sólo retornamos false
    return false;
  }
};

// Asegurar que exista la carpeta temporal
const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'public', 'templates', 'temp');
(async () => {
  try {
    await ensureDirectoryExists(TEMP_UPLOAD_DIR);
  } catch (error) {
    console.error('Error al crear carpeta temporal:', error);
  }
})();

// Configuración de almacenamiento para Multer
const bannerStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      // Guardar siempre en carpeta temporal primero
      await ensureDirectoryExists(TEMP_UPLOAD_DIR);
      cb(null, TEMP_UPLOAD_DIR);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    // Obtener nombre original y extensión
    const originalName = file.originalname;
    const extension = path.extname(originalName) || '.png';
    
    // Verificar si es un archivo de imagen para componente
    if (originalName.includes('IMAGE_REF')) {
      // Conservar el nombre original incluyendo el código de referencia para poder relacionarlo después
      cb(null, `${originalName}_${Date.now()}${extension}`);
    } else {
      // Crear nombre único para los demás archivos
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1000);
      cb(null, `img_${uniqueSuffix}${extension}`);
    }
  }
});

// Filtro para validar tipos de archivos
const imageFilter = (req, file, cb) => {
  console.log('🔍 Verificando archivo:', file.originalname, file.mimetype);
  
  // Verificar si es una imagen
  if (!file.mimetype.startsWith('image/')) {
    console.warn(`❌ Archivo rechazado - no es imagen: ${file.originalname} (${file.mimetype})`);
    return cb(new Error('Solo se permiten imágenes'), false);
  }
  
  // Extensiones permitidas
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', ''];
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Si no hay extensión pero es imagen, permitir y añadir extensión
  if (!ext && file.mimetype.startsWith('image/')) {
    file.originalname += '.' + file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    console.log(`ℹ️ Añadida extensión al archivo: ${file.originalname}`);
    return cb(null, true);
  }
  
  // Validar extensión
  if (!allowedExtensions.includes(ext)) {
    console.warn(`❌ Archivo rechazado - extensión no permitida: ${file.originalname} (${ext})`);
    return cb(new Error(`Formato no soportado. Formatos permitidos: jpg, jpeg, png, gif, svg, webp, ico`), false);
  }
  
  console.log(`✅ Archivo aceptado: ${file.originalname}`);
  cb(null, true);
};

// Configurar multer
const bannerUpload = multer({
  storage: bannerStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 20 // máximo 20 archivos
  }
});

// Middleware para rutas de imágenes en banner (array para múltiples archivos)
const bannerImageUpload = bannerUpload.array('bannerImages', 20);

module.exports = {
  bannerUpload,
  bannerImageUpload,
  ensureDirectoryExists
};