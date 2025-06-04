#!/usr/bin/env node

/**
 * Script para importar banner templates desde archivos JSON exportados
 * Se ejecuta desde: server/scripts/importBannerTemplates.js
 * 
 * Uso:
 * cd server
 * node scripts/importBannerTemplates.js [opciones]
 * 
 * Opciones:
 * --file <ruta>    Archivo específico a importar (por defecto: public/Exports/banner-templates-export.json)
 * --overwrite      Sobrescribir templates existentes por nombre
 * --dry-run        Simular importación sin cambios reales
 * --system-only    Importar solo templates del sistema
 * --client-only    Importar solo templates de cliente
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Importar el modelo BannerTemplate
const BannerTemplate = require('../src/models/BannerTemplate');

// Configuración por defecto
const DEFAULT_IMPORT_FILE = path.join(__dirname, '../../public/Exports/banner-templates-export.json');

function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    file: DEFAULT_IMPORT_FILE,
    overwrite: false,
    dryRun: false,
    systemOnly: false,
    clientOnly: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
        options.file = args[++i];
        break;
      case '--overwrite':
        options.overwrite = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--system-only':
        options.systemOnly = true;
        break;
      case '--client-only':
        options.clientOnly = true;
        break;
      case '--help':
        console.log(`
Uso: node scripts/importBannerTemplates.js [opciones]

Opciones:
  --file <ruta>     Archivo específico a importar
  --overwrite       Sobrescribir templates existentes por nombre
  --dry-run         Simular importación sin cambios reales
  --system-only     Importar solo templates del sistema
  --client-only     Importar solo templates de cliente
  --help            Mostrar esta ayuda
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

async function importBannerTemplates(options) {
  try {
    console.log('🚀 Iniciando importación de banner templates...');
    console.log('⚙️ Opciones:', {
      file: options.file,
      overwrite: options.overwrite,
      dryRun: options.dryRun,
      systemOnly: options.systemOnly,
      clientOnly: options.clientOnly
    });

    // Verificar que el archivo existe
    if (!fs.existsSync(options.file)) {
      throw new Error(`Archivo no encontrado: ${options.file}`);
    }

    // Leer archivo de exportación
    console.log('📄 Leyendo archivo de exportación...');
    const fileContent = fs.readFileSync(options.file, 'utf8');
    const importData = JSON.parse(fileContent);

    console.log('📊 Información de exportación:');
    console.log(`   Timestamp: ${importData.exportInfo?.timestamp}`);
    console.log(`   Total templates: ${importData.exportInfo?.totalTemplates}`);
    console.log(`   Versión: ${importData.exportInfo?.version}`);

    if (!importData.templates || !Array.isArray(importData.templates)) {
      throw new Error('Formato de archivo inválido: no se encontraron templates');
    }

    // Filtrar templates según opciones
    let templatesToImport = importData.templates;
    
    if (options.systemOnly) {
      templatesToImport = templatesToImport.filter(t => t.type === 'system');
      console.log(`🔧 Filtrando solo templates del sistema: ${templatesToImport.length}`);
    }
    
    if (options.clientOnly) {
      templatesToImport = templatesToImport.filter(t => t.type === 'client');
      console.log(`👤 Filtrando solo templates de cliente: ${templatesToImport.length}`);
    }

    if (templatesToImport.length === 0) {
      console.log('⚠️ No hay templates para importar después del filtrado');
      process.exit(0);
    }

    // Conectar a MongoDB si no es dry-run
    if (!options.dryRun) {
      console.log('📡 Conectando a MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21');
      console.log('✅ Conectado a MongoDB');
    }

    // Procesar cada template
    const results = {
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    };

    console.log(`\n🔄 Procesando ${templatesToImport.length} templates...`);

    for (const templateData of templatesToImport) {
      try {
        const templateName = templateData.name;
        console.log(`\n📝 Procesando: "${templateName}"`);

        if (!options.dryRun) {
          // Verificar si ya existe un template con el mismo nombre
          const existingTemplate = await BannerTemplate.findOne({ name: templateName });

          if (existingTemplate && !options.overwrite) {
            console.log(`   ⏭️ Saltando - ya existe (use --overwrite para sobrescribir)`);
            results.skipped++;
            continue;
          }

          // Preparar datos para importación
          const templateToSave = {
            name: templateData.name,
            description: templateData.description,
            type: templateData.type,
            status: templateData.status,
            layout: templateData.layout,
            components: templateData.components,
            theme: templateData.theme,
            metadata: templateData.metadata,
            tags: templateData.tags,
            category: templateData.category,
            // No importar clientId para evitar conflictos
            clientId: templateData.type === 'system' ? null : undefined
          };

          if (existingTemplate && options.overwrite) {
            // Actualizar template existente
            await BannerTemplate.findByIdAndUpdate(existingTemplate._id, templateToSave);
            console.log(`   ✅ Actualizado existosamente`);
            results.updated++;
          } else {
            // Crear nuevo template
            const newTemplate = new BannerTemplate(templateToSave);
            await newTemplate.save();
            console.log(`   ✅ Importado exitosamente`);
            results.imported++;
          }
        } else {
          // Modo dry-run
          console.log(`   🔍 [DRY-RUN] Se importaría como nuevo template`);
          results.imported++;
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.errors++;
        results.errorDetails.push({
          template: templateData.name,
          error: error.message
        });
      }
    }

    // Mostrar resumen
    console.log('\n📈 Resumen de importación:');
    console.log(`   ✅ Importados: ${results.imported}`);
    console.log(`   🔄 Actualizados: ${results.updated}`);
    console.log(`   ⏭️ Saltados: ${results.skipped}`);
    console.log(`   ❌ Errores: ${results.errors}`);

    if (results.errors > 0) {
      console.log('\n🚨 Detalles de errores:');
      results.errorDetails.forEach(detail => {
        console.log(`   • ${detail.template}: ${detail.error}`);
      });
    }

    if (options.dryRun) {
      console.log('\n🔍 MODO DRY-RUN: No se realizaron cambios reales');
    }

    console.log('\n✅ Importación completada');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión si no es dry-run
    if (!options.dryRun && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Conexión cerrada');
    }
    process.exit(0);
  }
}

// Ejecutar script si se llama directamente
if (require.main === module) {
  const options = parseArguments();
  importBannerTemplates(options).catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { importBannerTemplates };