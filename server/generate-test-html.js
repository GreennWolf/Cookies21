// generate-test-html.js
// Script para generar test.html con el CMP para validación

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function generateTestHTML() {
  console.log('🛠️ Generando test.html para CMP Validator...');
  
  try {
    // URL de tu servidor local
    const serverUrl = 'http://localhost:3000';
    
    // Intentar obtener la página de test desde tu servidor
    console.log('📡 Conectando a servidor local...');
    const response = await axios.get(`${serverUrl}/api/v1/validator/test-page`, {
      timeout: 10000
    });
    
    // Guardar el archivo HTML
    const filePath = path.join(__dirname, '..', 'test.html');
    fs.writeFileSync(filePath, response.data);
    
    console.log('✅ test.html generado correctamente!');
    console.log(`📁 Archivo guardado en: ${filePath}`);
    console.log('');
    console.log('🚀 PRÓXIMOS PASOS:');
    console.log('1. Abre el archivo test.html en tu navegador');
    console.log('2. Ve al IAB TCF Validator: https://iabtcf.com/#validator');
    console.log('3. Introduce la URL del archivo o usa la herramienta de inspección');
    console.log('4. El validator debería detectar automáticamente el CMP');
    console.log('');
    console.log('🔍 CONFIGURACIÓN DEL CMP:');
    
    // Obtener configuración
    try {
      const configResponse = await axios.get(`${serverUrl}/api/v1/validator/config`);
      const config = configResponse.data.config;
      
      console.log(`   CMP ID: ${config.cmpId}`);
      console.log(`   Versión: ${config.cmpVersion}`);
      console.log(`   TCF Version: ${config.tcfVersion}`);
      console.log(`   Modo Validator: ${config.validatorMode}`);
      console.log(`   GDPR Applies: ${config.gdprApplies}`);
      
    } catch (configError) {
      console.log('   (No se pudo obtener configuración del servidor)');
    }
    
  } catch (error) {
    console.error('❌ Error generando test.html:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🚨 El servidor no está ejecutándose!');
      console.error('   Ejecuta primero: npm run dev');
      console.error('   Luego ejecuta: node generate-test-html.js');
    } else if (error.response && error.response.status === 404) {
      console.error('🚨 Endpoint /api/v1/validator/test-page no encontrado');
      console.error('   Verifica que las rutas del validator estén registradas correctamente');
    } else {
      console.error('   Error:', error.message);
    }
    
    // Generar fallback HTML básico
    console.log('');
    console.log('🔄 Generando HTML de fallback...');
    generateFallbackHTML();
  }
}

function generateFallbackHTML() {
  const fallbackHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CMP Test - Fallback</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { background: white; padding: 20px; border-radius: 8px; max-width: 800px; margin: 0 auto; }
        .error { background: #ffebee; padding: 15px; border-radius: 5px; border-left: 4px solid #f44336; margin-bottom: 20px; }
        button { background: #2196F3; color: white; border: none; padding: 10px 15px; margin: 5px; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 CMP Test (Fallback)</h1>
        
        <div class="error">
            <h3>⚠️ Servidor no disponible</h3>
            <p>No se pudo conectar al servidor local para obtener el script CMP completo.</p>
            <p><strong>Para generar el script completo:</strong></p>
            <ol>
                <li>Ejecuta: <code>npm run dev</code> en el directorio server</li>
                <li>Ejecuta: <code>node generate-test-html.js</code></li>
            </ol>
        </div>
        
        <h3>🛠️ Script CMP Básico (para testing básico)</h3>
        <p>Este es un script CMP mínimo. Para validación completa necesitas el servidor activo.</p>
    </div>
    
    <script>
        // CMP básico para testing sin servidor
        (function() {
            console.log('🚀 CMP Fallback iniciado');
            
            window.CMP = {
                config: {
                    cmpId: 300,
                    cmpVersion: 1,
                    tcfVersion: "2.2",
                    gdprApplies: true
                }
            };
            
            window.__tcfapi = function(command, version, callback) {
                console.log('TCF API llamada:', command, version);
                
                if (command === 'ping') {
                    callback({
                        gdprApplies: true,
                        cmpLoaded: true,
                        cmpStatus: 'loaded',
                        displayStatus: 'hidden',
                        apiVersion: '2.2',
                        cmpVersion: 1,
                        cmpId: 300
                    }, true);
                } else {
                    callback(null, false);
                }
            };
            
            // Crear iframe locator
            var iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.name = '__tcfapiLocator';
            document.body.appendChild(iframe);
            
            console.log('✅ CMP Fallback configurado');
        })();
    </script>
</body>
</html>`;

  const filePath = path.join(__dirname, '..', 'test.html');
  fs.writeFileSync(filePath, fallbackHTML);
  
  console.log('📄 HTML de fallback generado en: ' + filePath);
  console.log('⚠️  Este es un script básico. Para validación completa, asegúrate de que el servidor esté corriendo.');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateTestHTML();
}

module.exports = { generateTestHTML, generateFallbackHTML };