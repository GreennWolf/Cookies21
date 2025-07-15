#!/usr/bin/env node

/**
 * SCRIPT DE MIGRACIÓN DEL MODELO DOMAIN
 * 
 * Transforma todos los dominios del modelo complejo al modelo simplificado
 * 
 * Uso:
 *   node scripts/migrateDomainModel.js [--dry-run] [--force] [--dev]
 * 
 * Opciones:
 *   --dry-run    Solo mostrar qué cambios se harían sin aplicarlos
 *   --force      Forzar migración sin confirmación
 *   --dev        Usar .env.development.local en lugar de .env
 */

const mongoose = require('mongoose');
const path = require('path');

// Configurar archivo .env según el modo
const isDev = process.argv.includes('--dev');
const envFile = isDev ? '.env.development.local' : '.env';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

if (isDev) {
  console.log(`🔧 Usando configuración de desarrollo: ${envFile}`);
}

// Modelo temporal para el esquema antiguo
const oldDomainSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  domain: { type: String, required: true, unique: true, trim: true, lowercase: true },
  settings: {
    design: Object,
    defaultTemplateId: mongoose.Schema.Types.ObjectId,
    scanning: Object,
    purposes: Array,
    vendors: Array,
    banner: Object
  },
  analysisSchedule: Object,
  scanConfig: Object,
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'pending' }
}, { timestamps: true, strict: false });

// Modelo nuevo simplificado (el actual)
const Domain = require('../src/models/Domain');

// Modelo temporal para leer datos antiguos
const OldDomain = mongoose.model('OldDomain', oldDomainSchema, 'domains');

class DomainMigrator {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.force = process.argv.includes('--force');
    this.stats = {
      total: 0,
      migrated: 0,
      errors: 0,
      skipped: 0
    };
  }

  async connect() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21';
    console.log(`🔗 Conectando a MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado a MongoDB');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  }

  /**
   * Migrar configuración de escaneo del formato antiguo al nuevo
   */
  migrateScanConfig(oldDomain) {
    const newScanConfig = {
      autoScanEnabled: false, // Desactivado por defecto
      scanInterval: 'daily',
      cronExpression: '0 2 * * *',
      timezone: 'UTC',
      scanType: 'smart',
      maxDepth: 3,
      includeSubdomains: false,
      enableAdvancedAnalysis: false,
      notifyOnCompletion: true,
      retryAttempts: 2,
      smartAnalysisFrequency: 'weekly',
      cookieCleanupAction: 'mark_inactive',
      cookieCleanupEnabled: true,
      scanStatus: 'idle',
      firstScanCompleted: false,
      embedDetectionEnabled: true
    };

    // Migrar desde scanConfig existente (si existe)
    if (oldDomain.scanConfig) {
      const old = oldDomain.scanConfig;
      
      if (old.autoScanEnabled !== undefined) {
        newScanConfig.autoScanEnabled = old.autoScanEnabled;
      }
      
      if (old.scanInterval) {
        newScanConfig.scanInterval = old.scanInterval;
      }
      
      if (old.cronExpression) {
        newScanConfig.cronExpression = old.cronExpression;
      }
      
      if (old.timezone) {
        newScanConfig.timezone = old.timezone;
      }
      
      if (old.scanType) {
        newScanConfig.scanType = old.scanType;
      }
      
      if (old.maxDepth !== undefined) {
        newScanConfig.maxDepth = old.maxDepth;
      }
      
      if (old.includeSubdomains !== undefined) {
        newScanConfig.includeSubdomains = old.includeSubdomains;
      }
      
      if (old.enableAdvancedAnalysis !== undefined) {
        newScanConfig.enableAdvancedAnalysis = old.enableAdvancedAnalysis;
      }
      
      if (old.notifyOnCompletion !== undefined) {
        newScanConfig.notifyOnCompletion = old.notifyOnCompletion;
      }
      
      if (old.retryAttempts !== undefined) {
        newScanConfig.retryAttempts = old.retryAttempts;
      }
      
      if (old.smartAnalysisFrequency) {
        newScanConfig.smartAnalysisFrequency = old.smartAnalysisFrequency;
      }
      
      if (old.cookieCleanupAction) {
        newScanConfig.cookieCleanupAction = old.cookieCleanupAction;
      }
      
      if (old.cookieCleanupEnabled !== undefined) {
        newScanConfig.cookieCleanupEnabled = old.cookieCleanupEnabled;
      }
      
      if (old.scanStatus) {
        newScanConfig.scanStatus = old.scanStatus;
      }
      
      if (old.lastScheduledScan) {
        newScanConfig.lastScheduledScan = old.lastScheduledScan;
      }
      
      if (old.lastFullAnalysis) {
        newScanConfig.lastFullAnalysis = old.lastFullAnalysis;
      }
      
      if (old.nextScheduledScan) {
        newScanConfig.nextScheduledScan = old.nextScheduledScan;
      }
      
      if (old.firstScanCompleted !== undefined) {
        newScanConfig.firstScanCompleted = old.firstScanCompleted;
      }
      
      if (old.lastScanDuration) {
        newScanConfig.lastScanDuration = old.lastScanDuration;
      }
      
      if (old.lastScanResult) {
        newScanConfig.lastScanResult = old.lastScanResult;
      }
      
      if (old.lastError) {
        newScanConfig.lastError = old.lastError;
      }
      
      if (old.embedDetectionEnabled !== undefined) {
        newScanConfig.embedDetectionEnabled = old.embedDetectionEnabled;
      }
    }

    // Migrar desde analysisSchedule (si existe)
    if (oldDomain.analysisSchedule) {
      const schedule = oldDomain.analysisSchedule;
      
      if (schedule.enabled !== undefined) {
        newScanConfig.autoScanEnabled = schedule.enabled;
      }
      
      // Convertir frequency a scanInterval
      if (schedule.frequency) {
        const frequencyMap = {
          'daily': 'daily',
          'weekly': 'weekly', 
          'monthly': 'monthly'
        };
        newScanConfig.scanInterval = frequencyMap[schedule.frequency] || 'daily';
      }
      
      if (schedule.lastRun) {
        newScanConfig.lastScheduledScan = schedule.lastRun;
      }
      
      if (schedule.nextRun) {
        newScanConfig.nextScheduledScan = schedule.nextRun;
      }
      
      // Migrar configuración de análisis
      if (schedule.analysisConfig) {
        const analysisConfig = schedule.analysisConfig;
        
        if (analysisConfig.scanType) {
          // Mapear tipos de escaneo antiguos a nuevos
          const scanTypeMap = {
            'full': 'full',
            'quick': 'quick',
            'deep': 'full'
          };
          newScanConfig.scanType = scanTypeMap[analysisConfig.scanType] || 'smart';
        }
        
        if (analysisConfig.includeSubdomains !== undefined) {
          newScanConfig.includeSubdomains = analysisConfig.includeSubdomains;
        }
        
        if (analysisConfig.depth !== undefined) {
          newScanConfig.maxDepth = Math.min(analysisConfig.depth, 10);
        }
      }
    }

    // Migrar desde settings.scanning (si existe)
    if (oldDomain.settings?.scanning) {
      const scanning = oldDomain.settings.scanning;
      
      if (scanning.enabled !== undefined) {
        newScanConfig.autoScanEnabled = scanning.enabled;
      }
      
      if (scanning.interval) {
        // Convertir horas a intervalo
        const hours = parseInt(scanning.interval);
        if (hours === 1) newScanConfig.scanInterval = 'hourly';
        else if (hours === 2) newScanConfig.scanInterval = 'every-2-hours';
        else if (hours === 6) newScanConfig.scanInterval = 'every-6-hours';
        else if (hours === 12) newScanConfig.scanInterval = 'every-12-hours';
        else if (hours === 24) newScanConfig.scanInterval = 'daily';
        else if (hours === 168) newScanConfig.scanInterval = 'weekly';
        else newScanConfig.scanInterval = 'daily';
      }
      
      if (scanning.lastScan) {
        newScanConfig.lastScheduledScan = scanning.lastScan;
      }
      
      if (scanning.autoDetect !== undefined) {
        newScanConfig.enableAdvancedAnalysis = scanning.autoDetect;
      }
    }

    return newScanConfig;
  }

  /**
   * Migrar configuración de settings del formato antiguo al nuevo
   */
  migrateSettings(oldDomain) {
    const newSettings = {};
    
    // Solo mantener defaultTemplateId
    if (oldDomain.settings?.defaultTemplateId) {
      newSettings.defaultTemplateId = oldDomain.settings.defaultTemplateId;
    }
    
    return newSettings;
  }

  /**
   * Crear el nuevo documento de dominio
   */
  createNewDomain(oldDomain) {
    return {
      _id: oldDomain._id,
      clientId: oldDomain.clientId,
      domain: oldDomain.domain,
      settings: this.migrateSettings(oldDomain),
      scanConfig: this.migrateScanConfig(oldDomain),
      status: oldDomain.status || 'pending',
      createdAt: oldDomain.createdAt,
      updatedAt: new Date()
    };
  }

  /**
   * Mostrar diferencias entre el dominio antiguo y el nuevo
   */
  showDifferences(oldDomain, newDomain) {
    console.log(`\n📋 Cambios para dominio: ${oldDomain.domain}`);
    console.log(`   ID: ${oldDomain._id}`);
    console.log(`   Cliente: ${oldDomain.clientId}`);
    
    // Settings
    console.log(`\n   🔧 Settings:`);
    const oldDefaultTemplate = oldDomain.settings?.defaultTemplateId;
    const newDefaultTemplate = newDomain.settings?.defaultTemplateId;
    
    if (oldDefaultTemplate !== newDefaultTemplate) {
      console.log(`      defaultTemplateId: ${oldDefaultTemplate} → ${newDefaultTemplate}`);
    } else {
      console.log(`      defaultTemplateId: ${newDefaultTemplate || 'sin cambios'}`);
    }
    
    // Campos eliminados
    const removedFields = [];
    if (oldDomain.settings?.design) removedFields.push('settings.design');
    if (oldDomain.settings?.scanning) removedFields.push('settings.scanning');
    if (oldDomain.settings?.purposes) removedFields.push('settings.purposes');
    if (oldDomain.settings?.vendors) removedFields.push('settings.vendors');
    if (oldDomain.settings?.banner) removedFields.push('settings.banner');
    if (oldDomain.analysisSchedule) removedFields.push('analysisSchedule');
    
    if (removedFields.length > 0) {
      console.log(`   ❌ Campos eliminados: ${removedFields.join(', ')}`);
    }
    
    // ScanConfig
    console.log(`\n   ⚙️ ScanConfig:`);
    console.log(`      autoScanEnabled: ${newDomain.scanConfig.autoScanEnabled}`);
    console.log(`      scanInterval: ${newDomain.scanConfig.scanInterval}`);
    console.log(`      scanType: ${newDomain.scanConfig.scanType}`);
    console.log(`      maxDepth: ${newDomain.scanConfig.maxDepth}`);
    console.log(`      includeSubdomains: ${newDomain.scanConfig.includeSubdomains}`);
  }

  /**
   * Ejecutar la migración
   */
  async migrate() {
    try {
      console.log('🚀 Iniciando migración del modelo Domain...\n');
      
      if (this.dryRun) {
        console.log('🔍 MODO DRY-RUN: Solo se mostrarán los cambios, no se aplicarán\n');
      }

      // Obtener todos los dominios
      console.log('📊 Obteniendo dominios existentes...');
      const oldDomains = await OldDomain.find({}).lean();
      this.stats.total = oldDomains.length;
      
      console.log(`✅ Encontrados ${oldDomains.length} dominios\n`);
      
      if (oldDomains.length === 0) {
        console.log('ℹ️ No hay dominios para migrar.');
        return;
      }

      // Confirmación (si no es forzado)
      if (!this.force && !this.dryRun) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          readline.question(`⚠️ ¿Confirmas la migración de ${oldDomains.length} dominios? (y/N): `, resolve);
        });
        
        readline.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('❌ Migración cancelada por el usuario.');
          return;
        }
      }

      console.log('🔄 Procesando dominios...\n');

      // Procesar cada dominio
      for (let i = 0; i < oldDomains.length; i++) {
        const oldDomain = oldDomains[i];
        
        try {
          console.log(`[${i + 1}/${oldDomains.length}] Procesando: ${oldDomain.domain}`);
          
          // Verificar si ya está migrado
          const existingNewDomain = await Domain.findById(oldDomain._id).lean();
          
          // Crear nuevo documento
          const newDomain = this.createNewDomain(oldDomain);
          
          // Mostrar diferencias
          this.showDifferences(oldDomain, newDomain);
          
          if (!this.dryRun) {
            // Aplicar migración
            await Domain.findByIdAndUpdate(
              oldDomain._id,
              { 
                $set: newDomain, 
                $unset: { 
                  'settings.design': 1,
                  'settings.scanning': 1,
                  'settings.purposes': 1,
                  'settings.vendors': 1,
                  'settings.banner': 1,
                  'analysisSchedule': 1
                }
              },
              { upsert: true, new: true }
            );
            
            console.log(`   ✅ Migrado exitosamente`);
            this.stats.migrated++;
          } else {
            console.log(`   🔍 DRY-RUN: Cambios preparados (no aplicados)`);
            this.stats.migrated++;
          }
          
        } catch (error) {
          console.error(`   ❌ Error migrando ${oldDomain.domain}:`, error.message);
          this.stats.errors++;
        }
        
        console.log(''); // Línea en blanco
      }
      
      // Mostrar estadísticas finales
      this.showStats();
      
    } catch (error) {
      console.error('💥 Error fatal durante la migración:', error);
      throw error;
    }
  }

  /**
   * Mostrar estadísticas de la migración
   */
  showStats() {
    console.log('\n📈 ESTADÍSTICAS DE MIGRACIÓN:');
    console.log('================================');
    console.log(`📊 Total de dominios: ${this.stats.total}`);
    console.log(`✅ Migrados exitosamente: ${this.stats.migrated}`);
    console.log(`❌ Errores: ${this.stats.errors}`);
    console.log(`⏭️ Omitidos: ${this.stats.skipped}`);
    
    if (this.dryRun) {
      console.log('\n🔍 Esta fue una ejecución DRY-RUN. Para aplicar los cambios, ejecuta:');
      console.log('   node scripts/migrateDomainModel.js --force');
    } else if (this.stats.migrated > 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
      console.log('\n📝 Próximos pasos recomendados:');
      console.log('   1. Verificar que los dominios funcionan correctamente');
      console.log('   2. Reiniciar los schedulers de escaneo automático');
      console.log('   3. Probar la creación de nuevos dominios');
    }
  }

  /**
   * Crear backup de la base de datos
   */
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `domains_backup_${timestamp}`;
    
    console.log(`💾 Creando backup: ${backupName}`);
    
    try {
      // Exportar colección domains
      const domains = await OldDomain.find({}).lean();
      
      const fs = require('fs');
      const backupPath = path.join(__dirname, `../backups/${backupName}.json`);
      
      // Crear directorio de backups si no existe
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      fs.writeFileSync(backupPath, JSON.stringify(domains, null, 2));
      
      console.log(`✅ Backup creado: ${backupPath}`);
      console.log(`   Dominios respaldados: ${domains.length}`);
      
    } catch (error) {
      console.error('❌ Error creando backup:', error.message);
      throw error;
    }
  }
}

// Ejecutar migración
async function main() {
  const migrator = new DomainMigrator();
  
  try {
    await migrator.connect();
    
    // Crear backup antes de migrar (si no es dry-run)
    if (!migrator.dryRun) {
      await migrator.createBackup();
    }
    
    await migrator.migrate();
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = DomainMigrator;