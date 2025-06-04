#!/usr/bin/env node

/**
 * Script maestro para gestión de banner templates
 * Permite exportar e importar templates de manera sencilla
 * 
 * Uso:
 * cd server
 * node scripts/manageBannerTemplates.js export
 * node scripts/manageBannerTemplates.js import [opciones]
 * node scripts/manageBannerTemplates.js backup
 * node scripts/manageBannerTemplates.js restore [archivo]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function showHelp() {
  console.log(`
🛠️  Gestor de Banner Templates

Uso: node scripts/manageBannerTemplates.js <comando> [opciones]

Comandos:
  export              Exportar todos los templates a JSON
  import              Importar templates desde JSON
  backup              Crear backup completo de templates
  restore <archivo>   Restaurar desde backup específico
  help                Mostrar esta ayuda

Ejemplos:
  # Exportar todos los templates
  node scripts/manageBannerTemplates.js export

  # Importar templates (modo simulación)
  node scripts/manageBannerTemplates.js import --dry-run

  # Importar solo templates del sistema
  node scripts/manageBannerTemplates.js import --system-only

  # Importar con sobrescritura
  node scripts/manageBannerTemplates.js import --overwrite

  # Crear backup con timestamp
  node scripts/manageBannerTemplates.js backup

  # Restaurar desde backup específico
  node scripts/manageBannerTemplates.js restore backup-2024-01-15-14-30.json

Opciones de importación:
  --file <ruta>     Archivo específico a importar
  --overwrite       Sobrescribir templates existentes
  --dry-run         Simular importación sin cambios
  --system-only     Importar solo templates del sistema
  --client-only     Importar solo templates de cliente
  `);
}

function runExport() {
  console.log('📤 Exportando banner templates...');
  try {
    execSync('node scripts/exportBannerTemplates.js', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Error durante la exportación:', error.message);
    process.exit(1);
  }
}

function runImport(args) {
  console.log('📥 Importando banner templates...');
  try {
    const importArgs = args.join(' ');
    execSync(`node scripts/importBannerTemplates.js ${importArgs}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Error durante la importación:', error.message);
    process.exit(1);
  }
}

function createBackup() {
  console.log('💾 Creando backup de banner templates...');
  
  const timestamp = new Date().toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '-');
  
  const backupDir = path.join(__dirname, '../../public/Exports/backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  try {
    // Crear directorio de backups si no existe
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Directorio de backups creado: ${backupDir}`);
    }
    
    // Exportar a archivo de backup
    execSync(`node scripts/exportBannerTemplates.js`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Mover el archivo exportado al directorio de backups con timestamp
    const exportFile = path.join(__dirname, '../../public/Exports/banner-templates-export.json');
    if (fs.existsSync(exportFile)) {
      fs.copyFileSync(exportFile, backupFile);
      console.log(`✅ Backup creado: ${backupFile}`);
      
      // Crear archivo de información del backup
      const backupInfo = {
        timestamp: new Date().toISOString(),
        filename: path.basename(backupFile),
        originalFile: 'banner-templates-export.json',
        size: fs.statSync(backupFile).size
      };
      
      const infoFile = backupFile.replace('.json', '-info.json');
      fs.writeFileSync(infoFile, JSON.stringify(backupInfo, null, 2));
      console.log(`📋 Info del backup: ${infoFile}`);
    }
    
  } catch (error) {
    console.error('❌ Error durante el backup:', error.message);
    process.exit(1);
  }
}

function restoreBackup(backupFile) {
  console.log(`🔄 Restaurando desde backup: ${backupFile}`);
  
  try {
    // Verificar si el archivo es una ruta absoluta o relativa
    let fullBackupPath;
    if (path.isAbsolute(backupFile)) {
      fullBackupPath = backupFile;
    } else {
      // Buscar en el directorio de backups
      const backupDir = path.join(__dirname, '../../public/Exports/backups');
      fullBackupPath = path.join(backupDir, backupFile);
      
      // Si no existe, buscar en el directorio principal de exports
      if (!fs.existsSync(fullBackupPath)) {
        fullBackupPath = path.join(__dirname, '../../public/Exports', backupFile);
      }
    }
    
    if (!fs.existsSync(fullBackupPath)) {
      throw new Error(`Archivo de backup no encontrado: ${backupFile}`);
    }
    
    console.log(`📁 Usando archivo: ${fullBackupPath}`);
    
    // Importar desde el archivo de backup
    execSync(`node scripts/importBannerTemplates.js --file "${fullBackupPath}" --overwrite`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Restauración completada');
    
  } catch (error) {
    console.error('❌ Error durante la restauración:', error.message);
    process.exit(1);
  }
}

function listBackups() {
  const backupDir = path.join(__dirname, '../../public/Exports/backups');
  
  if (!fs.existsSync(backupDir)) {
    console.log('📁 No hay directorio de backups aún');
    return;
  }
  
  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.json') && !file.endsWith('-info.json'))
    .sort()
    .reverse(); // Más recientes primero
  
  if (backupFiles.length === 0) {
    console.log('📁 No hay backups disponibles');
    return;
  }
  
  console.log('\n📋 Backups disponibles:');
  backupFiles.forEach((file, index) => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`   ${index + 1}. ${file} (${size} KB, ${stats.mtime.toLocaleString()})`);
  });
  console.log('\nPara restaurar: node scripts/manageBannerTemplates.js restore <nombre-archivo>');
}

// Procesar argumentos de línea de comandos
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'export':
    runExport();
    break;
    
  case 'import':
    runImport(args.slice(1));
    break;
    
  case 'backup':
    createBackup();
    break;
    
  case 'restore':
    if (args.length < 2) {
      console.error('❌ Error: Especifique el archivo de backup a restaurar');
      console.log('Uso: node scripts/manageBannerTemplates.js restore <archivo>');
      listBackups();
      process.exit(1);
    }
    restoreBackup(args[1]);
    break;
    
  case 'list':
  case 'backups':
    listBackups();
    break;
    
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
    
  default:
    if (!command) {
      console.error('❌ Error: No se especificó comando');
    } else {
      console.error(`❌ Error: Comando desconocido "${command}"`);
    }
    showHelp();
    process.exit(1);
}