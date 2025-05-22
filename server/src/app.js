const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

const corsConfig = require('./config/cors');
const morganConfig = require('./config/morgan');
const { swaggerSpec, swaggerUiOptions } = require('./config/swagger');

const errorMiddleware = require('./middleware/error');
const { rateLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Importar rutas
const authRoutes = require('./routes/v1/auth.routes');
const domainRoutes = require('./routes/v1/domain.routes');
const cookiesRoutes = require('./routes/v1/cookies.routes');
const cookieScanRoutes = require('./routes/v1/cookie-scan.routes');
const consentRoutes = require('./routes/v1/consent.routes');
const analyticsRoutes = require('./routes/v1/analytics.routes');
const integrationRoutes = require('./routes/v1/integration.routes');
const bannerTemplateRoutes = require('./routes/v1/banner-template.routes');
const translationRoutes = require('./routes/v1/translation.routes');
const scriptsRoutes = require('./routes/v1/script.routes');
const vendorsRoutes = require('./routes/v1/vendor.routes');
const consentScriptRoute = require('./routes/v1/consentScript.routes');
const userRoutes = require('./routes/v1/users.routes');
const clientRoutes = require('./routes/v1/client.routes');
const invitationRoutes = require('./routes/v1/invitation.routes');
const subscriptionRoutes  = require('./routes/v1/subscription.routes');
const documentationRoutes = require('./routes/v1/documentation.routes');
const { setupScheduledJobs } = require('./jobs/scheduledTasks');
const errorHandler = require('./utils/errorHandler');

// Crear app Express
const app = express();
// REMOVED: app.use(errorHandler); - This was causing the error

// IMPORTANTE: Configurar trust proxy para obtener IPs correctas
// Si estás detrás de un proxy como Nginx, Cloudflare, AWS ELB, etc.
app.set('trust proxy', true);

// Rutas de archivos estáticos
const publicFolderPath = path.resolve(process.cwd(), 'public');
console.log(`📁 PUBLIC_FOLDER_PATH: ${publicFolderPath}`);

// Configuración específica para archivos de templates (imágenes de banner)
app.use('/templates', express.static(path.join(publicFolderPath, 'templates'), {
  setHeaders: (res, path, stat) => {
    // Agregar headers para mejorar rendimiento y compatibilidad
    // Permitir cierto nivel de caché para un mejor rendimiento
    res.set('Cache-Control', 'public, max-age=300'); // Caché de 5 minutos
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Logging reducido para no saturar la consola
    if (path.includes('/images/')) {
      console.log(`🖼️ STATIC: Sirviendo imagen: ${path.split('/images/')[1]}`);
    } else {
      console.log(`📄 STATIC: Sirviendo archivo estático: ${path}`);
    }
  }
}));

// Ruta para verificar el estado del sistema de archivos y rutas
app.get('/debug-images', (req, res) => {
  try {
    // Obtener información sobre el sistema de archivos
    const publicInfo = {
      publicPath: publicFolderPath,
      exists: fs.existsSync(publicFolderPath),
      isDirectory: fs.existsSync(publicFolderPath) ? fs.statSync(publicFolderPath).isDirectory() : null,
    };
    
    const templatesPath = path.join(publicFolderPath, 'templates');
    const templatesInfo = {
      path: templatesPath,
      exists: fs.existsSync(templatesPath),
      isDirectory: fs.existsSync(templatesPath) ? fs.statSync(templatesPath).isDirectory() : null,
    };
    
    const imagesPath = path.join(templatesPath, 'images');
    const imagesInfo = {
      path: imagesPath,
      exists: fs.existsSync(imagesPath),
      isDirectory: fs.existsSync(imagesPath) ? fs.statSync(imagesPath).isDirectory() : null,
    };
    
    // Si existe, listar las carpetas de banners
    let bannerFolders = [];
    if (imagesInfo.exists && imagesInfo.isDirectory) {
      bannerFolders = fs.readdirSync(imagesPath)
        .filter(item => fs.statSync(path.join(imagesPath, item)).isDirectory())
        .map(folder => ({ 
          folder,
          path: path.join(imagesPath, folder),
          files: fs.readdirSync(path.join(imagesPath, folder)),
          url: `/templates/images/${folder}`
        }));
    }
    
    // Información sobre la configuración
    const expressInfo = {
      routes: app._router.stack
        .filter(r => r.route)
        .map(r => ({
          path: r.route.path,
          methods: Object.keys(r.route.methods).filter(m => r.route.methods[m])
        })),
      middleware: app._router.stack
        .filter(r => r.name && !r.route)
        .map(r => r.name)
    };
    
    res.json({
      success: true,
      publicInfo,
      templatesInfo,
      imagesInfo,
      bannerFolders,
      expressInfo,
      serverUrl: `${req.protocol}://${req.get('host')}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Ruta alternativa para acceder a imágenes directamente con soporte mejorado
app.get('/direct-image/:bannerId/:filename', (req, res) => {
  const { bannerId, filename } = req.params;
  const imagePath = path.join(publicFolderPath, 'templates', 'images', bannerId, filename);
  
  // Log para depuración
  console.log(`🔍 Solicitud de imagen recibida: /direct-image/${bannerId}/${filename}`);
  console.log(`📂 Buscando en ruta: ${imagePath}`);
  
  // Verificar si el archivo existe con fs.promises para mejor manejo
  fs.promises.access(imagePath, fs.constants.F_OK)
    .then(async () => {
      try {
        // Obtener información del archivo para verificar tamaño
        const stats = await fs.promises.stat(imagePath);
        if (stats.size === 0) {
          console.error(`❌ Imagen encontrada pero está vacía: ${imagePath}`);
          return res.status(404).send('Imagen inválida (archivo vacío)');
        }
        
        console.log(`✅ Sirviendo imagen: ${filename} (${stats.size} bytes)`);
        
        // Configurar headers para mejor rendimiento y compatibilidad
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        // Permitir caché por 5 minutos para mejor rendimiento
        res.set('Cache-Control', 'public, max-age=300');
        
        // Determinar el tipo MIME basado en la extensión
        const ext = path.extname(imagePath).toLowerCase();
        let contentType = 'image/jpeg'; // valor por defecto
        
        // Mapa de tipos MIME para extensiones comunes
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.bmp': 'image/bmp'
        };
        
        if (mimeTypes[ext]) {
          contentType = mimeTypes[ext];
        }
        
        // Enviar archivo con cabeceras específicas mejoradas
        res.sendFile(imagePath, {
          headers: {
            // Cabeceras estrictas para evitar caché
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            // Establecer tipo MIME correcto
            'Content-Type': contentType,
            // Permitir acceso desde cualquier origen
            'Access-Control-Allow-Origin': '*',
            // Facilitar depuración
            'X-Image-Path': imagePath,
            'X-Banner-ID': bannerId
          }
        });
      } catch (statsErr) {
        console.error(`❌ Error obteniendo información de imagen: ${statsErr.message}`);
        return res.status(500).send('Error interno al procesar la imagen');
      }
    })
    .catch(err => {
      console.error(`❌ Imagen no encontrada: ${imagePath} - ${err.message}`);
      return res.status(404).send('Imagen no encontrada');
    });
});

// Configuración para otros archivos estáticos
app.use('/public', express.static(publicFolderPath));
app.use('/assets', express.static(path.join(publicFolderPath, 'assets')));

// Asegurar que existan las carpetas necesarias para imágenes de banner
const templatesImagesPath = path.join(publicFolderPath, 'templates', 'images');
if (!fs.existsSync(templatesImagesPath)) {
  try {
    fs.mkdirSync(templatesImagesPath, { recursive: true });
    logger.info(`Directorio creado: ${templatesImagesPath}`);
  } catch (error) {
    logger.warn(`No se pudo crear el directorio para imágenes: ${error.message}`);
  }
}

// Configuración de seguridad
app.use(cors(corsConfig));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: false // Desactivar CSP para permitir cargar recursos externos
}));

// Logging HTTP
app.use(morganConfig);

// Middleware para depuración de IP - útil para entornos de producción
app.use((req, res, next) => {
  const ipSources = {
    direct: req.connection?.remoteAddress,
    forwarded: req.headers['x-forwarded-for'],
    realIp: req.headers['x-real-ip'],
    expressIp: req.ip,
    socket: req.socket?.remoteAddress
  };
  
  // Obtener la mejor fuente de IP
  let clientIp = req.ip;
  if (ipSources.forwarded) {
    clientIp = ipSources.forwarded.split(',')[0].trim();
  } else if (ipSources.realIp) {
    clientIp = ipSources.realIp;
  }
  
  // Almacenar en variable accesible para los controladores
  req.clientIp = clientIp;
  
  // Log de IP y ruta para solicitudes importantes
  if (req.url.includes('/consent') || req.url.includes('/script')) {
    logger.debug(`[IP] ${req.method} ${req.url} - Cliente: ${clientIp}`);
    logger.debug(`[IP Debug] Fuentes: ${JSON.stringify(ipSources)}`);
  }
  
  next();
});

// Parsear body y cookies con límites aumentados
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie-consent-platform-secret'));

// Compresión
app.use(compression());

// Rate Limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // límite de solicitudes por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  skip: (req) => {
    // No aplicar límite a endpoints de consentimiento y obtención de scripts
    return req.url.includes('/consent') || req.url.includes('/embed.js');
  },
});

app.use(limiter);

// Middleware para prevenir bloqueos por JSON mal formado
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn(`JSON inválido recibido: ${err.message}`);
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON',
      code: 'INVALID_JSON',
      details: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
  }
  next(err);
});

// Rutas de salud
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Documentación API
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Prefijo base para API v1
const apiV1 = '/api/v1';

// Montar rutas
app.use(`${apiV1}/auth`, authRoutes);
app.use(`${apiV1}/domains`, domainRoutes);
app.use(`${apiV1}/cookies`, cookiesRoutes);
app.use(`${apiV1}/cookie-scan`, cookieScanRoutes);
app.use(`${apiV1}/consent`, consentRoutes);
app.use(`${apiV1}/analytics`, analyticsRoutes);
app.use(`${apiV1}/integration`, integrationRoutes);
app.use(`${apiV1}/banner-templates`, bannerTemplateRoutes);
app.use(`${apiV1}/translations`, translationRoutes);
app.use(`${apiV1}/scripts`, scriptsRoutes);
app.use(`${apiV1}/vendors`, vendorsRoutes);
app.use(`${apiV1}/users`, userRoutes);
app.use(`${apiV1}/clients`, clientRoutes);
app.use(`${apiV1}/consent-script`, consentScriptRoute);
app.use(`${apiV1}/invitation`, invitationRoutes);
app.use(`${apiV1}/subscriptions`, subscriptionRoutes);
app.use(`${apiV1}/documentation`, documentationRoutes);

// También añadimos la ruta de documentación pública fuera del apiV1
app.use('/documentation', documentationRoutes);

// Ruta 404 para endpoints no encontrados
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Not Found: ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Manejador de errores global
app.use(errorMiddleware);
setupScheduledJobs();

// Log de arranque
logger.info('Express app configured successfully');

module.exports = app;