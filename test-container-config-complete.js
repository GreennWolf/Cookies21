// Test completo para verificar guardado y generación CSS de configuraciones de contenedor
const componentProcessor = require('./server/src/services/componentProcessor.service.js');
const bannerGenerator = require('./server/src/services/bannerGenerator.service.js');

// Datos de prueba con configuración completa de contenedor
const testBannerConfig = {
  name: 'Test Complete Container Config',
  layout: {
    desktop: { type: 'banner', position: 'bottom' },
    tablet: { type: 'banner', position: 'bottom' },
    mobile: { type: 'banner', position: 'bottom' }
  },
  components: [
    {
      id: 'flex-container-responsive',
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
          gap: '20px',
          flexWrap: 'nowrap'
        },
        tablet: {
          displayMode: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          gap: '15px',
          flexWrap: 'wrap'
        },
        mobile: {
          displayMode: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }
      },
      children: [
        {
          id: 'button-1',
          type: 'button',
          parentId: 'flex-container-responsive',
          content: { texts: { en: 'Button 1' } }
        },
        {
          id: 'button-2',
          type: 'button',
          parentId: 'flex-container-responsive',
          content: { texts: { en: 'Button 2' } }
        }
      ]
    }
  ]
};

async function runCompleteTest() {
  console.log('🧪 === PRUEBA COMPLETA DE CONFIGURACIÓN DE CONTENEDORES ===\n');

  console.log('1️⃣ CONFIGURACIÓN ORIGINAL:');
  const originalContainer = testBannerConfig.components[0];
  console.log('📦 Container config:');
  Object.keys(originalContainer.containerConfig).forEach(device => {
    console.log(`   ${device}: ${originalContainer.containerConfig[device].displayMode} - flex-direction: ${originalContainer.containerConfig[device].flexDirection}`);
  });

  console.log('\n2️⃣ PROCESAMIENTO DE COMPONENTES:');
  const processedComponents = componentProcessor.processComponents(testBannerConfig.components);
  const processedContainer = processedComponents.find(c => c.id === 'flex-container-responsive');

  console.log('📝 Container config después del procesamiento:');
  Object.keys(processedContainer.containerConfig).forEach(device => {
    const config = processedContainer.containerConfig[device];
    console.log(`   ${device}: ${config.displayMode} - flex-direction: ${config.flexDirection}, gap: ${config.gap}`);
  });

  console.log('\n3️⃣ GENERACIÓN DE HTML Y CSS:');
  const fullConfig = {
    ...testBannerConfig,
    components: processedComponents
  };

  try {
    const html = await bannerGenerator.generateHTML(fullConfig);
    const css = await bannerGenerator.generateCSS(fullConfig);

    console.log('📄 HTML generado (contenedor):');
    const containerHtmlMatch = html.match(/<div[^>]*data-component-id="flex-container-responsive"[^>]*>(.*?)<\/div>/s);
    if (containerHtmlMatch) {
      const containerHtml = containerHtmlMatch[0];
      console.log('   ✅ Contenedor encontrado en HTML');
      console.log(`   📊 Classes: ${containerHtml.match(/class="([^"]*)"/) ? containerHtml.match(/class="([^"]*)"/)[1] : 'none'}`);
      console.log(`   📊 Display mode: ${containerHtml.match(/data-display-mode="([^"]*)"/) ? containerHtml.match(/data-display-mode="([^"]*)"/)[1] : 'none'}`);
    } else {
      console.log('   ❌ Contenedor NO encontrado en HTML');
    }

    console.log('\n📝 CSS generado para contenedor:');
    const containerSelector = '[data-component-id=flex-container-responsive]';
    
    console.log('🖥️ Desktop CSS:');
    const desktopFlexMatch = css.includes(containerSelector) && css.includes('display:flex');
    if (desktopFlexMatch) {
      console.log('   ✅ CSS desktop flex encontrado');
      // Extraer el bloque completo
      const block = css.match(/\[data-component-id=flex-container-responsive\]\{[^}]*\}/);
      if (block) console.log(`   📊 ${block[0]}`);
    } else {
      console.log('   ❌ CSS desktop flex NO encontrado');
    }

    console.log('\n📱 Tablet CSS:');
    const tabletMediaMatch = css.includes('@media') && css.includes('max-width:1024px') && css.includes(containerSelector);
    if (tabletMediaMatch) {
      console.log('   ✅ CSS tablet encontrado');
    } else {
      console.log('   ❌ CSS tablet NO encontrado');
    }

    console.log('\n📱 Mobile CSS:');
    const mobileMediaMatch = css.includes('@media') && css.includes('max-width:768px') && css.includes(containerSelector);
    if (mobileMediaMatch) {
      console.log('   ✅ CSS mobile encontrado');
    } else {
      console.log('   ❌ CSS mobile NO encontrado');
    }

    console.log('\n4️⃣ VERIFICACIÓN DE PROPIEDADES ESPECÍFICAS:');

    // Verificar propiedades específicas en el CSS (formato minificado)
    const checks = [
      { prop: 'flex-direction:row', name: 'flex-direction: row', device: 'desktop', expected: true },
      { prop: 'flex-direction:column', name: 'flex-direction: column', device: 'tablet', expected: true },
      { prop: 'justify-content:space-between', name: 'justify-content: space-between', device: 'desktop', expected: true },
      { prop: 'gap:20px', name: 'gap: 20px', device: 'desktop', expected: true },
      { prop: 'gap:15px', name: 'gap: 15px', device: 'tablet', expected: true },
      { prop: 'gap:10px', name: 'gap: 10px', device: 'mobile', expected: true }
    ];

    let allChecksPass = true;
    checks.forEach(check => {
      const found = css.includes(check.prop);
      const status = found === check.expected ? '✅' : '❌';
      console.log(`   ${status} ${check.name} (${check.device}): ${found ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
      if (found !== check.expected) allChecksPass = false;
    });

    console.log('\n🎯 === RESULTADO FINAL ===');
    const configPreserved = processedContainer.containerConfig.desktop.flexDirection === 'row' && 
                            processedContainer.containerConfig.tablet.flexDirection === 'column';
    const cssGenerated = desktopFlexMatch && tabletMediaMatch && mobileMediaMatch;

    if (configPreserved && cssGenerated && allChecksPass) {
      console.log('✅ SUCCESS: Configuración de contenedores funciona perfectamente');
      console.log('   - Configuraciones originales preservadas');
      console.log('   - CSS responsivo generado correctamente');
      console.log('   - Todas las propiedades específicas presentes');
    } else {
      console.log('❌ ISSUES FOUND:');
      if (!configPreserved) console.log('   - Configuraciones no se preservaron correctamente');
      if (!cssGenerated) console.log('   - CSS responsivo no se generó correctamente');
      if (!allChecksPass) console.log('   - Algunas propiedades específicas faltan');
    }

    console.log('\n📋 RESUMEN:');
    console.log(`   📦 Configuración preservada: ${configPreserved ? '✅' : '❌'}`);
    console.log(`   📝 CSS responsivo generado: ${cssGenerated ? '✅' : '❌'}`);
    console.log(`   🎯 Propiedades específicas: ${allChecksPass ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Error durante la generación:', error.message);
  }
}

// Ejecutar el test
runCompleteTest().catch(console.error);