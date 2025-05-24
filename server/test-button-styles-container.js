// Test específico para verificar estilos de botones dentro de contenedores
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function testButtonStylesInContainer() {
  console.log('🧪 Iniciando test de estilos de botones en contenedores...\n');

  try {
    // 1. Crear un banner con un contenedor que contiene botones con estilos específicos
    const bannerConfig = {
      name: 'Test Banner - Botones en Contenedor',
      layout: {
        desktop: {
          type: 'modal',
          position: 'center',
          width: '600px',
          height: 'auto',
          backgroundColor: '#ffffff'
        }
      },
      components: [
        {
          id: 'container-main',
          type: 'container',
          containerConfig: {
            desktop: {
              displayMode: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '20px',
              allowDrops: true
            }
          },
          style: {
            desktop: {
              padding: '30px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px'
            }
          },
          position: {
            desktop: {
              position: 'relative'
            }
          },
          children: [
            {
              id: 'button-accept',
              type: 'button',
              parentId: 'container-main',
              content: {
                desktop: { text: 'Aceptar Todo' }
              },
              style: {
                desktop: {
                  backgroundColor: '#28a745',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: '150px'
                }
              },
              position: {
                desktop: {
                  position: 'relative'
                }
              }
            },
            {
              id: 'button-reject',
              type: 'button',
              parentId: 'container-main',
              content: {
                desktop: { text: 'Rechazar Todo' }
              },
              style: {
                desktop: {
                  backgroundColor: '#dc3545',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 'normal',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '2px solid #c82333',
                  cursor: 'pointer',
                  minWidth: '140px'
                }
              },
              position: {
                desktop: {
                  position: 'relative'
                }
              }
            },
            {
              id: 'button-preferences',
              type: 'button',
              parentId: 'container-main',
              content: {
                desktop: { text: 'Configurar Preferencias' }
              },
              style: {
                desktop: {
                  backgroundColor: 'transparent',
                  color: '#007bff',
                  fontSize: '13px',
                  fontWeight: '500',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #007bff',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }
              },
              position: {
                desktop: {
                  position: 'relative'
                }
              }
            }
          ]
        }
      ],
      theme: {
        fontFamily: 'Arial, sans-serif',
        primaryColor: '#007bff',
        buttonTextColor: '#ffffff'
      }
    };

    console.log('📝 Creando banner con botones estilizados en contenedor...');
    const createResponse = await axios.post(`${API_URL}/banner-templates`, bannerConfig);
    const bannerId = createResponse.data.data._id;
    console.log(`✅ Banner creado con ID: ${bannerId}\n`);

    // 2. Recuperar el banner para verificar que se guardó correctamente
    console.log('🔍 Recuperando banner guardado...');
    const getResponse = await axios.get(`${API_URL}/banner-templates/${bannerId}`);
    const savedBanner = getResponse.data.data;

    console.log('📊 Analizando componentes guardados...');
    
    // Buscar el contenedor y sus hijos
    const container = savedBanner.components.find(c => c.id === 'container-main');
    if (!container) {
      console.log('❌ ERROR: Contenedor no encontrado en el banner guardado');
      return;
    }

    console.log(`📦 Contenedor encontrado: ${container.id}`);
    console.log(`   - DisplayMode: ${container.containerConfig?.desktop?.displayMode}`);
    console.log(`   - FlexDirection: ${container.containerConfig?.desktop?.flexDirection}`);
    console.log(`   - Gap: ${container.containerConfig?.desktop?.gap}`);
    
    // Buscar los botones hijos
    const buttons = savedBanner.components.filter(c => 
      c.type === 'button' && c.parentId === 'container-main'
    );

    console.log(`\n🔘 Botones encontrados en el contenedor: ${buttons.length}`);
    
    buttons.forEach(button => {
      console.log(`\n   Botón: ${button.id}`);
      console.log(`   - Texto: ${button.content?.desktop?.text}`);
      console.log(`   - Background: ${button.style?.desktop?.backgroundColor}`);
      console.log(`   - Color: ${button.style?.desktop?.color}`);
      console.log(`   - FontSize: ${button.style?.desktop?.fontSize}`);
      console.log(`   - FontWeight: ${button.style?.desktop?.fontWeight}`);
      console.log(`   - Padding: ${button.style?.desktop?.padding}`);
      console.log(`   - BorderRadius: ${button.style?.desktop?.borderRadius}`);
      console.log(`   - Border: ${button.style?.desktop?.border}`);
      console.log(`   - MinWidth: ${button.style?.desktop?.minWidth}`);
    });

    // 3. Generar el script y verificar los estilos CSS
    console.log('\n🎨 Generando script para verificar CSS...');
    const scriptResponse = await axios.post(`${API_URL}/banner-templates/${bannerId}/generate-script`);
    const generatedCSS = scriptResponse.data.data.css;

    console.log('\n📝 Analizando CSS generado...');
    
    // Verificar que los estilos de cada botón estén en el CSS
    const buttonSelectors = [
      `[data-component-id="button-accept"]`,
      `[data-component-id="button-reject"]`,
      `[data-component-id="button-preferences"]`
    ];

    buttonSelectors.forEach(selector => {
      if (generatedCSS.includes(selector)) {
        console.log(`✅ Selector encontrado: ${selector}`);
        
        // Extraer el bloque CSS del botón
        const selectorIndex = generatedCSS.indexOf(selector);
        const blockStart = generatedCSS.indexOf('{', selectorIndex);
        const blockEnd = generatedCSS.indexOf('}', blockStart);
        const cssBlock = generatedCSS.substring(blockStart + 1, blockEnd);
        
        console.log(`   CSS Block: ${cssBlock.trim()}`);
        
        // Verificar propiedades específicas
        const hasBackgroundColor = cssBlock.includes('background-color');
        const hasColor = cssBlock.includes('color');
        const hasPadding = cssBlock.includes('padding');
        const hasBorderRadius = cssBlock.includes('border-radius');
        
        console.log(`   - BackgroundColor: ${hasBackgroundColor ? '✅' : '❌'}`);
        console.log(`   - Color: ${hasColor ? '✅' : '❌'}`);
        console.log(`   - Padding: ${hasPadding ? '✅' : '❌'}`);
        console.log(`   - BorderRadius: ${hasBorderRadius ? '✅' : '❌'}`);
      } else {
        console.log(`❌ Selector NO encontrado: ${selector}`);
      }
    });

    // 4. Verificar que el contenedor tenga sus estilos CSS correctos
    console.log('\n📦 Verificando estilos del contenedor...');
    const containerSelector = `[data-component-id="container-main"]`;
    
    if (generatedCSS.includes(containerSelector)) {
      console.log(`✅ Selector del contenedor encontrado: ${containerSelector}`);
      
      // Verificar propiedades flex del contenedor
      const hasDisplay = generatedCSS.includes('display: flex');
      const hasFlexDirection = generatedCSS.includes('flex-direction: column');
      const hasGap = generatedCSS.includes('gap: 20px');
      
      console.log(`   - Display Flex: ${hasDisplay ? '✅' : '❌'}`);
      console.log(`   - Flex Direction: ${hasFlexDirection ? '✅' : '❌'}`);
      console.log(`   - Gap: ${hasGap ? '✅' : '❌'}`);
    } else {
      console.log(`❌ Selector del contenedor NO encontrado`);
    }

    console.log('\n🎯 Resultado del test:');
    
    // Verificar que todos los botones tengan estilos completos
    const allButtonsHaveStyles = buttons.every(button => 
      button.style?.desktop?.backgroundColor &&
      button.style?.desktop?.color &&
      button.style?.desktop?.padding
    );

    if (allButtonsHaveStyles) {
      console.log('✅ ÉXITO: Todos los botones tienen estilos completos guardados');
    } else {
      console.log('❌ ERROR: Algunos botones no tienen estilos completos');
    }

    // Verificar que el CSS contenga los selectores de todos los botones
    const allSelectorsInCSS = buttonSelectors.every(selector => 
      generatedCSS.includes(selector)
    );

    if (allSelectorsInCSS) {
      console.log('✅ ÉXITO: Todos los selectores de botones están en el CSS generado');
    } else {
      console.log('❌ ERROR: Faltan selectores de botones en el CSS generado');
    }

    // Guardar el CSS para inspección manual
    const fs = require('fs');
    fs.writeFileSync('/mnt/c/Proyectos Wolfy/Cookies21-main/debug-button-styles.css', generatedCSS);
    console.log('💾 CSS completo guardado en: debug-button-styles.css');

  } catch (error) {
    console.error('❌ Error en el test:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('📝 Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Ejecutar el test
testButtonStylesInContainer();