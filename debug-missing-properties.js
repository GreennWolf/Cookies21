// Debug para propiedades que parecen faltar
const bannerGenerator = require('./server/src/services/bannerGenerator.service.js');

const testComponent = {
  name: 'Debug Missing Properties',
  layout: { desktop: { type: 'banner', position: 'bottom' } },
  components: [
    {
      id: 'debug-component',
      type: 'button',
      content: { texts: { en: 'Debug' } },
      position: { desktop: { top: '10%', left: '10%' } },
      style: {
        desktop: {
          backgroundColor: '#007bff',
          color: '#ffffff',
          borderColor: '#0056b3',    // ❓ Falta
          fontWeight: 'bold',        // ❓ Falta  
          borderWidth: '2px',        // ❓ Falta
          borderStyle: 'solid',      // ❓ Falta
          opacity: 0.9,              // ❓ Falta
          border: '3px dashed red'   // ✅ Funciona
        }
      }
    }
  ]
};

async function debugMissingProperties() {
  console.log('🔍 === DEBUG PROPIEDADES FALTANTES ===\n');
  
  const css = await bannerGenerator.generateCSS(testComponent);
  
  console.log('📝 CSS completo:');
  console.log('='.repeat(80));
  console.log(css);
  console.log('='.repeat(80));
  
  console.log('\n🔍 Búsquedas específicas:');
  
  const searches = [
    { property: 'border-color:#0056b3', name: 'border-color (exacto)' },
    { property: 'border-color:', name: 'border-color (cualquiera)' },
    { property: 'font-weight:bold', name: 'font-weight (exacto)' },
    { property: 'font-weight:', name: 'font-weight (cualquiera)' },
    { property: 'border-width:2px', name: 'border-width (exacto)' },
    { property: 'border-width:', name: 'border-width (cualquiera)' },
    { property: 'border-style:solid', name: 'border-style (exacto)' },
    { property: 'border-style:', name: 'border-style (cualquiera)' },
    { property: 'opacity:0.9', name: 'opacity (exacto)' },
    { property: 'opacity:', name: 'opacity (cualquiera)' },
    { property: 'border:3px dashed red', name: 'border shorthand (exacto)' },
    { property: 'border:', name: 'border (cualquiera)' }
  ];
  
  searches.forEach(search => {
    const found = css.includes(search.property);
    console.log(`   ${found ? '✅' : '❌'} ${search.name}: ${found ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
  });
  
  console.log('\n📋 OBSERVACIONES:');
  
  // Verificar si border shorthand está sobrescribiendo propiedades individuales
  if (css.includes('border:') && css.includes('3px dashed red')) {
    console.log('✅ Border shorthand se está aplicando');
    console.log('📝 NOTA: border shorthand puede sobrescribir border-color, border-width, border-style');
  }
  
  // Extraer todo lo relacionado con border
  const borderMatches = css.match(/border[^;]*:[^;]*;/g);
  if (borderMatches) {
    console.log('\n🔍 Todas las propiedades border encontradas:');
    borderMatches.forEach(match => console.log(`   - ${match}`));
  }
  
  // Extraer todo lo relacionado con font
  const fontMatches = css.match(/font[^;]*:[^;]*;/g);
  if (fontMatches) {
    console.log('\n🔍 Todas las propiedades font encontradas:');
    fontMatches.forEach(match => console.log(`   - ${match}`));
  }
  
  console.log('\n💡 POSIBLES EXPLICACIONES:');
  console.log('   1. border shorthand sobrescribe propiedades individuales');
  console.log('   2. Algunas propiedades pueden estar siendo filtradas');
  console.log('   3. El orden de aplicación puede afectar qué propiedades se ven');
  console.log('   4. Propiedades con valores por defecto pueden no aparecer');
}

debugMissingProperties().catch(console.error);