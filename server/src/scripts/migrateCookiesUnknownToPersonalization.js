const mongoose = require('mongoose');
const Cookie = require('../models/Cookie');
const logger = require('../utils/logger');

/**
 * Script para migrar cookies con categoría 'unknown' a 'personalization' 
 * y provider 'Unknown' a 'Propios'
 */

async function migrateCookies() {
  try {
    logger.info('🔄 Iniciando migración de cookies con categoría unknown...');

    // Buscar todas las cookies con categoría 'unknown'
    const unknownCategoryCookies = await Cookie.find({ 
      category: 'unknown' 
    });

    logger.info(`📊 Encontradas ${unknownCategoryCookies.length} cookies con categoría 'unknown'`);

    // Buscar todas las cookies con provider 'Unknown'
    const unknownProviderCookies = await Cookie.find({ 
      provider: 'Unknown' 
    });

    logger.info(`📊 Encontradas ${unknownProviderCookies.length} cookies con provider 'Unknown'`);

    let categoryUpdated = 0;
    let providerUpdated = 0;
    let errors = 0;

    // Migrar categorías
    for (const cookie of unknownCategoryCookies) {
      try {
        cookie.category = 'personalization';
        await cookie.save();
        categoryUpdated++;
        
        if (categoryUpdated % 100 === 0) {
          logger.info(`✅ Migradas ${categoryUpdated} cookies de categoría`);
        }
      } catch (error) {
        logger.error(`❌ Error migrando categoría de cookie ${cookie._id}: ${error.message}`);
        errors++;
      }
    }

    // Migrar providers
    for (const cookie of unknownProviderCookies) {
      try {
        cookie.provider = 'Propios';
        await cookie.save();
        providerUpdated++;
        
        if (providerUpdated % 100 === 0) {
          logger.info(`✅ Migradas ${providerUpdated} cookies de provider`);
        }
      } catch (error) {
        logger.error(`❌ Error migrando provider de cookie ${cookie._id}: ${error.message}`);
        errors++;
      }
    }

    // Eliminar duplicados basándose en name + domain principal
    logger.info('🔍 Buscando cookies duplicadas...');
    
    const duplicatesResult = await Cookie.aggregate([
      {
        $group: {
          _id: {
            name: '$name',
            domainId: '$domainId',
            // Extraer dominio principal de attributes.domain
            mainDomain: {
              $let: {
                vars: {
                  domain: '$attributes.domain'
                },
                in: {
                  $cond: {
                    if: { $regexMatch: { input: '$$domain', regex: '^\\.' } },
                    then: { $substr: ['$$domain', 1, -1] },
                    else: '$$domain'
                  }
                }
              }
            }
          },
          docs: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    logger.info(`📊 Encontrados ${duplicatesResult.length} grupos de cookies duplicadas`);

    let duplicatesRemoved = 0;

    for (const group of duplicatesResult) {
      try {
        // Ordenar por fecha de creación (más reciente primero)
        const sortedDocs = group.docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Mantener el más reciente, eliminar el resto
        const toKeep = sortedDocs[0];
        const toRemove = sortedDocs.slice(1);

        logger.info(`🔄 Manteniendo cookie ${toKeep._id}, eliminando ${toRemove.length} duplicados`);

        for (const duplicate of toRemove) {
          await Cookie.findByIdAndDelete(duplicate._id);
          duplicatesRemoved++;
        }
      } catch (error) {
        logger.error(`❌ Error eliminando duplicados: ${error.message}`);
        errors++;
      }
    }

    // Resumen final
    logger.info('📈 Resumen de migración:');
    logger.info(`   ✅ Categorías actualizadas: ${categoryUpdated}`);
    logger.info(`   ✅ Providers actualizados: ${providerUpdated}`);
    logger.info(`   🗑️ Duplicados eliminados: ${duplicatesRemoved}`);
    logger.info(`   ❌ Errores: ${errors}`);

    // Verificación final
    const remainingUnknownCategory = await Cookie.countDocuments({ category: 'unknown' });
    const remainingUnknownProvider = await Cookie.countDocuments({ provider: 'Unknown' });

    logger.info('🔍 Verificación final:');
    logger.info(`   📊 Cookies con categoría 'unknown': ${remainingUnknownCategory}`);
    logger.info(`   📊 Cookies con provider 'Unknown': ${remainingUnknownProvider}`);

    if (remainingUnknownCategory === 0 && remainingUnknownProvider === 0) {
      logger.info('✅ Migración completada exitosamente');
    } else {
      logger.warn('⚠️ Aún quedan cookies sin migrar');
    }

    return {
      categoryUpdated,
      providerUpdated,
      duplicatesRemoved,
      errors,
      remainingUnknownCategory,
      remainingUnknownProvider
    };

  } catch (error) {
    logger.error('❌ Error general en migración:', error);
    throw error;
  }
}

// Función para ejecutar la migración si se llama directamente
async function runMigration() {
  try {
    // Conectar a MongoDB si no está conectado
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21';
      await mongoose.connect(mongoUri);
      logger.info('📦 Conectado a MongoDB para migración');
    }

    const result = await migrateCookies();
    
    logger.info('🎉 Migración completada:', result);
    
    // Cerrar conexión si la abrimos aquí
    if (process.env.NODE_ENV !== 'production') {
      await mongoose.connection.close();
      logger.info('📦 Conexión a MongoDB cerrada');
    }

    process.exit(0);
  } catch (error) {
    logger.error('💥 Error en migración:', error);
    process.exit(1);
  }
}

// Si el script se ejecuta directamente
if (require.main === module) {
  runMigration();
}

module.exports = { migrateCookies };