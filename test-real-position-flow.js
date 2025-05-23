// Test para simular el flujo completo de posiciones desde frontend hasta backend
const path = require('path');

// Cargar los servicios reales del backend
const componentProcessor = require('./server/src/services/componentProcessor.service.js');
const bannerValidator = require('./server/src/utils/bannerValidator.js');

// Simular datos que vienen del frontend después de mover un componente
const frontendData = {
  name: 'Test Banner',
  components: [
    {
      id: 'button-accept',
      type: 'button',
      content: { texts: { en: 'Accept All' } },
      action: { type: 'accept_all' },
      position: {
        desktop: { top: '25.5%', left: '67.8%' },
        tablet: { top: '30%', left: '45%' },
        mobile: { top: '35%', left: '40%' }
      },
      style: {
        desktop: { backgroundColor: '#4CAF50', padding: '8px 16px' },
        tablet: { backgroundColor: '#4CAF50', padding: '6px 12px' },
        mobile: { backgroundColor: '#4CAF50', padding: '4px 8px' }
      }
    },
    {
      id: 'container-main',
      type: 'container',
      position: {
        desktop: { top: '10%', left: '10%' },
        tablet: { top: '15%', left: '5%' },
        mobile: { top: '20%', left: '0%' }
      },
      containerConfig: {
        desktop: { displayMode: 'flex', allowDrops: true },
        tablet: { displayMode: 'flex', allowDrops: true },
        mobile: { displayMode: 'flex', allowDrops: true }
      },
      children: [
        {
          id: 'child-text',
          type: 'text',
          parentId: 'container-main',
          content: { texts: { en: 'This is inside container' } },
          position: {
            desktop: { top: '5%', left: '10%' },
            tablet: { top: '5%', left: '10%' },
            mobile: { top: '5%', left: '10%' }
          }
        }
      ]
    }
  ]
};

console.log('🧪 === FLUJO COMPLETO DE POSICIONES ===\n');

console.log('1️⃣ DATOS ORIGINALES DEL FRONTEND:');
frontendData.components.forEach(comp => {
  console.log(`📍 ${comp.id}:`);
  console.log(`   Desktop: top=${comp.position.desktop.top}, left=${comp.position.desktop.left}`);
  if (comp.children) {
    comp.children.forEach(child => {
      console.log(`   📍 ${child.id} (hijo):`);
      console.log(`      Desktop: top=${child.position.desktop.top}, left=${child.position.desktop.left}`);
    });
  }
});

console.log('\n2️⃣ PASO 1: bannerValidator.normalizePositions()');
const normalizedComponents = bannerValidator.normalizePositions(frontendData.components);
console.log('📝 Después de normalizePositions:');
normalizedComponents.forEach(comp => {
  console.log(`📍 ${comp.id}:`);
  console.log(`   Desktop: top=${comp.position.desktop.top}, left=${comp.position.desktop.left}`);
  if (comp.children) {
    comp.children.forEach(child => {
      console.log(`   📍 ${child.id} (hijo):`);
      console.log(`      Desktop: top=${child.position.desktop.top}, left=${child.position.desktop.left}`);
    });
  }
});

console.log('\n3️⃣ PASO 2: componentProcessor.validateBannerStructure()');
const validationResult = componentProcessor.validateBannerStructure({
  ...frontendData,
  components: normalizedComponents
});
console.log(`✅ Validación: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
if (!validationResult.isValid) {
  console.log('❌ Errores:', validationResult.errors);
}

console.log('\n4️⃣ PASO 3: componentProcessor.processComponents()');
const processedComponents = componentProcessor.processComponents(normalizedComponents);
console.log('📝 Después de processComponents:');
processedComponents.forEach(comp => {
  console.log(`📍 ${comp.id}:`);
  console.log(`   Desktop: top=${comp.position.desktop.top}, left=${comp.position.desktop.left}`);
  if (comp.position.desktop.transformX) {
    console.log(`   Transform: transformX=${comp.position.desktop.transformX}`);
  }
  if (comp.children) {
    comp.children.forEach(child => {
      console.log(`   📍 ${child.id} (hijo):`);
      console.log(`      Desktop: top=${child.position.desktop.top}, left=${child.position.desktop.left}`);
      if (child.position.desktop.transformX) {
        console.log(`      Transform: transformX=${child.position.desktop.transformX}`);
      }
    });
  }
});

console.log('\n5️⃣ COMPARACIÓN FINAL:');
console.log('📊 Resumen de cambios:');

// Comparar posiciones originales vs finales
const originalButton = frontendData.components.find(c => c.id === 'button-accept');
const finalButton = processedComponents.find(c => c.id === 'button-accept');

console.log(`\n🔲 ${originalButton.id}:`);
console.log(`   Original: top=${originalButton.position.desktop.top}, left=${originalButton.position.desktop.left}`);
console.log(`   Final:    top=${finalButton.position.desktop.top}, left=${finalButton.position.desktop.left}`);

if (originalButton.position.desktop.top === finalButton.position.desktop.top && 
    originalButton.position.desktop.left === finalButton.position.desktop.left) {
  console.log('   ✅ POSICIONES MANTENIDAS CORRECTAMENTE');
} else {
  console.log('   ❌ POSICIONES MODIFICADAS INCORRECTAMENTE');
}

const originalContainer = frontendData.components.find(c => c.id === 'container-main');
const finalContainer = processedComponents.find(c => c.id === 'container-main');

console.log(`\n📦 ${originalContainer.id}:`);
console.log(`   Original: top=${originalContainer.position.desktop.top}, left=${originalContainer.position.desktop.left}`);
console.log(`   Final:    top=${finalContainer.position.desktop.top}, left=${finalContainer.position.desktop.left}`);

if (originalContainer.position.desktop.top === finalContainer.position.desktop.top && 
    originalContainer.position.desktop.left === finalContainer.position.desktop.left) {
  console.log('   ✅ POSICIONES MANTENIDAS CORRECTAMENTE');
} else {
  console.log('   ❌ POSICIONES MODIFICADAS INCORRECTAMENTE');
}

// Verificar hijo
const originalChild = originalContainer.children[0];
const finalChild = finalContainer.children[0];

console.log(`\n👶 ${originalChild.id} (componente hijo):`);
console.log(`   Original: top=${originalChild.position.desktop.top}, left=${originalChild.position.desktop.left}`);
console.log(`   Final:    top=${finalChild.position.desktop.top}, left=${finalChild.position.desktop.left}`);

if (originalChild.position.desktop.top === finalChild.position.desktop.top && 
    originalChild.position.desktop.left === finalChild.position.desktop.left) {
  console.log('   ✅ POSICIONES MANTENIDAS CORRECTAMENTE');
} else {
  console.log('   ❌ POSICIONES MODIFICADAS INCORRECTAMENTE');
}

console.log('\n🎯 === CONCLUSIÓN ===');
const allPositionsKept = 
  originalButton.position.desktop.top === finalButton.position.desktop.top &&
  originalButton.position.desktop.left === finalButton.position.desktop.left &&
  originalContainer.position.desktop.top === finalContainer.position.desktop.top &&
  originalContainer.position.desktop.left === finalContainer.position.desktop.left &&
  originalChild.position.desktop.top === finalChild.position.desktop.top &&
  originalChild.position.desktop.left === finalChild.position.desktop.left;

if (allPositionsKept) {
  console.log('✅ SUCCESS: Todas las posiciones se mantuvieron correctas durante el procesamiento');
} else {
  console.log('❌ PROBLEM: Algunas posiciones se modificaron durante el procesamiento');
  console.log('🔧 Investigar más a fondo el procesamiento de componentes');
}