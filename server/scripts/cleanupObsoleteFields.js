#!/usr/bin/env node

/**
 * SCRIPT DE LIMPIEZA DE CAMPOS OBSOLETOS
 * 
 * Elimina campos obsoletos que pudieron haber quedado después de la migración
 * 
 * Uso:
 *   node scripts/cleanupObsoleteFields.js [--dev] [--dry-run]
 */

const mongoose = require('mongoose');
const path = require('path');

// Configurar archivo .env según el modo
const isDev = process.argv.includes('--dev');
const dryRun = process.argv.includes('--dry-run');
const envFile = isDev ? '.env.development.local' : '.env';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

if (isDev) {
  console.log(`🔧 Usando configuración de desarrollo: ${envFile}`);
}

const Domain = require('../src/models/Domain');

async function cleanupObsoleteFields() {
  try {
    console.log('🧹 INICIANDO LIMPIEZA DE CAMPOS OBSOLETOS');
    console.log('=========================================\n');

    if (dryRun) {
      console.log('🔍 MODO DRY-RUN: Solo se mostrarán los cambios\n');
    }

    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21';
    console.log(`🔗 Conectando a MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar dominios con campos obsoletos
    console.log('🔍 Buscando dominios con campos obsoletos...');
    
    const domainsWithObsoleteFields = await mongoose.connection.db.collection('domains').find({
      $or: [
        { 'analysisSchedule': { $exists: true } },
        { 'settings.design': { $exists: true } },
        { 'settings.scanning': { $exists: true } },
        { 'settings.purposes': { $exists: true } },
        { 'settings.vendors': { $exists: true } },
        { 'settings.banner': { $exists: true } }
      ]
    }).toArray();

    console.log(`📊 Encontrados ${domainsWithObsoleteFields.length} dominios con campos obsoletos\n`);

    if (domainsWithObsoleteFields.length === 0) {
      console.log('✅ ¡No hay campos obsoletos que limpiar!');
      return;
    }

    // Mostrar dominios a limpiar
    console.log('📋 Dominios que se limpiarán:');
    domainsWithObsoleteFields.forEach((domain, index) => {
      const obsoleteFields = [];
      if (domain.analysisSchedule) obsoleteFields.push('analysisSchedule');
      if (domain.settings?.design) obsoleteFields.push('settings.design');
      if (domain.settings?.scanning) obsoleteFields.push('settings.scanning');
      if (domain.settings?.purposes) obsoleteFields.push('settings.purposes');
      if (domain.settings?.vendors) obsoleteFields.push('settings.vendors');
      if (domain.settings?.banner) obsoleteFields.push('settings.banner');
      
      console.log(`   ${index + 1}. ${domain.domain} - Campos: ${obsoleteFields.join(', ')}`);
    });

    if (!dryRun) {
      console.log('\n🧹 Limpiando campos obsoletos...');
      
      // Ejecutar limpieza
      const result = await mongoose.connection.db.collection('domains').updateMany(
        {},
        {
          $unset: {
            'analysisSchedule': 1,
            'settings.design': 1,
            'settings.scanning': 1,
            'settings.purposes': 1,
            'settings.vendors': 1,
            'settings.banner': 1
          }
        }
      );

      console.log(`✅ Limpieza completada. Documentos modificados: ${result.modifiedCount}`);
    } else {
      console.log('\n🔍 DRY-RUN: Los campos se limpiarían en una ejecución real');
    }

    // Verificar resultado
    console.log('\n🔍 Verificando limpieza...');
    const remainingObsoleteFields = await mongoose.connection.db.collection('domains').find({
      $or: [
        { 'analysisSchedule': { $exists: true } },
        { 'settings.design': { $exists: true } },
        { 'settings.scanning': { $exists: true } },
        { 'settings.purposes': { $exists: true } },
        { 'settings.vendors': { $exists: true } },
        { 'settings.banner': { $exists: true } }
      ]
    }).toArray();

    if (remainingObsoleteFields.length === 0) {
      console.log('✅ ¡Todos los campos obsoletos fueron eliminados!');
    } else {
      console.log(`⚠️ Aún quedan ${remainingObsoleteFields.length} dominios con campos obsoletos`);
    }

    console.log('\n🎉 ¡Limpieza completada!');

  } catch (error) {
    console.error('💥 Error durante la limpieza:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  cleanupObsoleteFields().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = cleanupObsoleteFields;