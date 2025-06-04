#!/usr/bin/env node

/**
 * Script para enviar todos los tipos de emails disponibles a una dirección de prueba
 * Uso: node send-all-emails-test.js
 */

require('dotenv').config();
const emailService = require('./src/services/email.service');

const TEST_EMAIL = 'sawcraft16@gmail.com';
const TEST_NAME = 'Test User';

async function sendAllEmails() {
  console.log('📧 Enviando todos los tipos de emails a:', TEST_EMAIL);
  console.log('================================\n');
  
  const results = [];
  
  try {
    // 1. Email de invitación
    console.log('1️⃣ Enviando email de invitación...');
    const invitationResult = await emailService.sendInvitationEmail({
      email: TEST_EMAIL,
      name: TEST_NAME,
      invitationToken: 'test-invitation-token-' + Date.now(),
      clientName: 'Cookie21 Demo',
      role: 'admin',
      sendDirect: true // Forzar envío real
    });
    results.push({ type: 'Invitación', ...invitationResult });
    console.log('   Resultado:', invitationResult.success ? '✅ Éxito' : '❌ Error');
    if (invitationResult.error) console.log('   Error:', invitationResult.error);
    console.log('');
    
    // 2. Email de bienvenida
    console.log('2️⃣ Enviando email de bienvenida...');
    const welcomeResult = await emailService.sendWelcomeEmail({
      email: TEST_EMAIL,
      name: TEST_NAME,
      clientName: 'Cookie21'
    });
    results.push({ type: 'Bienvenida', ...welcomeResult });
    console.log('   Resultado:', welcomeResult.success ? '✅ Éxito' : '❌ Error');
    if (welcomeResult.error) console.log('   Error:', welcomeResult.error);
    console.log('');
    
    // 3. Email genérico Cookie21
    console.log('3️⃣ Enviando email genérico Cookie21...');
    const genericResult = await emailService.sendCookies21Email({
      email: TEST_EMAIL,
      name: TEST_NAME,
      subject: 'Prueba de Email Cookie21',
      message: `
        <p>Este es un email de prueba del sistema Cookie21.</p>
        <p>Estamos probando el template genérico con el nuevo diseño que incluye:</p>
        <ul>
          <li>Logo de Cookie21</li>
          <li>Diseño moderno y responsivo</li>
          <li>Colores corporativos (#235C88)</li>
          <li>Enlaces a redes sociales</li>
        </ul>
        <p>Este tipo de email se puede usar para notificaciones generales.</p>
      `,
      buttonText: 'Visitar Cookie21',
      buttonUrl: 'https://cookie21.com',
      clientName: 'Cookie21'
    });
    results.push({ type: 'Cookie21 Genérico', ...genericResult });
    console.log('   Resultado:', genericResult.success ? '✅ Éxito' : '❌ Error');
    if (genericResult.error) console.log('   Error:', genericResult.error);
    console.log('');
    
    // 4. Email de configuración de cookies
    console.log('4️⃣ Enviando email de configuración de cookies...');
    const cookieConfigResult = await emailService.sendCookieConfigEmail({
      email: TEST_EMAIL,
      name: TEST_NAME,
      website: 'www.ejemplo.com',
      configUrl: 'https://app.cookie21.com/panel/configuracion',
      clientName: 'Cookie21'
    });
    results.push({ type: 'Configuración Cookies', ...cookieConfigResult });
    console.log('   Resultado:', cookieConfigResult.success ? '✅ Éxito' : '❌ Error');
    if (cookieConfigResult.error) console.log('   Error:', cookieConfigResult.error);
    console.log('');
    
    // 5. Email con script de integración
    console.log('5️⃣ Enviando email con script de integración...');
    const embedScriptResult = await emailService.sendEmbedScriptEmail({
      email: TEST_EMAIL,
      name: TEST_NAME,
      domain: 'www.ejemplo.com',
      script: `<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://cookie21.com/embed.js';
    script.setAttribute('data-client-id', 'demo-client-123');
    script.setAttribute('data-position', 'bottom');
    script.setAttribute('data-theme', 'light');
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`,
      clientName: 'Cookie21',
      sendDirect: true // Forzar envío real
    });
    results.push({ type: 'Script Integración', ...embedScriptResult });
    console.log('   Resultado:', embedScriptResult.success ? '✅ Éxito' : '❌ Error');
    if (embedScriptResult.error) console.log('   Error:', embedScriptResult.error);
    console.log('');
    
    // 6. Email con script + invitación (combinado)
    console.log('6️⃣ Enviando email combinado (script + invitación)...');
    const combinedResult = await emailService.sendEmbedScriptEmail({
      email: TEST_EMAIL,
      name: TEST_NAME,
      domain: 'www.ejemplo-combinado.com',
      script: `<script src="https://cookie21.com/embed.js" data-client-id="combo-123"></script>`,
      clientName: 'Cookie21 Combo',
      invitationInfo: {
        token: 'combo-invitation-token-' + Date.now(),
        url: 'https://app.cookie21.com/invitacion/combo-token-123'
      },
      sendDirect: true // Forzar envío real
    });
    results.push({ type: 'Combinado (Script + Invitación)', ...combinedResult });
    console.log('   Resultado:', combinedResult.success ? '✅ Éxito' : '❌ Error');
    if (combinedResult.error) console.log('   Error:', combinedResult.error);
    console.log('');
    
    // Resumen final
    console.log('\n================================');
    console.log('📊 RESUMEN DE ENVÍOS');
    console.log('================================');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Exitosos: ${successful}`);
    console.log(`❌ Fallidos: ${failed}`);
    console.log('\nDetalle:');
    
    results.forEach(result => {
      console.log(`\n${result.type}:`);
      console.log(`  - Estado: ${result.success ? '✅ Enviado' : '❌ Error'}`);
      if (result.jobId) console.log(`  - ID: ${result.jobId}`);
      if (result.previewUrl) console.log(`  - Preview: ${result.previewUrl}`);
      if (result.error) console.log(`  - Error: ${result.error}`);
      if (result.simulado) console.log(`  - ⚠️  Modo simulación`);
    });
    
    console.log('\n✨ Proceso completado');
    console.log(`📬 Revisa tu bandeja de entrada en: ${TEST_EMAIL}`);
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

// Ejecutar el script
console.log('🚀 Iniciando envío de emails de prueba...\n');
sendAllEmails().then(() => {
  console.log('\n👋 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});