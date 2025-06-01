#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 SCRIPT DE REPARACIÓN PARA PRODUCCIÓN');
console.log('======================================');

// 1. Verificar archivos de configuración
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

console.log(`📁 Archivo .env: ${envExists ? '✅ Encontrado' : '❌ No encontrado'}`);

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\n📋 Variables encontradas en .env:');
  
  const lines = envContent.split('\n').filter(line => 
    line.trim() && !line.startsWith('#') && line.includes('=')
  );
  
  const envVars = {};
  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  // Verificar variables críticas
  const critical = ['NODE_ENV', 'PORT', 'MONGODB_URI', 'JWT_SECRET'];
  critical.forEach(key => {
    const value = envVars[key];
    const display = key.includes('SECRET') ? (value ? '***OCULTO***' : 'NO DEFINIDO') : (value || 'NO DEFINIDO');
    console.log(`${value ? '✅' : '❌'} ${key}: ${display}`);
  });
  
  // Detectar problemas
  console.log('\n🔍 PROBLEMAS DETECTADOS:');
  let hasProblems = false;
  
  if (envVars.NODE_ENV === 'production' && envVars.MONGODB_URI === 'mongodb://localhost:27017/cookies21') {
    console.log('⚠️  MongoDB usando localhost sin autenticación en producción');
    hasProblems = true;
  }
  
  if (envVars.JWT_SECRET === 'tu_secreto_seguro_aqui') {
    console.log('⚠️  JWT_SECRET usando valor por defecto');
    hasProblems = true;
  }
  
  if (!hasProblems) {
    console.log('✅ No se detectaron problemas obvios');
  }
}

// 2. Crear configuración para desarrollo
console.log('\n🛠️  GENERANDO CONFIGURACIÓN DE DESARROLLO:');

const devEnv = `# Variables de entorno para DESARROLLO
NODE_ENV=development
PORT=3000

# Base URLs para desarrollo  
BASE_URL=http://localhost:3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# MongoDB para desarrollo (sin autenticación)
MONGODB_URI=mongodb://localhost:27017/cookies21_dev
MONGODB_MAX_POOL_SIZE=10
MONGODB_RETRY_WRITES=true

# Redis para desarrollo
REDIS_URI=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false

# JWT para desarrollo
JWT_SECRET=desarrollo-jwt-secret-no-usar-en-produccion-32-chars
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=desarrollo-refresh-secret-no-usar-en-produccion
JWT_REFRESH_EXPIRES_IN=7d
JWT_RESET_EXPIRES_IN=10m

# Cookies para desarrollo
COOKIE_SECRET=desarrollo-cookie-secret
COOKIE_MAX_AGE=86400000
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# CORS para desarrollo
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS

# Rate limiting para desarrollo
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_AUTH_WINDOW=15

# Email para desarrollo
EMAIL_HOST=localhost
EMAIL_PORT=587
EMAIL_USER=test@localhost
EMAIL_PASS=test
EMAIL_FROM=Cookie21 Dev <test@localhost>
USE_ETHEREAL=true

# Logging para desarrollo
LOG_LEVEL=debug

# Security para desarrollo
PASSWORD_RESET_TOKEN_EXPIRES=3600000
MAX_LOGIN_ATTEMPTS=10
LOGIN_LOCKOUT_TIME=300000

# IAB
IAB_CMP_ID=0
`;

fs.writeFileSync(path.join(__dirname, '.env.development'), devEnv);
console.log('✅ Archivo .env.development creado');

// 3. Instrucciones finales
console.log('\n📋 INSTRUCCIONES PARA SOLUCIONAR:');
console.log('======================================');
console.log('');
console.log('🔄 Para DESARROLLO:');
console.log('  export NODE_ENV=development');
console.log('  npm start');
console.log('');
console.log('🚀 Para PRODUCCIÓN:');
console.log('  1. Configurar MongoDB con autenticación:');
console.log('     MONGODB_URI=mongodb://usuario:password@localhost:27017/cookies21_prod');
console.log('');
console.log('  2. Configurar variables de entorno del sistema:');
console.log('     export NODE_ENV=production');
console.log('     export MONGODB_URI=mongodb://usuario:password@localhost:27017/cookies21_prod');
console.log('     export JWT_SECRET=tu-secreto-super-seguro-de-al-menos-32-caracteres');
console.log('');
console.log('  3. O usar PM2 con ecosystem.config.js:');
console.log('     pm2 start ecosystem.config.js --env production');
console.log('');
console.log('💡 SOLUCIÓN RÁPIDA - Cambiar a desarrollo:');
console.log('   cp .env.development .env');
console.log('   pm2 restart server');

console.log('\n======================================');
console.log('✅ Script completado');