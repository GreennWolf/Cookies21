/**
 * Script de Prueba de Conexión MongoDB
 * 
 * Este script verifica que la conexión a MongoDB funcione correctamente
 * antes de ejecutar las migraciones.
 * 
 * Uso: node scripts/testConnection.js
 */

// Cargar variables de entorno
require('dotenv').config();

const mongoose = require('mongoose');

// Función para probar la conexión
const testConnection = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21';
    
    console.log('🧪 Probando conexión a MongoDB...');
    console.log('📍 URI:', mongoUri.replace(/\/\/.*:.*@/, '//***:***@')); // Ocultar credenciales
    console.log('🌍 Entorno:', process.env.NODE_ENV || 'development');
    
    // Intentar conectar
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 segundos de timeout
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conexión exitosa a MongoDB');
    
    // Probar operación básica
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('📊 Base de datos:', db.databaseName);
    console.log('📁 Colecciones encontradas:', collections.length);
    
    // Buscar colección de banners específicamente
    const bannerCollection = collections.find(col => col.name === 'bannertemplates');
    if (bannerCollection) {
      console.log('🎯 Colección de banners encontrada: bannertemplates');
      
      // Contar documentos
      const count = await db.collection('bannertemplates').countDocuments();
      console.log('📋 Total de banners en la base de datos:', count);
      
      if (count > 0) {
        console.log('✅ Base de datos lista para migración');
      } else {
        console.log('⚠️ No hay banners en la base de datos');
      }
    } else {
      console.log('⚠️ Colección de banners no encontrada');
      console.log('📁 Colecciones disponibles:', collections.map(c => c.name));
    }
    
  } catch (error) {
    console.error('❌ Error en la conexión:', error.message);
    
    // Mostrar detalles específicos del error
    if (error.code === 13) {
      console.error('🔐 Error de autenticación:');
      console.error('   - Verifica usuario y contraseña');
      console.error('   - Verifica authSource en la URI');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Error de conexión:');
      console.error('   - MongoDB no está ejecutándose');
      console.error('   - Verifica la dirección y puerto');
    } else {
      console.error('🔍 Código de error:', error.code);
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Desconectado de MongoDB');
  }
};

// Ejecutar prueba
testConnection();