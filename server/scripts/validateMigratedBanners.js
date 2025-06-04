/**
 * Script de Validación Post-Migración
 * 
 * Este script valida que los banners migrados sean compatibles con:
 * - Sistema de validación de contenedores múltiples
 * - Nuevo formato de posiciones y estilos
 * - Estructura de containerConfig
 * 
 * Uso: node scripts/validateMigratedBanners.js
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

// Función para validar estructura de contenedores múltiples
const validateMultipleContainers = (components, deviceView = 'desktop') => {
  const containers = components.filter(comp => comp.type === 'container' && !comp.parentId);
  
  if (containers.length <= 1) {
    return { isValid: true, message: 'No hay múltiples contenedores' };
  }

  let totalWidthUsed = 0;
  const issues = [];
  
  // Ordenar contenedores por posición left
  const sortedContainers = containers
    .map(container => {
      const position = container.position?.[deviceView] || {};
      const style = container.style?.[deviceView] || {};
      const leftValue = parseFloat(position.left) || 0;
      return { container, leftValue, position, style };
    })
    .sort((a, b) => a.leftValue - b.leftValue);
  
  sortedContainers.forEach(({ container, leftValue, position, style }, index) => {
    // Obtener ancho del contenedor
    let containerWidth = 100; // Default 100% si no está definido
    if (style.width) {
      if (typeof style.width === 'string' && style.width.includes('%')) {
        containerWidth = parseFloat(style.width);
      } else {
        // Convertir píxeles a porcentaje (asumiendo banner de 400px como base)
        const pixelWidth = parseFloat(style.width);
        containerWidth = (pixelWidth / 400) * 100;
      }
    }
    
    totalWidthUsed += containerWidth;
    
    // Verificar solapamientos
    const nextContainer = sortedContainers[index + 1];
    if (nextContainer) {
      const currentRight = leftValue + containerWidth;
      const nextLeft = nextContainer.leftValue;
      
      if (currentRight > nextLeft) {
        issues.push(`Solapamiento: ${container.id} (${leftValue}%-${currentRight}%) con ${nextContainer.container.id} (${nextLeft}%)`);
      }
    }
    
    // Verificar si excede límites
    if (leftValue + containerWidth > 100) {
      issues.push(`Excede límites: ${container.id} se extiende hasta ${leftValue + containerWidth}%`);
    }
  });
  
  return {
    isValid: issues.length === 0 && totalWidthUsed <= 120, // 120% permite cierta tolerancia
    totalWidthUsed,
    issues,
    containerCount: containers.length
  };
};

// Función para validar estructura de posiciones
const validatePositionStructure = (component) => {
  const issues = [];
  
  if (!component.position) {
    issues.push(`${component.id}: Falta estructura de position`);
    return issues;
  }
  
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    const pos = component.position[device];
    if (!pos) {
      issues.push(`${component.id}: Falta position.${device}`);
      return;
    }
    
    // Verificar propiedades requeridas
    if (!pos.hasOwnProperty('top') || !pos.hasOwnProperty('left')) {
      issues.push(`${component.id}.position.${device}: Faltan propiedades top/left`);
    }
    
    // Verificar formato de porcentajes
    if (pos.top && !pos.top.toString().includes('%') && !pos.top.toString().includes('px')) {
      issues.push(`${component.id}.position.${device}.top: Formato inválido (${pos.top})`);
    }
    
    if (pos.left && !pos.left.toString().includes('%') && !pos.left.toString().includes('px')) {
      issues.push(`${component.id}.position.${device}.left: Formato inválido (${pos.left})`);
    }
    
    // Verificar que no tenga propiedades obsoletas
    const obsoleteProps = ['alignment', 'offsetX', 'offsetY', 'transformX', 'transformY', 'percentX', 'percentY'];
    const foundObsolete = obsoleteProps.filter(prop => pos.hasOwnProperty(prop));
    if (foundObsolete.length > 0) {
      issues.push(`${component.id}.position.${device}: Propiedades obsoletas encontradas: ${foundObsolete.join(', ')}`);
    }
  });
  
  return issues;
};

// Función para validar estructura de estilos
const validateStyleStructure = (component) => {
  const issues = [];
  
  if (!component.style) {
    return issues; // Los estilos son opcionales
  }
  
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    const style = component.style[device];
    if (!style) return;
    
    // Verificar que no tenga anidamientos incorrectos
    if (style[device]) {
      issues.push(`${component.id}.style.${device}: Anidamiento incorrecto detectado (${device}.${device})`);
    }
    
    // Verificar propiedades de imagen obsoletas
    if (component.type === 'image' && style._imageSettings) {
      issues.push(`${component.id}.style.${device}: _imageSettings obsoletas encontradas`);
    }
  });
  
  return issues;
};

// Función para validar configuración de contenedores
const validateContainerConfig = (component) => {
  const issues = [];
  
  if (component.type !== 'container') return issues;
  
  // Verificar que tenga containerConfig
  if (!component.containerConfig) {
    issues.push(`${component.id}: Contenedor sin containerConfig`);
    return issues;
  }
  
  // Verificar que no tenga displayMode en nivel raíz
  if (component.displayMode) {
    issues.push(`${component.id}: displayMode en nivel raíz (debería estar en containerConfig)`);
  }
  
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    const config = component.containerConfig[device];
    if (!config) {
      issues.push(`${component.id}: Falta containerConfig.${device}`);
      return;
    }
    
    // Verificar propiedades requeridas
    const requiredProps = ['displayMode', 'allowDrops'];
    const missingProps = requiredProps.filter(prop => !config.hasOwnProperty(prop));
    if (missingProps.length > 0) {
      issues.push(`${component.id}.containerConfig.${device}: Faltan propiedades: ${missingProps.join(', ')}`);
    }
    
    // Verificar displayMode válido
    if (config.displayMode && !['flex', 'grid', 'libre'].includes(config.displayMode)) {
      issues.push(`${component.id}.containerConfig.${device}: displayMode inválido (${config.displayMode})`);
    }
  });
  
  return issues;
};

// Función para validar un banner completo
const validateBanner = (banner) => {
  const validation = {
    id: banner._id,
    name: banner.name,
    isValid: true,
    issues: [],
    warnings: [],
    containerValidation: null
  };
  
  if (!banner.components || !Array.isArray(banner.components)) {
    validation.issues.push('Banner sin componentes o estructura inválida');
    validation.isValid = false;
    return validation;
  }
  
  // Validar cada componente
  banner.components.forEach(component => {
    // Validar estructura de posiciones
    const positionIssues = validatePositionStructure(component);
    validation.issues.push(...positionIssues);
    
    // Validar estructura de estilos
    const styleIssues = validateStyleStructure(component);
    validation.issues.push(...styleIssues);
    
    // Validar configuración de contenedores
    const containerIssues = validateContainerConfig(component);
    validation.issues.push(...containerIssues);
    
    // Validar componentes hijos recursivamente
    if (component.children && Array.isArray(component.children)) {
      component.children.forEach(child => {
        if (typeof child === 'object') {
          const childPositionIssues = validatePositionStructure(child);
          validation.issues.push(...childPositionIssues);
          
          const childStyleIssues = validateStyleStructure(child);
          validation.issues.push(...childStyleIssues);
        }
      });
    }
  });
  
  // Validar contenedores múltiples para cada dispositivo
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    const containerValidation = validateMultipleContainers(banner.components, device);
    
    if (!containerValidation.isValid) {
      validation.warnings.push(`${device}: ${containerValidation.issues.join(', ')}`);
      
      if (!validation.containerValidation) {
        validation.containerValidation = {};
      }
      validation.containerValidation[device] = containerValidation;
    }
  });
  
  validation.isValid = validation.issues.length === 0;
  
  return validation;
};

// Función principal de validación
const validateMigratedBanners = async () => {
  try {
    console.log('🔍 Validando banners migrados...\n');
    
    // Buscar todos los banners (especialmente los migrados recientemente)
    const banners = await BannerTemplate.find({
      'metadata.lastMigration': { $exists: true }
    }).sort({ 'metadata.lastMigration': -1 });
    
    console.log(`📊 Encontrados ${banners.length} banners migrados para validar\n`);
    
    if (banners.length === 0) {
      console.log('ℹ️ No hay banners migrados para validar. Validando todos los banners...');
      
      const allBanners = await BannerTemplate.find({}).limit(10);
      console.log(`📊 Validando ${allBanners.length} banners de muestra\n`);
      
      for (const banner of allBanners) {
        const validation = validateBanner(banner);
        console.log(`📋 ${banner.name} (${banner._id})`);
        
        if (validation.isValid) {
          console.log('✅ VÁLIDO');
        } else {
          console.log('❌ INVÁLIDO:');
          validation.issues.forEach(issue => console.log(`  - ${issue}`));
        }
        
        if (validation.warnings.length > 0) {
          console.log('⚠️ ADVERTENCIAS:');
          validation.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        console.log('');
      }
      
      return;
    }
    
    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;
    
    for (const banner of banners) {
      console.log(`📋 Validando: ${banner.name} (${banner._id})`);
      console.log(`📅 Migrado: ${banner.metadata.lastMigration}`);
      
      const validation = validateBanner(banner);
      
      if (validation.isValid) {
        validCount++;
        console.log('✅ VÁLIDO');
      } else {
        invalidCount++;
        console.log('❌ INVÁLIDO:');
        validation.issues.forEach(issue => console.log(`  ❌ ${issue}`));
      }
      
      if (validation.warnings.length > 0) {
        warningCount++;
        console.log('⚠️ ADVERTENCIAS:');
        validation.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
      }
      
      // Mostrar información de contenedores múltiples si existe
      if (validation.containerValidation) {
        Object.entries(validation.containerValidation).forEach(([device, containerVal]) => {
          if (containerVal.containerCount > 1) {
            console.log(`  📦 ${device}: ${containerVal.containerCount} contenedores, ${containerVal.totalWidthUsed.toFixed(1)}% usado`);
          }
        });
      }
      
      console.log('');
    }
    
    console.log(`📊 Resumen de validación:`);
    console.log(`✅ Banners válidos: ${validCount}`);
    console.log(`❌ Banners inválidos: ${invalidCount}`);
    console.log(`⚠️ Banners con advertencias: ${warningCount}`);
    console.log(`📋 Total validados: ${banners.length}`);
    
    if (invalidCount > 0) {
      console.log(`\n🔧 Los banners inválidos requieren corrección manual o re-migración`);
    }
    
  } catch (error) {
    console.error('❌ Error en la validación:', error);
    throw error;
  }
};

// Función principal
const main = async () => {
  try {
    await connectDB();
    
    console.log('🧪 Iniciando validación de banners migrados...\n');
    
    await validateMigratedBanners();
    
    console.log('\n🎉 Validación completada');
    
  } catch (error) {
    console.error('💥 Error en la validación:', error);
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
  validateMigratedBanners, 
  validateBanner, 
  validateMultipleContainers,
  validatePositionStructure,
  validateStyleStructure,
  validateContainerConfig
};