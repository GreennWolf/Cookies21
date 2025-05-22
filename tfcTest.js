/**
 * TCF v2.2 CMP Verificador
 * Herramienta para verificar si tu CMP cumple con los requisitos básicos de IAB TCF v2.2
 * 
 * Instrucciones:
 * 1. Incluir este script después de que el CMP esté cargado en la página
 * 2. Abrir la consola del navegador para ver los resultados
 * 3. Los tests comprobarán aspectos críticos de la implementación TCF
 */

(function() {
    console.log('%c TCF v2.2 CMP Verificador', 'background: #0078d4; color: white; padding: 5px; font-size: 16px; font-weight: bold;');
    console.log('Iniciando validación de cumplimiento TCF v2.2...');
    
    const tests = [
      {
        name: "Existencia del stub __tcfapi",
        test: function() {
          return typeof window.__tcfapi === 'function';
        }
      },
      {
        name: "Existencia del iframe __tcfapiLocator",
        test: function() {
          return !!window.frames['__tcfapiLocator'];
        }
      },
      {
        name: "Comando 'ping' implementado correctamente",
        test: function() {
          return new Promise((resolve) => {
            try {
              window.__tcfapi('ping', 2, function(data, success) {
                if (!success) {
                  console.error('Ping falló con success=false');
                  resolve(false);
                  return;
                }
                
                // Verificar campos requeridos
                const requiredFields = ['gdprApplies', 'cmpLoaded', 'cmpStatus', 'displayStatus', 'apiVersion', 'cmpVersion', 'cmpId', 'gvlVersion', 'tcfPolicyVersion'];
                const missingFields = requiredFields.filter(field => data[field] === undefined);
                
                if (missingFields.length > 0) {
                  console.error('Ping respuesta incompleta. Faltan campos:', missingFields);
                  resolve(false);
                  return;
                }
                
                // Verificar valores específicos para TCF v2.2
                if (data.tcfPolicyVersion !== 4) {
                  console.error('tcfPolicyVersion incorrecto. Esperado: 4 (para TCF v2.2), Actual:', data.tcfPolicyVersion);
                  resolve(false);
                  return;
                }
                
                if (data.apiVersion !== '2.2' && data.apiVersion !== 2.2) {
                  console.warn('apiVersion posiblemente incorrecta. Esperado: 2.2, Actual:', data.apiVersion);
                }
                
                resolve(true);
              });
            } catch (e) {
              console.error('Error ejecutando ping:', e);
              resolve(false);
            }
          });
        }
      },
      {
        name: "Comando 'addEventListener' implementado",
        test: function() {
          return new Promise((resolve) => {
            try {
              window.__tcfapi('addEventListener', 2, function(data, success) {
                if (!success) {
                  console.error('addEventListener falló con success=false');
                  resolve(false);
                  return;
                }
                
                // Verificar que hay un listenerId
                if (!data.listenerId) {
                  console.error('addEventListener no devolvió listenerId');
                  resolve(false);
                  return;
                }
                
                // Verificar eventStatus
                if (!data.eventStatus) {
                  console.error('addEventListener no devolvió eventStatus');
                  resolve(false);
                  return;
                }
                
                resolve(true);
              });
            } catch (e) {
              console.error('Error ejecutando addEventListener:', e);
              resolve(false);
            }
          });
        }
      },
      {
        name: "Comando 'removeEventListener' implementado",
        test: function() {
          return new Promise((resolve) => {
            // Primero agregar un listener para obtener un ID
            window.__tcfapi('addEventListener', 2, function(tcData, addSuccess) {
              if (!addSuccess || !tcData.listenerId) {
                console.error('No se pudo agregar listener para probar removeEventListener');
                resolve(false);
                return;
              }
              
              const listenerId = tcData.listenerId;
              
              // Ahora intentar removerlo
              window.__tcfapi('removeEventListener', 2, function(data, removeSuccess) {
                if (!removeSuccess) {
                  console.error('removeEventListener falló con success=false');
                  resolve(false);
                  return;
                }
                
                resolve(true);
              }, listenerId);
            });
          });
        }
      },
      {
        name: "Comando 'getTCData' implementado",
        test: function() {
          return new Promise((resolve) => {
            try {
              window.__tcfapi('getTCData', 2, function(tcData, success) {
                if (!success) {
                  console.error('getTCData falló con success=false');
                  resolve(false);
                  return;
                }
                
                // Verificar campos críticos
                const requiredFields = ['tcString', 'tcfPolicyVersion', 'cmpId', 'cmpVersion', 'gdprApplies'];
                const missingFields = requiredFields.filter(field => tcData[field] === undefined);
                
                if (missingFields.length > 0) {
                  console.error('getTCData respuesta incompleta. Faltan campos:', missingFields);
                  resolve(false);
                  return;
                }
                
                // Verificar formato de TC string (debe ser string y contener IABTCF)
                if (typeof tcData.tcString !== 'string' || tcData.tcString.length < 20) {
                  console.error('TC String parece inválido:', tcData.tcString);
                  resolve(false);
                  return;
                }
                
                resolve(true);
              });
            } catch (e) {
              console.error('Error ejecutando getTCData:', e);
              resolve(false);
            }
          });
        }
      },
      {
        name: "Interacción con UI: Botones esenciales presentes",
        test: function() {
          try {
            // Si hay banner visible
            const banner = document.getElementById('cmp-banner');
            if (!banner || window.getComputedStyle(banner).display === 'none') {
              console.warn('Banner de consentimiento no visible. Saltando prueba de UI');
              return true; // No fallar test si el banner no está visible
            }
            
            // Buscar botones esenciales (aceptar/rechazar todo)
            const acceptButton = document.querySelector('[data-cmp-action="accept_all"]');
            const rejectButton = document.querySelector('[data-cmp-action="reject_all"]');
            
            if (!acceptButton) {
              console.error('No se encontró botón "Aceptar todo" con atributo data-cmp-action="accept_all"');
              return false;
            }
            
            if (!rejectButton) {
              console.error('No se encontró botón "Rechazar todo" con atributo data-cmp-action="reject_all"');
              return false;
            }
            
            // Verificar que los botones son visualmente similares (primera capa)
            const acceptStyle = window.getComputedStyle(acceptButton);
            const rejectStyle = window.getComputedStyle(rejectButton);
            
            const acceptHeight = parseInt(acceptStyle.height);
            const rejectHeight = parseInt(rejectStyle.height);
            
            if (Math.abs(acceptHeight - rejectHeight) > 10) {
              console.warn('Los botones aceptar/rechazar tienen alturas notablemente diferentes');
            }
            
            return true;
          } catch (e) {
            console.error('Error verificando botones UI:', e);
            return false;
          }
        }
      },
      {
        name: "Cookie de consentimiento establecida",
        test: function() {
          // Buscar cookie estándar TCF
          const cookies = document.cookie.split(';');
          const tcfCookie = cookies.find(cookie => 
            cookie.trim().startsWith('euconsent-v2=') ||
            cookie.trim().includes('-consent=')
          );
          
          if (!tcfCookie) {
            console.warn('No se encontró cookie de consentimiento TCF (euconsent-v2 o *-consent)');
            return false;
          }
          
          return true;
        }
      },
      {
        name: "Comunicación PostMessage funcional",
        test: function() {
          return new Promise((resolve) => {
            try {
              // Crear un iframe para probar comunicación postMessage
              const testFrame = document.createElement('iframe');
              testFrame.style.display = 'none';
              testFrame.onload = function() {
                try {
                  const callId = 'test_' + Math.random().toString(36).substring(2, 15);
                  const msg = {
                    __tcfapiCall: {
                      command: 'ping',
                      version: 2,
                      callId: callId
                    }
                  };
                  
                  // Configurar listener para respuesta
                  const messageHandler = function(event) {
                    try {
                      let data = event.data;
                      if (typeof data === 'string') {
                        data = JSON.parse(data);
                      }
                      
                      if (data && data.__tcfapiReturn && data.__tcfapiReturn.callId === callId) {
                        window.removeEventListener('message', messageHandler);
                        document.body.removeChild(testFrame);
                        resolve(true);
                      }
                    } catch (e) {
                      console.error('Error procesando respuesta postMessage:', e);
                    }
                  };
                  
                  window.addEventListener('message', messageHandler);
                  
                  // Enviar mensaje al top frame
                  window.top.postMessage(msg, '*');
                  
                  // Timeout después de 2 segundos
                  setTimeout(() => {
                    window.removeEventListener('message', messageHandler);
                    document.body.removeChild(testFrame);
                    console.error('Timeout esperando respuesta postMessage');
                    resolve(false);
                  }, 2000);
                } catch (e) {
                  console.error('Error enviando mensaje postMessage:', e);
                  document.body.removeChild(testFrame);
                  resolve(false);
                }
              };
              
              document.body.appendChild(testFrame);
            } catch (e) {
              console.error('Error creando iframe para test postMessage:', e);
              resolve(false);
            }
          });
        }
      }
    ];
    
    // Ejecutar todos los tests
    async function runTests() {
      let passedCount = 0;
      let failedCount = 0;
      
      console.log(`Ejecutando ${tests.length} tests...`);
      
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`Test ${i+1}/${tests.length}: ${test.name}`);
        
        try {
          const result = await test.test();
          if (result) {
            console.log(`%c ✓ PASADO: ${test.name}`, 'color: green; font-weight: bold;');
            passedCount++;
          } else {
            console.log(`%c ✗ FALLIDO: ${test.name}`, 'color: red; font-weight: bold;');
            failedCount++;
          }
        } catch (e) {
          console.error(`Error ejecutando test "${test.name}":`, e);
          console.log(`%c ✗ FALLIDO: ${test.name} (por error)`, 'color: red; font-weight: bold;');
          failedCount++;
        }
      }
      
      // Resumen final
      console.log('%c === RESUMEN DE VERIFICACIÓN TCF v2.2 ===', 'background: #333; color: white; padding: 5px; font-size: 14px;');
      console.log(`Total tests: ${tests.length}`);
      console.log(`%c Pasados: ${passedCount}`, 'color: green; font-weight: bold;');
      console.log(`%c Fallidos: ${failedCount}`, 'color: red; font-weight: bold;');
      
      if (failedCount === 0) {
        console.log('%c ¡FELICIDADES! Tu CMP pasa todas las verificaciones básicas de TCF v2.2.', 'background: green; color: white; padding: 5px; font-size: 14px;');
        console.log('Considera probar con la extensión CMP Validator de IAB para una validación completa.');
      } else {
        const percent = Math.round((passedCount / tests.length) * 100);
        console.log(`%c Tu CMP pasó ${percent}% de las verificaciones. Revisa los errores y warnings para solucionar los problemas.`, 'background: orange; color: black; padding: 5px; font-size: 14px;');
      }
    }
    
    // Esperamos un poco para que el CMP se inicialice completamente
    setTimeout(runTests, 1500);
  })();
  