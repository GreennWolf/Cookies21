// Debug para entender por qué no se genera CSS de contenedores
const componentProcessor = require('./server/src/services/componentProcessor.service.js');
const bannerGenerator = require('./server/src/services/bannerGenerator.service.js');

const simpleConfig = {
  name: 'Debug CSS Generation',
  layout: { desktop: { type: 'banner', position: 'bottom' } },
  components: [
    {
      id: 'test-container',
      type: 'container',
      containerConfig: {
        desktop: {
          displayMode: 'flex',
          flexDirection: 'row',
          gap: '20px'
        }
      },
      position: { desktop: { top: '10%', left: '10%' } }
    }
  ]
};

async function debugCSS() {
  console.log('🔍 === DEBUG CSS GENERATION ===\n');
  
  // Procesar componentes
  const processedComponents = componentProcessor.processComponents(simpleConfig.components);
  const fullConfig = { ...simpleConfig, components: processedComponents };
  
  console.log('📋 Componente procesado:');
  const container = processedComponents[0];
  console.log(`   ID: ${container.id}`);
  console.log(`   Type: ${container.type}`);
  console.log(`   containerConfig:`, JSON.stringify(container.containerConfig, null, 2));
  
  // Generar CSS
  console.log('\n🎨 Generando CSS...');
  try {
    const css = await bannerGenerator.generateCSS(fullConfig);
    
    console.log('\n📝 CSS completo generado:');
    console.log('='.repeat(80));
    console.log(css);
    console.log('='.repeat(80));
    
    // Buscar específicamente el CSS del contenedor
    console.log('\n🔍 Análisis específico del CSS:');
    
    const containerSelector = `[data-component-id=${container.id}]`;
    console.log(`   Buscando selector: ${containerSelector}`);
    
    if (css.includes(containerSelector)) {
      console.log('   ✅ Selector del contenedor encontrado');
      
      // Extraer el bloque CSS del contenedor
      const escapedSelector = containerSelector.replace(/[\[\]]/g, '\\$&');
      const containerCSSMatch = css.match(new RegExp(`${escapedSelector}\\s*{[^}]*}`, 'g'));
      if (containerCSSMatch) {
        console.log(`   📦 Bloques CSS encontrados: ${containerCSSMatch.length}`);
        containerCSSMatch.forEach((block, i) => {
          console.log(`   📦 Bloque ${i+1}: ${block}`);
        });
      } else {
        console.log('   ❌ No se encontraron bloques CSS completos');
      }
      
      // Verificar propiedades específicas (considerando CSS minificado)
      console.log('\n   🔍 Verificando propiedades específicas:');
      const props = [
        { name: 'display: flex', search: 'display:flex' },
        { name: 'flex-direction: row', search: 'flex-direction:row' },
        { name: 'gap: 20px', search: 'gap:20px' }
      ];
      props.forEach(prop => {
        const found = css.includes(prop.search);
        console.log(`   ${found ? '✅' : '❌'} ${prop.name}: ${found ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
      });
      
    } else {
      console.log('   ❌ Selector del contenedor NO encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error generando CSS:', error);
  }
}

debugCSS().catch(console.error);