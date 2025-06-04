/**
 * Script de Prueba de Migración de Banners
 * 
 * Este script prueba la migración sin modificar la base de datos,
 * mostrando qué cambios se harían en cada banner.
 * 
 * Uso: node scripts/testMigration.js
 */

// Cargar variables de entorno
require('dotenv').config();

const mongoose = require('mongoose');
const BannerTemplate = require('../src/models/BannerTemplate');
const { 
  migrateBanner, 
  migrateComponent,
  cleanNestedStyles,
  cleanObsoletePositionProps,
  cleanImageSettings,
  updateContainerConfig,
  cleanLayoutProps
} = require('./migrateBannerFormats');

// Configurar conexión a MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21';
    console.log('🔌 Conectando a MongoDB...');
    console.log('📍 URI:', mongoUri.replace(/\/\/.*:.*@/, '//***:***@')); // Ocultar credenciales en log
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout después de 5s en lugar de 30s
      socketTimeoutMS: 45000, // Cerrar sockets después de 45s de inactividad
    });
    
    console.log('✅ Conectado a MongoDB exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    console.error('💡 Verifica que:');
    console.error('   - MongoDB está ejecutándose');
    console.error('   - Las credenciales son correctas');
    console.error('   - El archivo .env está en la carpeta server/');
    process.exit(1);
  }
};

// Función para comparar objetos y mostrar diferencias
const showDifferences = (original, migrated, path = '') => {
  const differences = [];
  
  const compare = (obj1, obj2, currentPath) => {
    const keys1 = Object.keys(obj1 || {});
    const keys2 = Object.keys(obj2 || {});
    const allKeys = new Set([...keys1, ...keys2]);
    
    for (const key of allKeys) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (!(key in obj1)) {
        differences.push(`➕ Agregado: ${newPath} = ${JSON.stringify(obj2[key])}`);
      } else if (!(key in obj2)) {
        differences.push(`➖ Eliminado: ${newPath} = ${JSON.stringify(obj1[key])}`);
      } else if (typeof obj1[key] !== typeof obj2[key]) {
        differences.push(`🔄 Cambiado tipo: ${newPath} (${typeof obj1[key]} → ${typeof obj2[key]})`);
      } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
        compare(obj1[key], obj2[key], newPath);
      } else if (obj1[key] !== obj2[key]) {
        differences.push(`🔄 Cambiado: ${newPath} (${obj1[key]} → ${obj2[key]})`);
      }
    }
  };
  
  compare(original, migrated, path);
  return differences;
};

// Función para analizar un banner específico
const analyzeBanner = (banner) => {
  const analysis = {
    id: banner._id,
    name: banner.name,
    issues: {
      nestedStyles: [],
      obsoletePositions: [],
      obsoleteImageSettings: [],
      containerConfig: [],
      layoutProps: []
    },
    wouldMigrate: false
  };
  
  // Verificar estilos anidados
  if (banner.components) {
    banner.components.forEach(comp => {
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        if (comp.style?.[device]?.[device]) {
          analysis.issues.nestedStyles.push(`${comp.id}.style.${device}.${device}`);
          analysis.wouldMigrate = true;
        }
      });
      
      // Verificar posiciones obsoletas
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        const pos = comp.position?.[device];
        if (pos) {
          const obsoleteProps = ['alignment', 'offsetX', 'offsetY', 'transformX', 'transformY', 'percentX', 'percentY'];
          const found = obsoleteProps.filter(prop => pos.hasOwnProperty(prop));
          if (found.length > 0) {
            analysis.issues.obsoletePositions.push(`${comp.id}.position.${device}: [${found.join(', ')}]`);
            analysis.wouldMigrate = true;
          }
        }
      });
      
      // Verificar configuraciones de imagen obsoletas
      if (comp.type === 'image') {
        if (comp._imageSettings) {
          analysis.issues.obsoleteImageSettings.push(`${comp.id}._imageSettings`);
          analysis.wouldMigrate = true;
        }
        ['desktop', 'tablet', 'mobile'].forEach(device => {
          if (comp.style?.[device]?._imageSettings) {
            analysis.issues.obsoleteImageSettings.push(`${comp.id}.style.${device}._imageSettings`);
            analysis.wouldMigrate = true;
          }
        });
      }
      
      // Verificar configuración de contenedores
      if (comp.type === 'container' && comp.displayMode && !comp.containerConfig) {
        analysis.issues.containerConfig.push(`${comp.id}.displayMode en nivel raíz`);
        analysis.wouldMigrate = true;
      }
    });
  }
  
  // Verificar propiedades de layout obsoletas
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    const layout = banner.layout?.[device];
    if (layout) {
      const obsoleteProps = ['data-height', 'min-height'];
      const found = obsoleteProps.filter(prop => layout.hasOwnProperty(prop));
      if (found.length > 0) {
        analysis.issues.layoutProps.push(`layout.${device}: [${found.join(', ')}]`);
        analysis.wouldMigrate = true;
      }
    }
  });
  
  return analysis;
};

// Función principal de prueba
const testMigration = async () => {
  try {
    console.log('🔍 Analizando banners para migración...\n');
    
    // Buscar banners que podrían tener formato viejo
    const banners = await BannerTemplate.find({
      $or: [
        { 'components.style.desktop.desktop': { $exists: true } },
        { 'components.style.tablet.tablet': { $exists: true } },
        { 'components.style.mobile.mobile': { $exists: true } },
        { 'components.position.desktop.alignment': { $exists: true } },
        { 'components.position.desktop.offsetX': { $exists: true } },
        { 'components.position.desktop.percentX': { $exists: true } },
        { 'components.displayMode': { $exists: true } },
        { 'components._imageSettings': { $exists: true } },
        { 'components.style.desktop._imageSettings': { $exists: true } },
        { 'layout.desktop.data-height': { $exists: true } },
        { 'layout.desktop.min-height': { $exists: true } }
      ]
    });
    
    console.log(`📊 Encontrados ${banners.length} banners potenciales para migrar\n`);
    
    if (banners.length === 0) {
      console.log('✅ No hay banners que requieran migración');
      return;
    }
    
    let wouldMigrateCount = 0;
    
    for (const banner of banners) {
      console.log(`\n📋 Analizando: ${banner.name} (${banner._id})`);
      console.log(`📅 Creado: ${banner.createdAt} | Actualizado: ${banner.updatedAt}`);
      
      const analysis = analyzeBanner(banner);
      
      if (analysis.wouldMigrate) {
        wouldMigrateCount++;
        console.log('🔧 REQUIERE MIGRACIÓN:');
        
        if (analysis.issues.nestedStyles.length > 0) {
          console.log('  🏗️ Estilos anidados:', analysis.issues.nestedStyles);
        }
        
        if (analysis.issues.obsoletePositions.length > 0) {
          console.log('  📍 Posiciones obsoletas:', analysis.issues.obsoletePositions);
        }
        
        if (analysis.issues.obsoleteImageSettings.length > 0) {
          console.log('  🖼️ Configuraciones de imagen obsoletas:', analysis.issues.obsoleteImageSettings);
        }
        
        if (analysis.issues.containerConfig.length > 0) {
          console.log('  📦 Configuración de contenedores:', analysis.issues.containerConfig);
        }
        
        if (analysis.issues.layoutProps.length > 0) {
          console.log('  🎨 Propiedades de layout obsoletas:', analysis.issues.layoutProps);
        }
        
        // Mostrar vista previa de la migración
        try {
          const original = banner.toObject();
          const migrated = migrateBanner(original);
          const differences = showDifferences(original, migrated);
          
          if (differences.length > 0) {
            console.log('  📝 Cambios que se harían:');
            differences.slice(0, 10).forEach(diff => {
              console.log(`    ${diff}`);
            });
            if (differences.length > 10) {
              console.log(`    ... y ${differences.length - 10} cambios más`);
            }
          }
        } catch (error) {
          console.log('  ❌ Error en vista previa de migración:', error.message);
        }
        
      } else {
        console.log('✅ No requiere migración');
      }
    }
    
    console.log(`\n📊 Resumen del análisis:`);
    console.log(`🔍 Banners analizados: ${banners.length}`);
    console.log(`🔧 Banners que requieren migración: ${wouldMigrateCount}`);
    console.log(`✅ Banners que no requieren cambios: ${banners.length - wouldMigrateCount}`);
    
    if (wouldMigrateCount > 0) {
      console.log(`\n💡 Para ejecutar la migración real, ejecuta:`);
      console.log(`   node scripts/migrateBannerFormats.js`);
    }
    
  } catch (error) {
    console.error('❌ Error en el análisis:', error);
    throw error;
  }
};

// Función principal
const main = async () => {
  try {
    await connectDB();
    
    console.log('🧪 Iniciando análisis de migración de banners...\n');
    
    await testMigration();
    
    console.log('\n🎉 Análisis completado');
    
  } catch (error) {
    console.error('💥 Error en el análisis:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Desconectado de MongoDB');
  }
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { testMigration, analyzeBanner, showDifferences };