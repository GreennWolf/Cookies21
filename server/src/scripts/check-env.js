// Verificación de variables de entorno
require('dotenv').config();

console.log('==========================================');
console.log('VERIFICACIÓN DE ENTORNO');
console.log('==========================================');
console.log(`NODE_ENV: "${process.env.NODE_ENV || 'no definido'}"`);
console.log(`BASE_URL: "${process.env.BASE_URL || 'no definido'}"`);
console.log(`API_URL: "${process.env.API_URL || 'no definido'}"`);
console.log('==========================================');
console.log('Variables propias de la plataforma:');
console.log(`PORT: "${process.env.PORT || 'no definido'}"`);
console.log(`MONGODB_URI: "${process.env.MONGODB_URI ? '[CONFIGURADO]' : 'no definido'}"`);
console.log(`JWT_SECRET: "${process.env.JWT_SECRET ? '[CONFIGURADO]' : 'no definido'}"`);
console.log('==========================================');

// Simular obtención de URL base para diferentes entornos
const urls = {
  development: getBaseUrlFor('development'),
  staging: getBaseUrlFor('staging'),
  production: getBaseUrlFor('production'),
  current: getBaseUrlFor(process.env.NODE_ENV || 'development')
};

console.log('URLs base para cada entorno:');
console.log(JSON.stringify(urls, null, 2));
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