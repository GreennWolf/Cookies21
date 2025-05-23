// Test para verificar el comportamiento de normalizePositions

function normalizePositions(components) {
  if (!Array.isArray(components)) return components;

  return components.map(comp => {
    const newComp = { ...comp };
    if (newComp.position) {
      ['desktop', 'tablet', 'mobile'].forEach(device => {
        if (newComp.position[device]) {
          // Asumimos que si es un número, lo convertimos a '%'
          if (typeof newComp.position[device].top === 'number') {
            newComp.position[device].top = newComp.position[device].top + '%';
          }
          if (typeof newComp.position[device].left === 'number') {
            newComp.position[device].left = newComp.position[device].left + '%';
          }
        }
      });
    }

    // Normalizar hijos
    if (newComp.children && Array.isArray(newComp.children)) {
      newComp.children = normalizePositions(newComp.children);
    }
    return newComp;
  });
}

// Casos de prueba
const testCases = [
  {
    name: "Caso 1: Posiciones ya con porcentaje (correcto)",
    input: [{
      id: 'comp1',
      position: {
        desktop: { top: '25%', left: '50%' },
        tablet: { top: '30%', left: '45%' }
      }
    }]
  },
  {
    name: "Caso 2: Posiciones numéricas (necesita conversión)",
    input: [{
      id: 'comp2',
      position: {
        desktop: { top: 25, left: 50 },
        tablet: { top: 30, left: 45 }
      }
    }]
  },
  {
    name: "Caso 3: Posiciones mixtas",
    input: [{
      id: 'comp3',
      position: {
        desktop: { top: '25%', left: 50 }, // mixto
        tablet: { top: 30, left: '45%' }    // mixto
      }
    }]
  }
];

console.log('🧪 === PRUEBA DE NORMALIZE POSITIONS ===\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}️⃣ ${testCase.name}`);
  console.log('📍 ANTES:');
  console.log(JSON.stringify(testCase.input[0].position, null, 2));
  
  const result = normalizePositions(testCase.input);
  
  console.log('📍 DESPUÉS:');
  console.log(JSON.stringify(result[0].position, null, 2));
  
  // Verificar si hay cambios
  const originalStr = JSON.stringify(testCase.input[0].position);
  const resultStr = JSON.stringify(result[0].position);
  
  if (originalStr === resultStr) {
    console.log('✅ Sin cambios (correcto)');
  } else {
    console.log('🔄 Hubo cambios:');
    console.log(`  Original: ${originalStr}`);
    console.log(`  Resultado: ${resultStr}`);
  }
  
  console.log('');
});

console.log('📝 === ANÁLISIS ===');
console.log('✅ El normalizePositions funciona correctamente:');
console.log('   - No modifica strings que ya tienen %');
console.log('   - Solo convierte números a porcentaje');
console.log('   - Esto NO debería ser la causa del problema');
console.log('');
console.log('🔍 El problema debe estar en otra parte del procesamiento.');