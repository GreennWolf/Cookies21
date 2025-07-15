#!/usr/bin/env node

/**
 * SCRIPT DE MIGRACIÓN COMPLETA AUTOMÁTICA
 * 
 * Ejecuta todo el proceso de migración:
 * 1. Crear backup
 * 2. Ejecutar migración
 * 3. Verificar resultados
 * 
 * Uso:
 *   node scripts/runFullMigration.js [--skip-backup] [--dry-run]
 * 
 * Opciones:
 *   --skip-backup    Omitir creación de backup
 *   --dry-run        Solo simular cambios sin aplicarlos
 */

const path = require('path');

// Configurar archivo .env según el modo
const isDev = process.argv.includes('--dev');
const envFile = isDev ? '.env.development.local' : '.env';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

console.log(`🔧 Usando archivo de configuración: ${envFile}`);
if (isDev) {
  console.log('🚧 MODO DESARROLLO ACTIVADO\n');
}

const DomainBackup = require('./backupDomains');
const DomainMigrator = require('./migrateDomainModel');
const MigrationVerifier = require('./verifyDomainMigration');

class FullMigrationRunner {
  constructor() {
    this.skipBackup = process.argv.includes('--skip-backup');
    this.dryRun = process.argv.includes('--dry-run');
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 INICIANDO MIGRACIÓN COMPLETA DEL MODELO DOMAIN');
    console.log('================================================\n');

    if (this.dryRun) {
      console.log('🔍 MODO DRY-RUN: Solo se simularán los cambios\n');
    }

    try {
      let backupInfo = null;

      // Paso 1: Crear backup
      if (!this.skipBackup && !this.dryRun) {
        console.log('📝 PASO 1: CREANDO BACKUP');
        console.log('==========================');
        
        const backup = new DomainBackup();
        await backup.connect();
        backupInfo = await backup.createBackup();
        await backup.disconnect();
        
        console.log('✅ Backup completado\n');
      } else if (this.skipBackup) {
        console.log('⏭️ PASO 1: OMITIENDO BACKUP (--skip-backup)\n');
      } else {
        console.log('⏭️ PASO 1: OMITIENDO BACKUP (dry-run mode)\n');
      }

      // Paso 2: Ejecutar migración
      console.log('🔄 PASO 2: EJECUTANDO MIGRACIÓN');
      console.log('================================');
      
      const migrator = new DomainMigrator();
      
      // Override del constructor para forzar configuración
      migrator.dryRun = this.dryRun;
      migrator.force = true; // Forzar para automatización
      
      await migrator.connect();
      await migrator.migrate();
      await migrator.disconnect();
      
      console.log('✅ Migración completada\n');

      // Paso 3: Verificar resultados
      console.log('🔍 PASO 3: VERIFICANDO MIGRACIÓN');
      console.log('=================================');
      
      const verifier = new MigrationVerifier();
      verifier.detailed = true; // Mostrar detalles
      
      await verifier.connect();
      const results = await verifier.verify();
      await verifier.disconnect();
      
      console.log('✅ Verificación completada\n');

      // Mostrar resumen final
      this.showFinalSummary(backupInfo, migrator.stats, verifier.stats);

      // Mostrar próximos pasos
      this.showNextSteps(verifier.stats);

    } catch (error) {
      console.error('💥 ERROR FATAL EN MIGRACIÓN:', error);
      
      console.log('\n🔧 ACCIONES DE RECUPERACIÓN:');
      console.log('1. Revisar logs de error arriba');
      console.log('2. Verificar conexión a MongoDB');
      console.log('3. Restaurar desde backup si es necesario');
      
      if (!this.skipBackup && !this.dryRun) {
        console.log('4. Ejecutar script de restauración en ./backups/');
      }
      
      process.exit(1);
    }
  }

  showFinalSummary(backupInfo, migratorStats, verifierStats) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    console.log('🎉 MIGRACIÓN COMPLETA FINALIZADA');
    console.log('=================================');
    console.log(`⏱️ Duración total: ${duration}s`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    
    if (backupInfo && !this.dryRun) {
      console.log('\n💾 BACKUP CREADO:');
      console.log(`   📁 Nombre: ${backupInfo.backupName}`);
      console.log(`   📊 Dominios respaldados: ${backupInfo.totalDomains}`);
      console.log(`   📁 Archivos: ${Object.keys(backupInfo.files).length}`);
    }
    
    if (migratorStats) {
      console.log('\n🔄 MIGRACIÓN:');
      console.log(`   📊 Total procesados: ${migratorStats.total}`);
      console.log(`   ✅ Migrados exitosamente: ${migratorStats.migrated}`);
      console.log(`   ❌ Errores: ${migratorStats.errors}`);
      console.log(`   ⏭️ Omitidos: ${migratorStats.skipped}`);
    }
    
    if (verifierStats) {
      console.log('\n🔍 VERIFICACIÓN:');
      console.log(`   📊 Total verificados: ${verifierStats.total}`);
      console.log(`   ✅ Válidos: ${verifierStats.valid}`);
      console.log(`   ❌ Inválidos: ${verifierStats.invalid}`);
      console.log(`   ⚠️ Con advertencias: ${verifierStats.warnings}`);
    }
  }

  showNextSteps(verifierStats) {
    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('==================');
    
    if (this.dryRun) {
      console.log('🔍 Has ejecutado en modo DRY-RUN');
      console.log('   Para aplicar los cambios realmente:');
      console.log('   node scripts/runFullMigration.js');
      console.log('');
      return;
    }
    
    if (verifierStats && verifierStats.invalid > 0) {
      console.log('⚠️ ACCIONES REQUERIDAS:');
      console.log('   1. Revisar dominios inválidos reportados arriba');
      console.log('   2. Corregir problemas manualmente en MongoDB');
      console.log('   3. Re-ejecutar verificación: node scripts/verifyDomainMigration.js');
      console.log('   4. Una vez corregido, continuar con pasos normales');
    } else {
      console.log('✅ MIGRACIÓN EXITOSA - Continuar con:');
    }
    
    console.log('\n🔄 REINICIAR SERVICIOS:');
    console.log('   # Si usas PM2:');
    console.log('   pm2 restart cookie21-server');
    console.log('');
    console.log('   # Si usas desarrollo:');
    console.log('   npm run dev');
    console.log('');
    
    console.log('🧪 VERIFICAR FUNCIONALIDAD:');
    console.log('   1. Probar creación de nuevos dominios');
    console.log('   2. Configurar escaneo automático en un dominio');
    console.log('   3. Verificar que los schedulers funcionan');
    console.log('   4. Revisar logs por errores');
    console.log('');
    
    console.log('📊 MONITOREO POST-MIGRACIÓN:');
    console.log('   1. Revisar logs del servidor por errores');
    console.log('   2. Verificar que los cron jobs se ejecutan');
    console.log('   3. Monitorear performance de escaneos');
    console.log('   4. Verificar que el frontend funciona correctamente');
    console.log('');
    
    if (!this.skipBackup) {
      console.log('🔄 EN CASO DE PROBLEMAS:');
      console.log('   1. Detener servidor');
      console.log('   2. Ejecutar script de restauración en ./backups/');
      console.log('   3. Reiniciar servidor');
      console.log('   4. Reportar problemas encontrados');
    }
  }

  // Mostrar ayuda de uso
  static showHelp() {
    console.log('🔄 MIGRACIÓN COMPLETA DEL MODELO DOMAIN');
    console.log('=======================================\n');
    
    console.log('DESCRIPCIÓN:');
    console.log('   Ejecuta todo el proceso de migración automáticamente:\n');
    console.log('   1. 💾 Crear backup de dominios existentes');
    console.log('   2. 🔄 Migrar modelo Domain al formato simplificado');
    console.log('   3. 🔍 Verificar que la migración fue exitosa');
    console.log('   4. 📊 Mostrar resumen y próximos pasos\n');
    
    console.log('USO:');
    console.log('   node scripts/runFullMigration.js [opciones]\n');
    
    console.log('OPCIONES:');
    console.log('   --dry-run        Solo simular cambios sin aplicarlos');
    console.log('   --skip-backup    Omitir creación de backup (no recomendado)');
    console.log('   --dev            Usar .env.development.local en lugar de .env');
    console.log('   --help           Mostrar esta ayuda\n');
    
    console.log('EJEMPLOS:');
    console.log('   # Simular migración completa (recomendado primero)');
    console.log('   node scripts/runFullMigration.js --dry-run\n');
    
    console.log('   # Ejecutar migración completa con backup');
    console.log('   node scripts/runFullMigration.js\n');
    
    console.log('   # Usar configuración de desarrollo');
    console.log('   node scripts/runFullMigration.js --dev --dry-run\n');
    
    console.log('   # Ejecutar migración sin backup (no recomendado)');
    console.log('   node scripts/runFullMigration.js --skip-backup\n');
    
    console.log('REQUISITOS:');
    console.log('   - MongoDB en funcionamiento');
    console.log('   - Variable MONGODB_URI configurada en .env');
    console.log('   - Permisos de escritura en directorio backups/');
    console.log('   - Node.js y dependencias instaladas\n');
    
    console.log('ARCHIVOS GENERADOS:');
    console.log('   ./backups/domains_backup_[timestamp].json');
    console.log('   ./backups/domains_backup_[timestamp].json.gz');
    console.log('   ./backups/domains_backup_[timestamp]_metadata.json');
    console.log('   ./backups/restore_domains_backup_[timestamp].js\n');
  }
}

// Ejecutar migración completa
async function main() {
  // Mostrar ayuda si se solicita
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    FullMigrationRunner.showHelp();
    return;
  }

  const runner = new FullMigrationRunner();
  await runner.run();
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = FullMigrationRunner;