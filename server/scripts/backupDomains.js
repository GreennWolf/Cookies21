#!/usr/bin/env node

/**
 * SCRIPT DE BACKUP DE DOMINIOS
 * 
 * Crea un backup completo de la colección domains antes de la migración
 * 
 * Uso:
 *   node scripts/backupDomains.js [--output-dir=./backups] [--dev]
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Configurar archivo .env según el modo
const isDev = process.argv.includes('--dev');
const envFile = isDev ? '.env.development.local' : '.env';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

if (isDev) {
  console.log(`🔧 Usando configuración de desarrollo: ${envFile}`);
}

class DomainBackup {
  constructor() {
    this.outputDir = this.getOutputDir();
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  getOutputDir() {
    const customDir = process.argv.find(arg => arg.startsWith('--output-dir='));
    if (customDir) {
      return customDir.split('=')[1];
    }
    return path.join(__dirname, '../backups');
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

  async createBackup() {
    try {
      console.log('💾 Iniciando backup de dominios...');

      // Crear directorio de backup si no existe
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
        console.log(`📁 Directorio creado: ${this.outputDir}`);
      }

      // Obtener todos los dominios
      console.log('📊 Obteniendo dominios de la base de datos...');
      const domains = await mongoose.connection.db.collection('domains').find({}).toArray();
      
      console.log(`✅ Encontrados ${domains.length} dominios`);

      if (domains.length === 0) {
        console.log('ℹ️ No hay dominios para respaldar.');
        return;
      }

      // Crear archivos de backup
      const backupName = `domains_backup_${this.timestamp}`;
      
      // Backup en JSON
      const jsonPath = path.join(this.outputDir, `${backupName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(domains, null, 2));
      console.log(`💾 Backup JSON creado: ${jsonPath}`);

      // Backup comprimido
      const gzip = require('zlib').createGzip();
      const gzipPath = path.join(this.outputDir, `${backupName}.json.gz`);
      const readStream = fs.createReadStream(jsonPath);
      const writeStream = fs.createWriteStream(gzipPath);
      
      await new Promise((resolve, reject) => {
        readStream.pipe(gzip).pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });
      
      console.log(`🗜️ Backup comprimido creado: ${gzipPath}`);

      // Crear metadata del backup
      const metadata = {
        timestamp: this.timestamp,
        totalDomains: domains.length,
        mongoUri: process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@') || 'mongodb://localhost:27017/cookies21',
        nodeVersion: process.version,
        backupVersion: '1.0.0',
        files: {
          json: path.basename(jsonPath),
          compressed: path.basename(gzipPath)
        },
        statistics: this.generateStatistics(domains)
      };

      const metadataPath = path.join(this.outputDir, `${backupName}_metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`📋 Metadata creada: ${metadataPath}`);

      // Mostrar estadísticas
      this.showStatistics(metadata.statistics);

      // Crear script de restauración
      this.createRestoreScript(backupName);

      console.log('\n🎉 ¡Backup completado exitosamente!');
      console.log('\n📁 Archivos creados:');
      console.log(`   ${jsonPath}`);
      console.log(`   ${gzipPath}`);
      console.log(`   ${metadataPath}`);
      console.log(`   ${path.join(this.outputDir, `restore_${backupName}.js`)}`);

      return {
        backupName,
        totalDomains: domains.length,
        files: {
          json: jsonPath,
          compressed: gzipPath,
          metadata: metadataPath
        }
      };

    } catch (error) {
      console.error('💥 Error creando backup:', error);
      throw error;
    }
  }

  generateStatistics(domains) {
    const stats = {
      total: domains.length,
      byStatus: {},
      byClient: {},
      withScanConfig: 0,
      withAnalysisSchedule: 0,
      withSettings: 0,
      oldModelFields: {
        design: 0,
        scanning: 0,
        purposes: 0,
        vendors: 0,
        banner: 0
      }
    };

    domains.forEach(domain => {
      // Por estado
      const status = domain.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Por cliente
      const clientId = domain.clientId?.toString() || 'unknown';
      stats.byClient[clientId] = (stats.byClient[clientId] || 0) + 1;

      // Configuraciones
      if (domain.scanConfig) stats.withScanConfig++;
      if (domain.analysisSchedule) stats.withAnalysisSchedule++;
      if (domain.settings) stats.withSettings++;

      // Campos del modelo antiguo
      if (domain.settings?.design) stats.oldModelFields.design++;
      if (domain.settings?.scanning) stats.oldModelFields.scanning++;
      if (domain.settings?.purposes) stats.oldModelFields.purposes++;
      if (domain.settings?.vendors) stats.oldModelFields.vendors++;
      if (domain.settings?.banner) stats.oldModelFields.banner++;
    });

    return stats;
  }

  showStatistics(stats) {
    console.log('\n📊 ESTADÍSTICAS DEL BACKUP:');
    console.log('============================');
    console.log(`📊 Total de dominios: ${stats.total}`);
    
    console.log('\n🏷️ Por estado:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n⚙️ Configuraciones:');
    console.log(`   Con scanConfig: ${stats.withScanConfig}`);
    console.log(`   Con analysisSchedule: ${stats.withAnalysisSchedule}`);
    console.log(`   Con settings: ${stats.withSettings}`);

    console.log('\n🏗️ Campos del modelo antiguo:');
    Object.entries(stats.oldModelFields).forEach(([field, count]) => {
      console.log(`   settings.${field}: ${count}`);
    });

    const needsMigration = Object.values(stats.oldModelFields).reduce((a, b) => a + b, 0) + stats.withAnalysisSchedule;
    if (needsMigration > 0) {
      console.log(`\n⚠️ Dominios que requieren migración: ${needsMigration}`);
    } else {
      console.log('\n✅ Todos los dominios parecen estar en el formato correcto');
    }
  }

  createRestoreScript(backupName) {
    const restoreScript = `#!/usr/bin/env node

/**
 * SCRIPT DE RESTAURACIÓN AUTOMÁTICO
 * Generado automáticamente para el backup: ${backupName}
 * Fecha: ${new Date().toISOString()}
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function restore() {
  try {
    console.log('🔄 Iniciando restauración desde backup: ${backupName}');
    
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Leer backup
    const backupPath = path.join(__dirname, '${backupName}.json');
    if (!fs.existsSync(backupPath)) {
      throw new Error(\`Archivo de backup no encontrado: \${backupPath}\`);
    }
    
    const domains = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(\`📊 Cargando \${domains.length} dominios desde backup\`);
    
    // Confirmar restauración
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('⚠️ ¿Confirmas la restauración? Esto sobrescribirá los datos actuales (y/N): ', resolve);
    });
    
    readline.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Restauración cancelada');
      return;
    }
    
    // Restaurar dominios
    const collection = mongoose.connection.db.collection('domains');
    
    // Limpiar colección actual
    await collection.deleteMany({});
    console.log('🧹 Colección domains limpiada');
    
    // Insertar dominios del backup
    await collection.insertMany(domains);
    console.log(\`✅ \${domains.length} dominios restaurados\`);
    
    console.log('🎉 ¡Restauración completada exitosamente!');
    
  } catch (error) {
    console.error('💥 Error en restauración:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

restore();
`;

    const restoreScriptPath = path.join(this.outputDir, `restore_${backupName}.js`);
    fs.writeFileSync(restoreScriptPath, restoreScript);
    fs.chmodSync(restoreScriptPath, '755');
    
    console.log(`🔧 Script de restauración creado: ${restoreScriptPath}`);
  }
}

// Ejecutar backup
async function main() {
  const backup = new DomainBackup();
  
  try {
    await backup.connect();
    await backup.createBackup();
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  } finally {
    await backup.disconnect();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = DomainBackup;