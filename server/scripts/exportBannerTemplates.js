#!/usr/bin/env node

/**
 * Script para exportar todos los banner templates a archivos JSON
 * Se ejecuta desde: server/scripts/exportBannerTemplates.js
 * 
 * Uso:
 * cd server
 * node scripts/exportBannerTemplates.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Importar el modelo BannerTemplate
const BannerTemplate = require('../src/models/BannerTemplate');

// Configuración
const EXPORT_DIR = path.join(__dirname, '../../public/Exports');
const EXPORT_FILE = path.join(EXPORT_DIR, 'banner-templates-export.json');

async function exportBannerTemplates() {
  try {
    console.log('🚀 Iniciando exportación de banner templates...');
    
    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21');
    console.log('✅ Conectado a MongoDB');

    // Crear directorio de exportación si no existe
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
      console.log(`📁 Directorio creado: ${EXPORT_DIR}`);
    }

    // Obtener todos los banner templates
    console.log('📦 Obteniendo todos los banner templates...');
    const templates = await BannerTemplate.find({}).lean();
    console.log(`📊 Encontrados ${templates.length} templates`);

    if (templates.length === 0) {
      console.log('⚠️ No se encontraron templates para exportar');
      process.exit(0);
    }

    // Procesar templates para exportación
    const exportData = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        totalTemplates: templates.length,
        exportedBy: 'banner-templates-export-script',
        version: '1.0.0'
      },
      templates: templates.map(template => {
        // Crear una copia limpia del template
        const cleanTemplate = {
          // Datos básicos
          name: template.name,
          description: template.description,
          type: template.type, // 'system' o 'client'
          status: template.status,
          
          // Configuración del banner
          layout: template.layout,
          components: template.components,
          theme: template.theme,
          
          // Metadatos
          metadata: template.metadata,
          tags: template.tags,
          category: template.category,
          
          // Información de creación (sin IDs de usuarios)
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          
          // ID original para referencia (útil para importación)
          originalId: template._id.toString(),
          
          // Cliente (solo para templates de cliente)
          clientId: template.clientId ? template.clientId.toString() : null
        };

        return cleanTemplate;
      })
    };

    // Exportar a archivo JSON
    console.log('💾 Escribiendo archivo de exportación...');
    fs.writeFileSync(EXPORT_FILE, JSON.stringify(exportData, null, 2), 'utf8');
    
    console.log('✅ Exportación completada exitosamente');
    console.log(`📄 Archivo: ${EXPORT_FILE}`);
    console.log(`📊 Templates exportados: ${exportData.templates.length}`);
    
    // Estadísticas de exportación
    const stats = {
      total: exportData.templates.length,
      system: exportData.templates.filter(t => t.type === 'system').length,
      client: exportData.templates.filter(t => t.type === 'client').length,
      active: exportData.templates.filter(t => t.status === 'active').length,
      inactive: exportData.templates.filter(t => t.status === 'inactive').length
    };
    
    console.log('\n📈 Estadísticas de exportación:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Sistema: ${stats.system}`);
    console.log(`   Cliente: ${stats.client}`);
    console.log(`   Activos: ${stats.active}`);
    console.log(`   Inactivos: ${stats.inactive}`);

    // Crear archivo de índice para facilitar la importación
    const indexFile = path.join(EXPORT_DIR, 'export-index.json');
    const indexData = {
      lastExport: new Date().toISOString(),
      files: [
        {
          filename: 'banner-templates-export.json',
          type: 'banner-templates',
          count: exportData.templates.length,
          size: fs.statSync(EXPORT_FILE).size
        }
      ],
      stats
    };
    
    fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf8');
    console.log(`📋 Índice creado: ${indexFile}`);

  } catch (error) {
    console.error('❌ Error durante la exportación:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar script si se llama directamente
if (require.main === module) {
  exportBannerTemplates().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { exportBannerTemplates };