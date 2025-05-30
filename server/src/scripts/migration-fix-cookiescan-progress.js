// complete-migration-cleanup.js
// Script completo de migración y limpieza para CookieScan

const mongoose = require('mongoose');
const CookieScan = require('../models/CookieScan');

// Función para crear un objeto progress válido
function createValidProgress(options = {}) {
  const validStatuses = ['pending', 'running', 'completed', 'cancelled', 'error'];
  const status = validStatuses.includes(options.status) ? options.status : 'pending';
  
  return {
    percentage: typeof options.percentage === 'number' ? options.percentage : 0,
    urlsScanned: typeof options.urlsScanned === 'number' ? options.urlsScanned : 0,
    urlsTotal: typeof options.urlsTotal === 'number' ? options.urlsTotal : 100,
    status: status,
    startTime: options.startTime || null,
    endTime: options.endTime || null,
    duration: options.duration || null,
    currentStep: options.currentStep || '',
    message: options.message || '',
    currentUrl: options.currentUrl || ''
  };
}

async function runCompleteMigration() {
  console.log('🔄 Starting complete CookieScan migration and cleanup...\n');

  try {
    // 1. Contar documentos totales
    const totalScans = await CookieScan.countDocuments();
    console.log(`📊 Total scans in database: ${totalScans}`);

    if (totalScans === 0) {
      console.log('✅ No scans to migrate');
      return;
    }

    // 2. Identificar diferentes tipos de problemas
    console.log('\n🔍 Analyzing scan documents...');
    
    const problemTypes = {
      numericProgress: await CookieScan.countDocuments({ progress: { $type: 'number' } }),
      missingProgress: await CookieScan.countDocuments({ 
        $or: [{ progress: { $exists: false } }, { progress: null }] 
      }),
      invalidProgressStatus: await CookieScan.countDocuments({
        'progress.status': { $type: 'number' }
      }),
      invalidStatus: await CookieScan.countDocuments({
        status: { $nin: ['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'running', 'error'] }
      })
    };

    console.log('Problems found:');
    console.log(`- Numeric progress field: ${problemTypes.numericProgress}`);
    console.log(`- Missing progress field: ${problemTypes.missingProgress}`);
    console.log(`- Invalid progress.status: ${problemTypes.invalidProgressStatus}`);
    console.log(`- Invalid scan status: ${problemTypes.invalidStatus}`);

    // 3. Backup de documentos problemáticos (opcional)
    console.log('\n💾 Creating backup of problematic documents...');
    const problematicScans = await CookieScan.find({
      $or: [
        { progress: { $type: 'number' } },
        { progress: { $exists: false } },
        { progress: null },
        { 'progress.status': { $type: 'number' } }
      ]
    }).lean();

    if (problematicScans.length > 0) {
      const fs = require('fs');
      const backupPath = `cookiescan_backup_${Date.now()}.json`;
      fs.writeFileSync(backupPath, JSON.stringify(problematicScans, null, 2));
      console.log(`✅ Backup saved to: ${backupPath}`);
    }

    // 4. Migración por lotes
    console.log('\n🚀 Starting migration...');
    
    const batchSize = 100;
    let processedCount = 0;
    let fixedCount = 0;
    let errorCount = 0;

    // Procesar en lotes para mejor rendimiento
    while (processedCount < totalScans) {
      const scans = await CookieScan.find({})
        .skip(processedCount)
        .limit(batchSize)
        .lean();

      for (const scan of scans) {
        try {
          const updates = {};
          let needsUpdate = false;

          // Verificar y corregir progress
          if (!scan.progress || typeof scan.progress === 'number' || 
              (scan.progress && typeof scan.progress.status === 'number')) {
            
            needsUpdate = true;
            
            // Determinar valores apropiados basados en el estado del scan
            const progressPercentage = typeof scan.progress === 'number' ? scan.progress : 0;
            const scanStatus = scan.status || 'pending';
            
            updates.progress = createValidProgress({
              percentage: progressPercentage,
              urlsScanned: scan.progress?.urlsScanned || 0,
              urlsTotal: scan.scanConfig?.maxUrls || 100,
              status: scanStatus,
              startTime: scan.progress?.startTime || scan.createdAt,
              endTime: scan.progress?.endTime || (scanStatus === 'completed' ? scan.updatedAt : null),
              duration: scan.progress?.duration || null,
              currentStep: scan.progress?.currentStep || '',
              message: scan.progress?.message || ''
            });

            // Calcular duración si es posible
            if (updates.progress.startTime && updates.progress.endTime) {
              updates.progress.duration = (
                new Date(updates.progress.endTime) - new Date(updates.progress.startTime)
              ) / 1000;
            }
          }

          // Verificar status del scan
          const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'running', 'error'];
          if (!validStatuses.includes(scan.status)) {
            needsUpdate = true;
            updates.status = 'error';
          }

          // Aplicar actualizaciones si es necesario
          if (needsUpdate) {
            await CookieScan.updateOne(
              { _id: scan._id },
              { $set: updates }
            );
            fixedCount++;
          }

        } catch (error) {
          console.error(`❌ Error processing scan ${scan._id}:`, error.message);
          errorCount++;
        }
      }

      processedCount += scans.length;
      
      // Mostrar progreso
      const progress = Math.round((processedCount / totalScans) * 100);
      process.stdout.write(`\rProgress: ${progress}% (${processedCount}/${totalScans})`);
    }

    console.log('\n');

    // 5. Verificación final
    console.log('\n🔍 Running final verification...');
    
    const remainingProblems = {
      numericProgress: await CookieScan.countDocuments({ progress: { $type: 'number' } }),
      missingProgress: await CookieScan.countDocuments({ 
        $or: [{ progress: { $exists: false } }, { progress: null }] 
      }),
      invalidProgressStatus: await CookieScan.countDocuments({
        'progress.status': { $type: 'number' }
      })
    };

    console.log('\nRemaining problems:');
    console.log(`- Numeric progress field: ${remainingProblems.numericProgress}`);
    console.log(`- Missing progress field: ${remainingProblems.missingProgress}`);
    console.log(`- Invalid progress.status: ${remainingProblems.invalidProgressStatus}`);

    // 6. Si aún hay problemas, intentar fix más agresivo
    if (Object.values(remainingProblems).some(count => count > 0)) {
      console.log('\n⚠️  Some problems remain. Running aggressive fix...');
      
      const result = await CookieScan.updateMany(
        {},
        [{
          $set: {
            progress: {
              percentage: {
                $cond: {
                  if: { $and: [
                    { $ne: [{ $type: "$progress" }, "missing"] },
                    { $eq: [{ $type: "$progress" }, "object"] },
                    { $isNumber: "$progress.percentage" }
                  ]},
                  then: "$progress.percentage",
                  else: 0
                }
              },
              urlsScanned: {
                $cond: {
                  if: { $and: [
                    { $ne: [{ $type: "$progress" }, "missing"] },
                    { $eq: [{ $type: "$progress" }, "object"] },
                    { $isNumber: "$progress.urlsScanned" }
                  ]},
                  then: "$progress.urlsScanned",
                  else: 0
                }
              },
              urlsTotal: {
                $ifNull: ["$scanConfig.maxUrls", 100]
              },
              status: {
                $cond: {
                  if: { $in: ["$status", ["pending", "in_progress", "completed", "failed", "cancelled", "running", "error"]] },
                  then: "$status",
                  else: "error"
                }
              },
              startTime: {
                $ifNull: ["$progress.startTime", "$createdAt"]
              },
              endTime: {
                $cond: {
                  if: { $in: ["$status", ["completed", "failed", "cancelled", "error"]] },
                  then: { $ifNull: ["$progress.endTime", "$updatedAt"] },
                  else: null
                }
              },
              duration: {
                $ifNull: ["$progress.duration", null]
              },
              currentStep: "",
              message: "",
              currentUrl: ""
            }
          }
        }]
      );
      
      console.log(`✅ Aggressive fix updated ${result.modifiedCount} documents`);
    }

    // 7. Resumen final
    console.log('\n📊 Migration Summary:');
    console.log(`- Total scans processed: ${processedCount}`);
    console.log(`- Scans fixed: ${fixedCount}`);
    console.log(`- Errors encountered: ${errorCount}`);
    console.log(`- Success rate: ${Math.round((fixedCount / processedCount) * 100)}%`);

    // 8. Mostrar ejemplos de documentos migrados
    console.log('\n📄 Sample migrated documents:');
    const samples = await CookieScan.find({}).limit(3).lean();
    samples.forEach((scan, index) => {
      console.log(`\nSample ${index + 1}:`);
      console.log(`- ID: ${scan._id}`);
      console.log(`- Status: ${scan.status}`);
      console.log(`- Progress:`, JSON.stringify(scan.progress, null, 2));
    });

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Función para limpiar escaneos antiguos o corruptos
async function cleanupOldScans(daysToKeep = 90) {
  console.log(`\n🧹 Cleaning up scans older than ${daysToKeep} days...`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await CookieScan.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['error', 'failed', 'cancelled'] }
  });
  
  console.log(`✅ Deleted ${result.deletedCount} old/failed scans`);
}

// Función principal
async function main() {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Ejecutar migración
    await runCompleteMigration();
    
    // Opcional: Limpiar escaneos antiguos
    const cleanupOld = process.argv.includes('--cleanup');
    if (cleanupOld) {
      await cleanupOldScans();
    }
    
    console.log('\n🎉 All operations completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Ejecutar si es el script principal
if (require.main === module) {
  main();
}

// Exportar funciones para uso en otros scripts
module.exports = {
  runCompleteMigration,
  cleanupOldScans,
  createValidProgress
};