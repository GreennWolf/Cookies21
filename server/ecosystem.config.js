module.exports = {
  apps: [
    {
      name: 'cookie21-server',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        MONGODB_URI: 'mongodb://localhost:27017/cookies21',
        JWT_SECRET: 'desarrollo-jwt-secret-no-usar-en-produccion',
        JWT_EXPIRES_IN: '1d',
        CORS_ORIGIN: 'http://localhost:5173,http://localhost:3000',
        LOG_LEVEL: 'debug'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // MongoDB con credenciales para producción (auth contra admin)
        MONGODB_URI: 'mongodb://wolf:Ssaw34177234.@localhost:27017/cookies21?authSource=admin',
        JWT_SECRET: 'CAMBIAR_POR_SECRETO_SEGURO_DE_AL_MENOS_32_CARACTERES',
        JWT_REFRESH_SECRET: 'CAMBIAR_POR_REFRESH_SECRETO_SEGURO',
        JWT_EXPIRES_IN: '1d',
        JWT_REFRESH_EXPIRES_IN: '7d',
        JWT_RESET_EXPIRES_IN: '10m',
        
        // URLs para producción
        BASE_URL: 'https://api.cookie21.com',
        API_URL: 'https://api.cookie21.com',
        FRONTEND_URL: 'https://admin.cookie21.com',
        
        // Seguridad
        COOKIE_SECRET: 'CAMBIAR_POR_COOKIE_SECRET_SEGURO',
        COOKIE_SECURE: 'true',
        COOKIE_SAME_SITE: 'strict',
        
        // CORS
        CORS_ORIGIN: 'https://admin.cookie21.com,https://api.cookie21.com',
        CORS_METHODS: 'GET,POST,PUT,DELETE,OPTIONS',
        
        // Redis
        REDIS_URI: 'redis://localhost:6379',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        
        // Email
        EMAIL_HOST: 'cookie21.com',
        EMAIL_PORT: 465,
        EMAIL_USER: 'noreply@cookie21.com',
        EMAIL_PASS: 'CAMBIAR_POR_PASSWORD_REAL',
        EMAIL_FROM: 'Cookie21 <noreply@cookie21.com>',
        USE_ETHEREAL: false,
        
        // Database
        MONGODB_MAX_POOL_SIZE: 20,
        MONGODB_RETRY_WRITES: true,
        
        // Rate limiting
        RATE_LIMIT_WINDOW: 15,
        RATE_LIMIT_MAX: 50,
        RATE_LIMIT_AUTH_MAX: 3,
        RATE_LIMIT_AUTH_WINDOW: 15,
        
        // Security
        PASSWORD_RESET_TOKEN_EXPIRES: 3600000,
        MAX_LOGIN_ATTEMPTS: 3,
        LOGIN_LOCKOUT_TIME: 1800000,
        
        // Logging
        LOG_LEVEL: 'info',
        
        // IAB
        IAB_CMP_ID: 0
      }
    }
  ]
};