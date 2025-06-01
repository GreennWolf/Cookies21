// Verificación mejorada de variables de entorno
const fs = require('fs');
const path = require('path');

// Cargar dotenv con información de debug
const result = require('dotenv').config();

console.log('==========================================');
console.log('VERIFICACIÓN COMPLETA DE ENTORNO');
console.log('==========================================');

// Información sobre la carga de .env
if (result.error) {
  console.log('❌ Error cargando .env:', result.error.message);
} else {
  console.log('✅ Archivo .env cargado correctamente');
  console.log(`📁 Archivo: ${result.parsed ? Object.keys(result.parsed).length + ' variables cargadas' : 'Sin variables'}`);
}
console.log('==========================================');

// Variables críticas
const criticalVars = [
  'NODE_ENV',
  'PORT', 
  'MONGODB_URI',
  'JWT_SECRET',
  'BASE_URL',
  'API_URL',
  'FRONTEND_URL',
  'CORS_ORIGIN'
];

console.log('🔍 VARIABLES CRÍTICAS:');
let missing = [];
let misconfigured = [];

criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missing.push(varName);
    console.log(`❌ ${varName}: NO DEFINIDA`);
  } else {
    const display = varName.includes('SECRET') || varName.includes('PASS') ? '***OCULTO***' : value;
    console.log(`✅ ${varName}: ${display}`);
    
    // Verificaciones específicas para producción
    if (process.env.NODE_ENV === 'production') {
      if ((varName === 'MONGODB_URI' || varName === 'API_URL') && value.includes('localhost')) {
        misconfigured.push(`${varName} usa localhost en producción`);
      }
      if (varName === 'JWT_SECRET' && (value === 'tu_secreto_seguro_aqui' || value.length < 32)) {
        misconfigured.push(`${varName} inseguro en producción`);
      }
    }
  }
});

console.log('==========================================');

// Verificar archivos de configuración
console.log('📁 ARCHIVOS DE CONFIGURACIÓN:');
const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local'];
envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file}: Encontrado (${Math.round(stats.size / 1024)}KB)`);
  } else {
    console.log(`❌ ${file}: No encontrado`);
  }
});

console.log('==========================================');

// Simular obtención de URL base para diferentes entornos
const urls = {
  development: getBaseUrlFor('development'),
  staging: getBaseUrlFor('staging'),
  production: getBaseUrlFor('production'),
  current: getBaseUrlFor(process.env.NODE_ENV || 'development')
};

console.log('🌐 URLs PARA CADA ENTORNO:');
console.log(JSON.stringify(urls, null, 2));
console.log('==========================================');

// Resumen final
console.log('📊 RESUMEN:');
if (missing.length > 0) {
  console.log(`❌ Variables faltantes: ${missing.join(', ')}`);
} else {
  console.log('✅ Todas las variables críticas están definidas');
}

if (misconfigured.length > 0) {
  console.log('⚠️  Problemas encontrados:');
  misconfigured.forEach(issue => console.log(`   - ${issue}`));
} else {
  console.log('✅ Configuración apropiada para el entorno');
}

// Recomendaciones específicas
if (process.env.NODE_ENV === 'production') {
  console.log('\n🚀 VERIFICACIONES ADICIONALES PARA PRODUCCIÓN:');
  
  const prodChecks = [
    { check: process.env.COOKIE_SECURE === 'true', message: 'COOKIE_SECURE debería ser true' },
    { check: process.env.COOKIE_SAME_SITE === 'strict', message: 'COOKIE_SAME_SITE debería ser strict' },
    { check: !process.env.REDIS_URI?.includes('localhost'), message: 'REDIS_URI no debería usar localhost' },
    { check: process.env.LOG_LEVEL !== 'debug', message: 'LOG_LEVEL no debería ser debug' }
  ];
  
  prodChecks.forEach(({ check, message }) => {
    console.log(check ? `✅ ${message}` : `⚠️  ${message}`);
  });
}

console.log('==========================================');

// Función para obtener URL base para un entorno específico
function getBaseUrlFor(env) {
  if (env === 'production') {
    return process.env.BASE_URL || 'https://api.cookie21.com';
  } else if (env === 'staging') {
    return process.env.BASE_URL || 'https://staging-api.cookie21.com';
  } else {
    return process.env.BASE_URL || 'http://localhost:3000';
  }
}