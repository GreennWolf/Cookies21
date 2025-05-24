// Test para verificar el guardado de configuraciones de contenedor
const componentProcessor = require('./server/src/services/componentProcessor.service.js');

// Datos de prueba que simula un contenedor con configuración flex desde el frontend
const frontendContainerData = {
  name: 'Test Banner with Container Config',
  components: [
    {
      id: 'flex-container',
      type: 'container',
      position: {
        desktop: { top: '10%', left: '10%' },
        tablet: { top: '15%', left: '5%' },
        mobile: { top: '20%', left: '0%' }
      },
      containerConfig: {
        desktop: {
          displayMode: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'nowrap',
          allowDrops: true,
          maxChildren: 10
        },
        tablet: {
          displayMode: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          gap: '12px',
          flexWrap: 'wrap',
          allowDrops: true,
          maxChildren: 8
        },
        mobile: {
          displayMode: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          allowDrops: true,
          maxChildren: 5
        }
      },
      children: [
        {
          id: 'child-button',
          type: 'button',
          parentId: 'flex-container',
          content: { texts: { en: 'Button inside flex container' } }
        }
      ]
    },
    {
      id: 'grid-container',
      type: 'container',
      position: {
        desktop: { top: '50%', left: '10%' }
      },
      containerConfig: {
        desktop: {
          displayMode: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'auto auto',
          gridGap: '10px',
          gridAutoFlow: 'row',
          allowDrops: true
        }
      },
      children: []
    }
  ]
};

console.log('🧪 === PRUEBA DE GUARDADO DE CONFIGURACIÓN DE CONTENEDORES ===\n');

console.log('1️⃣ CONFIGURACIONES ORIGINALES DEL FRONTEND:');
frontendContainerData.components.forEach(comp => {
  if (comp.type === 'container') {
    console.log(`📦 ${comp.id} (${comp.containerConfig.desktop.displayMode}):`);
    console.log('   Desktop:', JSON.stringify(comp.containerConfig.desktop, null, 2));
    if (comp.containerConfig.tablet) {
      console.log('   Tablet:', JSON.stringify(comp.containerConfig.tablet, null, 2));
    }
    if (comp.containerConfig.mobile) {
      console.log('   Mobile:', JSON.stringify(comp.containerConfig.mobile, null, 2));
    }
  }
});

console.log('\n2️⃣ PROCESAMIENTO DE COMPONENTES:');
const processedComponents = componentProcessor.processComponents(frontendContainerData.components);

console.log('📝 Después del procesamiento:');
processedComponents.forEach(comp => {
  if (comp.type === 'container') {
    console.log(`📦 ${comp.id} (${comp.containerConfig.desktop.displayMode}):`);
    console.log('   Desktop:', JSON.stringify(comp.containerConfig.desktop, null, 2));
    if (comp.containerConfig.tablet) {
      console.log('   Tablet:', JSON.stringify(comp.containerConfig.tablet, null, 2));
    }
    if (comp.containerConfig.mobile) {
      console.log('   Mobile:', JSON.stringify(comp.containerConfig.mobile, null, 2));
    }
  }
});

console.log('\n3️⃣ COMPARACIÓN DE CONFIGURACIONES:');

// Comparar flex container
const originalFlex = frontendContainerData.components.find(c => c.id === 'flex-container');
const processedFlex = processedComponents.find(c => c.id === 'flex-container');

console.log('\n🔄 FLEX CONTAINER:');
console.log('Desktop flex config preserved:');

const desktopConfigPreserved = [
  'displayMode', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'flexWrap'
].every(prop => {
  const original = originalFlex.containerConfig.desktop[prop];
  const processed = processedFlex.containerConfig.desktop[prop];
  const preserved = original === processed;
  console.log(`  ${prop}: ${original} -> ${processed} ${preserved ? '✅' : '❌'}`);
  return preserved;
});

console.log(`📊 Desktop config: ${desktopConfigPreserved ? '✅ PRESERVED' : '❌ MODIFIED'}`);

// Verificar que se agregaron valores por defecto donde no existían
console.log('\n📋 Valores por defecto agregados:');
const desktopConfig = processedFlex.containerConfig.desktop;
console.log(`  allowDrops: ${desktopConfig.allowDrops} (should be true)`);
console.log(`  nestingLevel: ${desktopConfig.nestingLevel} (should be 0)`);
console.log(`  maxChildren: ${desktopConfig.maxChildren} (should be 10 from original)`);

// Comparar grid container
const originalGrid = frontendContainerData.components.find(c => c.id === 'grid-container');
const processedGrid = processedComponents.find(c => c.id === 'grid-container');

console.log('\n📐 GRID CONTAINER:');
const gridConfigPreserved = [
  'displayMode', 'gridTemplateColumns', 'gridTemplateRows', 'gridGap', 'gridAutoFlow'
].every(prop => {
  const original = originalGrid.containerConfig.desktop[prop];
  const processed = processedGrid.containerConfig.desktop[prop];
  const preserved = original === processed;
  console.log(`  ${prop}: ${original} -> ${processed} ${preserved ? '✅' : '❌'}`);
  return preserved;
});

console.log(`📊 Grid config: ${gridConfigPreserved ? '✅ PRESERVED' : '❌ MODIFIED'}`);

// Verificar que se crearon configuraciones para todos los dispositivos
console.log('\n📱 CONFIGURACIONES RESPONSIVAS:');
['desktop', 'tablet', 'mobile'].forEach(device => {
  const flexHasConfig = processedFlex.containerConfig[device] !== undefined;
  const gridHasConfig = processedGrid.containerConfig[device] !== undefined;
  console.log(`  ${device}: Flex ${flexHasConfig ? '✅' : '❌'}, Grid ${gridHasConfig ? '✅' : '❌'}`);
});

console.log('\n🎯 === CONCLUSIÓN ===');
const allConfigsPreserved = desktopConfigPreserved && gridConfigPreserved;
const allDevicesHaveConfig = ['desktop', 'tablet', 'mobile'].every(device => 
  processedFlex.containerConfig[device] && processedGrid.containerConfig[device]
);

if (allConfigsPreserved && allDevicesHaveConfig) {
  console.log('✅ SUCCESS: Todas las configuraciones de contenedor se guardaron correctamente');
  console.log('   - Configuraciones originales preservadas');
  console.log('   - Valores por defecto agregados apropiadamente');
  console.log('   - Configuraciones responsivas completas');
} else {
  console.log('❌ PROBLEM: Hay problemas con el guardado de configuraciones');
  if (!allConfigsPreserved) console.log('   - Algunas configuraciones se perdieron o modificaron');
  if (!allDevicesHaveConfig) console.log('   - Falta configuración para algunos dispositivos');
}