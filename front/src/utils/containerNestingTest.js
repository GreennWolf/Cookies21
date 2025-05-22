/**
 * Archivo de prueba para demostrar la funcionalidad de anidamiento de contenedores
 * FASE 4 - Sistema robusto de validación
 */

import {
  validateContainerNesting,
  calculateNestingDepth,
  detectCircularReference,
  getNestingLevelIndicator,
  formatNestingErrorMessage,
  debugNestingStructure,
  MAX_NESTING_DEPTH
} from './containerValidationUtils.js';

/**
 * Estructura de prueba para demostrar el anidamiento
 */
export const createTestBannerStructure = () => {
  return [
    // Contenedor nivel 0 (raíz)
    {
      id: 'container-root',
      type: 'container',
      children: [
        // Contenedor nivel 1
        {
          id: 'container-level1-a',
          type: 'container',
          parentId: 'container-root',
          children: [
            // Contenedor nivel 2
            {
              id: 'container-level2-a',
              type: 'container',
              parentId: 'container-level1-a',
              children: [
                // Componentes nivel 3
                {
                  id: 'text-level3-a',
                  type: 'text',
                  parentId: 'container-level2-a',
                  content: 'Texto en nivel 3'
                },
                {
                  id: 'button-level3-a',
                  type: 'button',
                  parentId: 'container-level2-a',
                  content: 'Botón nivel 3'
                }
              ]
            },
            // Texto nivel 2
            {
              id: 'text-level2-a',
              type: 'text',
              parentId: 'container-level1-a',
              content: 'Texto en nivel 2'
            }
          ]
        },
        // Contenedor nivel 1 (hermano)
        {
          id: 'container-level1-b',
          type: 'container',
          parentId: 'container-root',
          children: [
            {
              id: 'image-level2-b',
              type: 'image',
              parentId: 'container-level1-b',
              content: '/placeholder.png'
            }
          ]
        }
      ]
    },
    // Botón de nivel raíz (no anidado)
    {
      id: 'button-root',
      type: 'button',
      content: 'Botón raíz'
    }
  ];
};

/**
 * Casos de prueba para validación de anidamiento
 */
export const runNestingTests = () => {
  console.log('🧪 Ejecutando pruebas de anidamiento de contenedores');
  
  const testStructure = createTestBannerStructure();
  const allComponents = testStructure;
  
  // Prueba 1: Calcular profundidades
  console.log('\n📊 Prueba 1: Cálculo de profundidades');
  const textLevel3 = { id: 'text-level3-a', parentId: 'container-level2-a' };
  const depth = calculateNestingDepth(textLevel3, allComponents);
  console.log(`Profundidad de text-level3-a: ${depth} (esperado: 3)`);
  
  // Prueba 2: Validación exitosa
  console.log('\n✅ Prueba 2: Validación exitosa');
  const containerLevel1 = allComponents[0].children[0]; // container-level1-a
  const newTextComponent = { id: 'new-text', type: 'text', content: 'Nuevo texto' };
  
  const validationSuccess = validateContainerNesting(containerLevel1, newTextComponent, allComponents);
  console.log('Resultado validación exitosa:', validationSuccess);
  
  // Prueba 3: Detectar profundidad máxima excedida
  console.log('\n❌ Prueba 3: Profundidad máxima excedida');
  const deepContainer = {
    id: 'deep-container',
    type: 'container',
    parentId: 'container-level2-a' // Ya está en nivel 2, agregar contenedor lo llevaría a nivel 3
  };
  
  // Simular estructura muy profunda
  const deepStructure = [...testStructure];
  // Agregar más niveles hasta exceder el máximo
  let currentContainer = deepContainer;
  for (let i = 4; i <= MAX_NESTING_DEPTH + 1; i++) {
    const newContainer = {
      id: `container-level${i}`,
      type: 'container',
      parentId: currentContainer.id
    };
    deepStructure.push(newContainer);
    currentContainer = newContainer;
  }
  
  const maxDepthTest = validateContainerNesting(
    currentContainer, 
    { id: 'final-container', type: 'container' }, 
    deepStructure
  );
  console.log('Resultado profundidad máxima:', maxDepthTest);
  
  // Prueba 4: Detectar referencia circular
  console.log('\n🔄 Prueba 4: Detección de referencia circular');
  const containerA = { id: 'container-a', type: 'container' };
  const containerB = { id: 'container-b', type: 'container', parentId: 'container-a' };
  
  // Intentar hacer que A sea hijo de B (crearía loop: A → B → A)
  const circularComponents = [containerA, containerB];
  const circularTest = detectCircularReference(containerB, containerA, circularComponents);
  console.log('Resultado detección circular:', circularTest);
  
  // Prueba 5: Indicadores visuales
  console.log('\n🎨 Prueba 5: Indicadores visuales por nivel');
  for (let level = 0; level <= MAX_NESTING_DEPTH + 1; level++) {
    const indicator = getNestingLevelIndicator(level);
    console.log(`Nivel ${level}:`, indicator);
  }
  
  // Prueba 6: Mensajes de error formateados
  console.log('\n💬 Prueba 6: Mensajes de error formateados');
  const errorMessage = formatNestingErrorMessage(maxDepthTest);
  console.log('Mensaje de error formateado:', errorMessage);
  
  // Prueba 7: Debug de estructura
  console.log('\n🔍 Prueba 7: Debug de estructura completa');
  debugNestingStructure(testStructure);
  
  console.log('\n✅ Todas las pruebas completadas');
};

/**
 * Función para probar validaciones en tiempo real durante drag & drop
 */
export const testDragValidation = () => {
  console.log('🎯 Probando validación de drag & drop en tiempo real');
  
  const components = createTestBannerStructure();
  const targetContainer = components[0].children[0]; // container-level1-a
  
  // Caso 1: Arrastrar componente válido
  const validComponent = { id: 'new-valid', type: 'text' };
  
  // Caso 2: Arrastrar contenedor que crearía loop
  const circularContainer = { id: 'container-root', type: 'container' }; // Intentar anidar el contenedor raíz
  
  console.log('Caso 1 - Componente válido:', validateContainerNesting(targetContainer, validComponent, components));
  console.log('Caso 2 - Referencia circular:', validateContainerNesting(targetContainer, circularContainer, components));
};

// Ejecutar pruebas si el archivo se importa directamente
if (typeof window !== 'undefined') {
  window.testContainerNesting = runNestingTests;
  window.testDragValidation = testDragValidation;
  console.log('🧪 Funciones de prueba disponibles: window.testContainerNesting(), window.testDragValidation()');
}