/**
 * Script de Migración de Formatos de Banner
 * 
 * Este script actualiza banners con formato viejo al nuevo formato:
 * - Limpia estilos anidados incorrectamente
 * - Elimina propiedades obsoletas de posición
 * - Actualiza configuración de contenedores
 * - Limpia propiedades de imagen obsoletas
 * - Corrige estructura de layout
 * 
 * Uso: node scripts/migrateBannerFormats.js
 */

// Cargar variables de entorno
require('dotenv').config();

const mongoose = require('mongoose');
const BannerTemplate = require('../src/models/BannerTemplate');

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

// Función para limpiar estilos anidados
const cleanNestedStyles = (styleObj) => {
  if (!styleObj || typeof styleObj !== 'object') return styleObj;
  
  const cleaned = { ...styleObj };
  
  // Eliminar anidamientos incorrectos (desktop.desktop, tablet.tablet, mobile.mobile)
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    if (cleaned[device] && cleaned[device][device]) {
      console.log(`🧹 Limpiando anidamiento ${device}.${device}`);
      // Mezclar propiedades del nivel anidado al nivel correcto
      cleaned[device] = {
        ...cleaned[device],
        ...cleaned[device][device]
      };
      delete cleaned[device][device];
    }
  });
  
  return cleaned;
};

// Función para limpiar posiciones obsoletas
const cleanObsoletePositionProps = (positionObj) => {
  if (!positionObj || typeof positionObj !== 'object') return positionObj;
  
  const cleaned = { ...positionObj };
  
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    if (cleaned[device]) {
      const devicePos = { ...cleaned[device] };
      
      // Eliminar propiedades obsoletas
      const obsoleteProps = [
        'alignment', 'offsetX', 'offsetY', 'transformX', 'transformY', 
        'percentX', 'percentY', 'position'
      ];
      
      let hasObsoleteProps = false;
      obsoleteProps.forEach(prop => {
        if (devicePos.hasOwnProperty(prop)) {
          delete devicePos[prop];
          hasObsoleteProps = true;
        }
      });
      
      if (hasObsoleteProps) {
        console.log(`🧹 Limpiando propiedades obsoletas de posición en ${device}`);
      }
      
      // Asegurar que top y left están en formato de porcentaje
      if (devicePos.top && !devicePos.top.includes('%')) {
        devicePos.top = parseFloat(devicePos.top) + '%';
      }
      if (devicePos.left && !devicePos.left.includes('%')) {
        devicePos.left = parseFloat(devicePos.left) + '%';
      }
      
      cleaned[device] = devicePos;
    }
  });
  
  return cleaned;
};

// Función para limpiar propiedades de imagen obsoletas
const cleanImageSettings = (styleObj) => {
  if (!styleObj || typeof styleObj !== 'object') return styleObj;
  
  const cleaned = { ...styleObj };
  
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    if (cleaned[device] && cleaned[device]._imageSettings) {
      console.log(`🧹 Limpiando _imageSettings obsoletas en ${device}`);
      
      const imageSettings = cleaned[device]._imageSettings;
      
      // Mantener solo las propiedades esenciales en el estilo principal
      if (imageSettings.objectFit && !cleaned[device].objectFit) {
        cleaned[device].objectFit = imageSettings.objectFit;
      }
      
      // Eliminar _imageSettings obsoletas
      delete cleaned[device]._imageSettings;
    }
  });
  
  return cleaned;
};

// Función para actualizar configuración de contenedores
const updateContainerConfig = (component) => {
  if (component.type !== 'container') return component;
  
  const updated = { ...component };
  
  // Si tiene displayMode en el nivel raíz, moverlo a containerConfig
  if (updated.displayMode && !updated.containerConfig) {
    console.log(`🔧 Moviendo displayMode a containerConfig para ${updated.id}`);
    
    updated.containerConfig = {
      desktop: {
        displayMode: updated.displayMode,
        allowDrops: true,
        nestingLevel: 0,
        maxChildren: 50,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        gap: '10px',
        flexWrap: 'nowrap',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'auto',
        gridAutoFlow: 'row',
        justifyItems: 'start'
      },
      tablet: {
        displayMode: updated.displayMode,
        allowDrops: true,
        nestingLevel: 0,
        maxChildren: 50,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        gap: '8px',
        flexWrap: 'nowrap',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'auto',
        gridAutoFlow: 'row',
        justifyItems: 'start'
      },
      mobile: {
        displayMode: updated.displayMode,
        allowDrops: true,
        nestingLevel: 0,
        maxChildren: 50,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        gap: '6px',
        flexWrap: 'nowrap',
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto',
        gridAutoFlow: 'row',
        justifyItems: 'start'
      }
    };
    
    delete updated.displayMode;
  }
  
  return updated;
};

// Función para limpiar propiedades de layout obsoletas
const cleanLayoutProps = (layout) => {
  if (!layout || typeof layout !== 'object') return layout;
  
  const cleaned = { ...layout };
  
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    if (cleaned[device]) {
      const deviceLayout = { ...cleaned[device] };
      
      // Eliminar propiedades obsoletas
      const obsoleteProps = ['data-height', 'min-height'];
      let hasObsoleteProps = false;
      
      obsoleteProps.forEach(prop => {
        if (deviceLayout.hasOwnProperty(prop)) {
          delete deviceLayout[prop];
          hasObsoleteProps = true;
        }
      });
      
      if (hasObsoleteProps) {
        console.log(`🧹 Limpiando propiedades obsoletas de layout en ${device}`);
      }
      
      cleaned[device] = deviceLayout;
    }
  });
  
  return cleaned;
};

// Función para migrar un componente
const migrateComponent = (component) => {
  let migrated = { ...component };
  
  // Limpiar estilos anidados
  if (migrated.style) {
    migrated.style = cleanNestedStyles(migrated.style);
  }
  
  // Limpiar posiciones obsoletas
  if (migrated.position) {
    migrated.position = cleanObsoletePositionProps(migrated.position);
  }
  
  // Limpiar configuraciones de imagen obsoletas
  if (migrated.type === 'image' && migrated.style) {
    migrated.style = cleanImageSettings(migrated.style);
    
    // Eliminar _imageSettings del nivel raíz si existe
    if (migrated._imageSettings) {
      console.log(`🧹 Eliminando _imageSettings del nivel raíz para ${migrated.id}`);
      delete migrated._imageSettings;
    }
  }
  
  // Actualizar configuración de contenedores
  if (migrated.type === 'container') {
    migrated = updateContainerConfig(migrated);
  }
  
  // Migrar componentes hijos recursivamente
  if (migrated.children && Array.isArray(migrated.children)) {
    migrated.children = migrated.children.map(child => {
      if (typeof child === 'string') {
        return child; // ID de referencia, no migrar
      }
      return migrateComponent(child);
    });
  }
  
  return migrated;
};

// Función para migrar un banner completo
const migrateBanner = (banner) => {
  console.log(`🚀 Migrando banner: ${banner.name} (${banner._id})`);
  
  const migrated = { ...banner };
  
  // Limpiar layout
  if (migrated.layout) {
    migrated.layout = cleanLayoutProps(migrated.layout);
  }
  
  // Migrar componentes
  if (migrated.components && Array.isArray(migrated.components)) {
    migrated.components = migrated.components.map(component => migrateComponent(component));
  }
  
  // Actualizar versión de metadata
  if (migrated.metadata) {
    migrated.metadata.version = (migrated.metadata.version || 20) + 1;
    migrated.metadata.lastMigration = new Date();
    migrated.metadata.migrationReason = 'Formato actualizado a nueva estructura';
  }
  
  return migrated;
};

// Función principal de migración
const migrateBanners = async () => {
  try {
    console.log('🔍 Buscando banners con formato viejo...');
    
    // Buscar banners que podrían tener formato viejo
    const bannersToMigrate = await BannerTemplate.find({
      $or: [
        // Banners con estilos anidados
        { 'components.style.desktop.desktop': { $exists: true } },
        { 'components.style.tablet.tablet': { $exists: true } },
        { 'components.style.mobile.mobile': { $exists: true } },
        
        // Banners con propiedades obsoletas de posición
        { 'components.position.desktop.alignment': { $exists: true } },
        { 'components.position.desktop.offsetX': { $exists: true } },
        { 'components.position.desktop.percentX': { $exists: true } },
        
        // Banners con displayMode en nivel raíz
        { 'components.displayMode': { $exists: true } },
        
        // Banners con _imageSettings obsoletas
        { 'components._imageSettings': { $exists: true } },
        { 'components.style.desktop._imageSettings': { $exists: true } },
        
        // Banners con propiedades de layout obsoletas
        { 'layout.desktop.data-height': { $exists: true } },
        { 'layout.desktop.min-height': { $exists: true } }
      ]
    });
    
    console.log(`📊 Encontrados ${bannersToMigrate.length} banners para migrar`);
    
    if (bannersToMigrate.length === 0) {
      console.log('✅ No hay banners que requieran migración');
      return;
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const banner of bannersToMigrate) {
      try {
        console.log(`\n📝 Procesando: ${banner.name} (${banner._id})`);
        
        // Migrar el banner
        const migratedBanner = migrateBanner(banner.toObject());
        
        // Actualizar en la base de datos
        await BannerTemplate.findByIdAndUpdate(
          banner._id,
          migratedBanner,
          { new: true, runValidators: true }
        );
        
        migratedCount++;
        console.log(`✅ Banner ${banner.name} migrado exitosamente`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrando ${banner.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Resumen de migración:`);
    console.log(`✅ Banners migrados exitosamente: ${migratedCount}`);
    console.log(`❌ Banners con errores: ${errorCount}`);
    console.log(`📋 Total procesados: ${bannersToMigrate.length}`);
    
  } catch (error) {
    console.error('❌ Error en el proceso de migración:', error);
    throw error;
  }
};

// Función principal
const main = async () => {
  try {
    await connectDB();
    
    console.log('🚀 Iniciando migración de formatos de banner...\n');
    
    await migrateBanners();
    
    console.log('\n🎉 Migración completada exitosamente');
    
  } catch (error) {
    console.error('💥 Error en la migración:', error);
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

module.exports = {
  migrateBanners,
  migrateBanner,
  migrateComponent,
  cleanNestedStyles,
  cleanObsoletePositionProps,
  cleanImageSettings,
  updateContainerConfig,
  cleanLayoutProps
};