// Test para verificar el guardado y carga de posiciones
// Removido mongoose para simplificar la prueba

// Datos de prueba que simula lo que viene del frontend
const testComponentFromFrontend = {
  id: 'comp-1234',
  type: 'button',
  content: { texts: { en: 'Test Button' } },
  position: {
    desktop: { top: '25%', left: '50%' },
    tablet: { top: '30%', left: '45%' },
    mobile: { top: '35%', left: '40%' }
  },
  style: {
    desktop: { backgroundColor: '#4CAF50', padding: '8px 16px' },
    tablet: { backgroundColor: '#4CAF50', padding: '6px 12px' },
    mobile: { backgroundColor: '#4CAF50', padding: '4px 8px' }
  }
};

// Simular el procesamiento del componentProcessor
function simulateComponentProcessing(component) {
  console.log('🔧 ANTES del procesamiento:');
  console.log(JSON.stringify(component.position, null, 2));
  
  // Simular el procesamiento actual
  const processed = JSON.parse(JSON.stringify(component)); // Deep copy
  
  // Simular optimización de posicionamiento
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    if (processed.position && processed.position[device]) {
      const pos = processed.position[device];
      
      // Validar que las posiciones son válidas
      if (pos.top && !pos.top.endsWith('%')) {
        console.log(`⚠️ ADVERTENCIA: top no está en porcentaje: ${pos.top}`);
        // Convertir a porcentaje si es necesario
        const numValue = parseFloat(pos.top);
        if (!isNaN(numValue)) {
          pos.top = `${Math.max(0, Math.min(100, numValue))}%`;
        }
      }
      
      if (pos.left && !pos.left.endsWith('%')) {
        console.log(`⚠️ ADVERTENCIA: left no está en porcentaje: ${pos.left}`);
        const numValue = parseFloat(pos.left);
        if (!isNaN(numValue)) {
          pos.left = `${Math.max(0, Math.min(100, numValue))}%`;
        }
      }
      
      // Añadir transformaciones automáticas si está centrado
      if (pos.left === '50%' && !pos.transformX) {
        pos.transformX = 'center';
        console.log(`✅ Añadida transformX center para ${device}`);
      }
      
      if (pos.top === '50%' && !pos.transformY) {
        pos.transformY = 'center';
        console.log(`✅ Añadida transformY center para ${device}`);
      }
    }
  });
  
  console.log('🔧 DESPUÉS del procesamiento:');
  console.log(JSON.stringify(processed.position, null, 2));
  
  return processed;
}

// Simular guardado en MongoDB
function simulateMongoSave(data) {
  console.log('💾 GUARDANDO en MongoDB:');
  
  // Simular el schema de Mongoose validando los datos
  const mongoData = {
    ...data,
    position: {
      desktop: data.position?.desktop || {},
      tablet: data.position?.tablet || {},
      mobile: data.position?.mobile || {}
    }
  };
  
  console.log('📦 Datos que se guardarían:');
  console.log(JSON.stringify(mongoData.position, null, 2));
  
  return mongoData;
}

// Simular carga desde MongoDB
function simulateMongoLoad(savedData) {
  console.log('📤 CARGANDO desde MongoDB:');
  console.log(JSON.stringify(savedData.position, null, 2));
  
  return savedData;
}

// Simular generación de script
function simulateScriptGeneration(componentData) {
  console.log('🎯 GENERANDO CSS para script:');
  
  const css = [];
  
  ['desktop', 'tablet', 'mobile'].forEach(device => {
    if (componentData.position && componentData.position[device]) {
      const pos = componentData.position[device];
      let deviceCSS = '';
      
      if (device === 'desktop') {
        deviceCSS += `#${componentData.id} {\n`;
      } else {
        deviceCSS += `@media (max-width: ${device === 'tablet' ? '768px' : '480px'}) {\n  #${componentData.id} {\n`;
      }
      
      if (pos.top) deviceCSS += `    top: ${pos.top};\n`;
      if (pos.left) deviceCSS += `    left: ${pos.left};\n`;
      
      // Manejar transformaciones
      if (pos.transformX === 'center' || pos.transformY === 'center') {
        let transform = 'transform: ';
        if (pos.transformX === 'center') transform += 'translateX(-50%) ';
        if (pos.transformY === 'center') transform += 'translateY(-50%) ';
        deviceCSS += `    ${transform.trim()};\n`;
      }
      
      deviceCSS += '    position: absolute;\n';
      
      if (device === 'desktop') {
        deviceCSS += '}\n';
      } else {
        deviceCSS += '  }\n}\n';
      }
      
      css.push(deviceCSS);
    }
  });
  
  console.log('📝 CSS generado:');
  console.log(css.join('\n'));
  
  return css.join('\n');
}

// Ejecutar la prueba completa
console.log('🧪 === PRUEBA DE GUARDADO Y CARGA DE POSICIONES ===\n');

console.log('1️⃣ DATOS ORIGINALES DEL FRONTEND:');
console.log(JSON.stringify(testComponentFromFrontend.position, null, 2));

console.log('\n2️⃣ PROCESAMIENTO DE COMPONENTES:');
const processedComponent = simulateComponentProcessing(testComponentFromFrontend);

console.log('\n3️⃣ GUARDADO EN MONGODB:');
const savedData = simulateMongoSave(processedComponent);

console.log('\n4️⃣ CARGA DESDE MONGODB:');
const loadedData = simulateMongoLoad(savedData);

console.log('\n5️⃣ GENERACIÓN DE SCRIPT:');
const generatedCSS = simulateScriptGeneration(loadedData);

console.log('\n✅ === COMPARACIÓN FINAL ===');
console.log('📍 Posiciones originales:');
console.log(`Desktop: top=${testComponentFromFrontend.position.desktop.top}, left=${testComponentFromFrontend.position.desktop.left}`);
console.log('📍 Posiciones finales:');
console.log(`Desktop: top=${loadedData.position.desktop.top}, left=${loadedData.position.desktop.left}`);

// Verificar si las posiciones se mantuvieron
const originalDesktop = testComponentFromFrontend.position.desktop;
const finalDesktop = loadedData.position.desktop;

if (originalDesktop.top === finalDesktop.top && originalDesktop.left === finalDesktop.left) {
  console.log('✅ SUCCESS: Las posiciones se mantuvieron correctas');
} else {
  console.log('❌ ERROR: Las posiciones se modificaron durante el proceso');
  console.log(`  Original: top=${originalDesktop.top}, left=${originalDesktop.left}`);
  console.log(`  Final: top=${finalDesktop.top}, left=${finalDesktop.left}`);
}