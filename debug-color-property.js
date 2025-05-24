// Debug específico para el problema de color
const bannerGenerator = require('./server/src/services/bannerGenerator.service.js');

// Test simple para el botón con color
const simpleButton = {
  name: 'Debug Color',
  layout: { desktop: { type: 'banner', position: 'bottom' } },
  components: [
    {
      id: 'color-test-button',
      type: 'button',
      content: { texts: { en: 'Test Button' } },
      position: { desktop: { top: '10%', left: '10%' } },
      style: {
        desktop: {
          backgroundColor: '#007bff',
          color: '#ffffff',
          fontSize: '16px',
          padding: '12px 24px'
        }
      }
    }
  ]
};

async function debugColor() {
  console.log('🔍 === DEBUG COLOR PROPERTY ===\n');
  
  const css = await bannerGenerator.generateCSS(simpleButton);
  
  console.log('📝 CSS completo:');
  console.log('='.repeat(80));
  console.log(css);
  console.log('='.repeat(80));
  
  console.log('\n🔍 Búsquedas específicas:');
  console.log(`   'color:#ffffff' encontrado: ${css.includes('color:#ffffff')}`);
  console.log(`   'color: #ffffff' encontrado: ${css.includes('color: #ffffff')}`);
  console.log(`   '#ffffff' encontrado: ${css.includes('#ffffff')}`);
  console.log(`   'color:' encontrado: ${css.includes('color:')}`);
  
  // Buscar todo lo que tenga que ver con color
  const colorMatches = css.match(/color:[^;]*/g);
  console.log('\n🎨 Todas las propiedades color encontradas:');
  if (colorMatches) {
    colorMatches.forEach(match => console.log(`   - ${match}`));
  } else {
    console.log('   ❌ No se encontraron propiedades color');
  }
  
  // Buscar el selector específico del botón
  const buttonSelector = '[data-component-id=color-test-button]';
  console.log(`\n📍 Selector '${buttonSelector}' encontrado: ${css.includes(buttonSelector)}`);
  
  // Extraer el bloque CSS del botón
  const buttonBlockMatch = css.match(/\[data-component-id=color-test-button\]\{[^}]*\}/);
  if (buttonBlockMatch) {
    console.log('\n📦 Bloque CSS del botón:');
    console.log(buttonBlockMatch[0]);
  } else {
    console.log('\n❌ No se encontró bloque CSS del botón');
  }
}

debugColor().catch(console.error);