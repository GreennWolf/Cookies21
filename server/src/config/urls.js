/**
 * Configuración de URLs del sistema
 * 
 * Este archivo proporciona URLs base para diferentes entornos
 */

const getBaseUrl = () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`🌐 URL Config - NODE_ENV: "${env}"`);
  
  // En desarrollo, forzar siempre localhost a menos que haya un BASE_URL explícito
  if (env !== 'production' && env !== 'staging') {
    const devUrl = process.env.BASE_URL || 'http://localhost:3000';
    console.log(`🔧 Usando URL de desarrollo: ${devUrl}`);
    return devUrl;
  }
  
  // En producción
  if (env === 'production') {
    const prodUrl = process.env.BASE_URL || 'https://api.cookie21.com';
    console.log(`🚀 Usando URL de producción: ${prodUrl}`);
    return prodUrl;
  } 
  
  // En staging
  if (env === 'staging') {
    const stagingUrl = process.env.BASE_URL || 'https://staging-api.cookie21.com';
    console.log(`🧪 Usando URL de staging: ${stagingUrl}`);
    return stagingUrl;
  }
  
  // Por defecto, desarrollo
  const defaultUrl = 'http://localhost:3000';
  console.log(`⚠️ Entorno no reconocido, usando URL por defecto: ${defaultUrl}`);
  return defaultUrl;
};

module.exports = {
  getBaseUrl
};