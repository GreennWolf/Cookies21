const corsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin origen (aplicaciones móviles, Postman)
    if (!origin) return callback(null, true);

    // Define los orígenes permitidos; agrega también localhost:5173
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000', 'http://localhost:5173'];

    // En desarrollo, permitimos cualquier origen
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
