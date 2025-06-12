const Domain = require('../models/Domain');

// Lista estática de dominios siempre permitidos
const STATIC_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'https://admin.cookie21.com'
];

// Cache para almacenar dominios desde la base de datos
let cachedDomainOrigins = null;
let lastCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora en milisegundos

// Función para obtener todos los dominios de la base de datos
const refreshDomainOrigins = async () => {
  try {
    // Solo actualizar la caché si han pasado más de CACHE_TTL desde la última actualización
    const currentTime = Date.now();
    if (!cachedDomainOrigins || currentTime - lastCacheTime > CACHE_TTL) {
      console.log('🔄 Actualizando caché de dominios para CORS...');
      
      // Obtener dominios activos desde la base de datos
      const domains = await Domain.find({ status: 'active' }, 'domain');
      
      // Crear array de orígenes permitidos a partir de los dominios
      // Formato: https://ejemplo.com y http://ejemplo.com
      const dbOrigins = domains.flatMap(domain => {
        // Normalizar el dominio (eliminar protocolos si existen)
        const normalizedDomain = domain.domain.replace(/^(https?:\/\/)/i, '');
        // Retornar ambas variantes: http y https
        return [
          `http://${normalizedDomain}`,
          `https://${normalizedDomain}`
        ];
      });
      
      // Combinar con orígenes estáticos y eliminar duplicados
      cachedDomainOrigins = [...new Set([...STATIC_ALLOWED_ORIGINS, ...dbOrigins])];
      lastCacheTime = currentTime;
      
      console.log(`✅ CORS actualizado con ${cachedDomainOrigins.length} dominios permitidos`);
    }
    
    return cachedDomainOrigins;
  } catch (error) {
    console.error('❌ Error al obtener dominios para CORS:', error);
    // En caso de error, devolver solo los dominios estáticos
    return STATIC_ALLOWED_ORIGINS;
  }
};

// Opciones de CORS dinámicas
const corsOptions = {
  origin: async (origin, callback) => {
    try {
      // Permitir solicitudes sin origen (aplicaciones móviles, Postman)
      if (!origin) return callback(null, true);
      
      // En desarrollo, permitir cualquier origen
      if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // Obtener la lista actualizada de dominios permitidos
      const allowedOrigins = await refreshDomainOrigins();
      
      // Verificar si el origen está en la lista de permitidos
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.warn(`⚠️ Origen bloqueado por CORS: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } catch (error) {
      console.error('❌ Error en la validación de CORS:', error);
      // En caso de error, denegar el acceso por seguridad
      callback(new Error('CORS validation error'));
    }
  },
  // Incluimos explícitamente PATCH en los métodos permitidos
  methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'Origin', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 204
};

module.exports = corsOptions;