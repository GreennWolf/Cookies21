// scripts/send-direct-email.js
/**
 * Script para probar el envío directo de emails con Cookie21
 * Ejecutar: node scripts/send-direct-email.js destinatario@ejemplo.com
 */

require('dotenv').config({ path: '../../.env' });
const emailService = require('../services/email.service');

// Colores para los logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para imprimir encabezado con colores
function printHeader(text) {
  console.log('\n' + colors.bright + colors.blue + '='.repeat(50) + colors.reset);
  console.log(colors.bright + colors.blue + text + colors.reset);
  console.log(colors.bright + colors.blue + '='.repeat(50) + colors.reset + '\n');
}

// Función para imprimir éxito con colores
function printSuccess(text) {
  console.log(colors.bright + colors.green + '✓ ' + text + colors.reset);
}

// Función para imprimir error con colores
function printError(text) {
  console.log(colors.bright + colors.red + '✗ ' + text + colors.reset);
}

// Función para imprimir info con colores
function printInfo(text) {
  console.log(colors.bright + colors.cyan + 'ℹ ' + text + colors.reset);
}

// Función para probar diferentes tipos de email
async function testEmail() {
  // Obtener el destinatario de los argumentos de línea de comandos
  const recipient = process.argv[2];
  if (!recipient) {
    printError('Debe proporcionar un destinatario de email como argumento.');
    console.log(`Uso: node ${process.argv[1]} destinatario@ejemplo.com`);
    process.exit(1);
  }

  printHeader(`PRUEBA DE ENVÍO DE EMAIL A ${recipient}`);
  printInfo('Verificando variables de entorno...');
  
  // Verificar variables de entorno
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    printError('Variables de entorno incompletas para el servicio de email.');
    console.log('Por favor asegúrate de tener configuradas:');
    console.log(' - EMAIL_HOST');
    console.log(' - EMAIL_PORT');
    console.log(' - EMAIL_USER');
    console.log(' - EMAIL_PASS');
    console.log(' - EMAIL_FROM (opcional)');
    process.exit(1);
  }

  printInfo('Variables de entorno encontradas:');
  console.log(`  HOST: ${process.env.EMAIL_HOST}`);
  console.log(`  PORT: ${process.env.EMAIL_PORT}`);
  console.log(`  USER: ${process.env.EMAIL_USER}`);
  console.log(`  FROM: ${process.env.EMAIL_FROM || 'No configurado (usará USER)'}`);
  console.log(`  PASS: ${'*'.repeat(8)}`);

  // Probar la conexión al servidor SMTP
  printHeader('PROBANDO CONEXIÓN SMTP');
  
  try {
    const connectionResult = await emailService.testConnection();
    
    if (connectionResult.success) {
      printSuccess('Conexión SMTP exitosa');
      if (connectionResult.emailSent) {
        printSuccess('Email de prueba enviado correctamente');
        console.log(`  ID del mensaje: ${connectionResult.messageId}`);
      }
    } else {
      printError('Error al probar la conexión SMTP');
      console.log('Detalles del error:', connectionResult.error);
      process.exit(1);
    }
  } catch (error) {
    printError('Error al probar la conexión SMTP');
    console.error(error);
    process.exit(1);
  }

  // Enviar un email de invitación
  printHeader('ENVIANDO EMAIL DE INVITACIÓN');
  
  try {
    const invitationResult = await emailService.sendInvitationEmail({
      email: recipient,
      name: 'Usuario de Prueba',
      invitationToken: 'test-token-' + Date.now(),
      clientName: 'Cookie21',
      role: 'admin',
      sendDirect: true
    });
    
    if (invitationResult.success) {
      printSuccess('Email de invitación enviado correctamente');
      console.log(`  ID del mensaje: ${invitationResult.jobId}`);
      if (invitationResult.previewUrl) {
        console.log(`  Previsualización: ${invitationResult.previewUrl}`);
      }
    } else {
      printError('Error al enviar email de invitación');
      console.log('Detalles del error:', invitationResult.error);
    }
  } catch (error) {
    printError('Error al enviar email de invitación');
    console.error(error);
  }

  // Enviar un email de bienvenida
  printHeader('ENVIANDO EMAIL DE BIENVENIDA');
  
  try {
    const welcomeResult = await emailService.sendWelcomeEmail({
      email: recipient,
      name: 'Usuario de Prueba',
      clientName: 'Cookie21'
    });
    
    if (welcomeResult.success) {
      printSuccess('Email de bienvenida enviado correctamente');
      console.log(`  ID del mensaje: ${welcomeResult.jobId}`);
      if (welcomeResult.previewUrl) {
        console.log(`  Previsualización: ${welcomeResult.previewUrl}`);
      }
    } else {
      printError('Error al enviar email de bienvenida');
      console.log('Detalles del error:', welcomeResult.error);
    }
  } catch (error) {
    printError('Error al enviar email de bienvenida');
    console.error(error);
  }

  // Enviar un email con la plantilla de Cookie21
  printHeader('ENVIANDO EMAIL CON PLANTILLA COOKIE21');
  
  try {
    const cookie21Result = await emailService.sendCookies21Email({
      email: recipient,
      name: 'Usuario de Prueba',
      subject: 'Prueba de plantilla Cookie21',
      message: '<p>Este es un mensaje de prueba enviado desde el script de prueba.</p><p>Si ves este mensaje, la configuración de email está funcionando correctamente.</p>',
      buttonText: 'Visitar Cookie21',
      buttonUrl: 'https://cookie21.com',
      clientName: 'Cookie21'
    });
    
    if (cookie21Result.success) {
      printSuccess('Email con plantilla Cookie21 enviado correctamente');
      console.log(`  ID del mensaje: ${cookie21Result.jobId}`);
      if (cookie21Result.previewUrl) {
        console.log(`  Previsualización: ${cookie21Result.previewUrl}`);
      }
    } else {
      printError('Error al enviar email con plantilla Cookie21');
      console.log('Detalles del error:', cookie21Result.error);
    }
  } catch (error) {
    printError('Error al enviar email con plantilla Cookie21');
    console.error(error);
  }

  printHeader('PRUEBAS FINALIZADAS');
  console.log('Revisa tu bandeja de entrada y carpeta de spam para verificar los emails.');
}

// Ejecutar las pruebas
testEmail().catch(error => {
  printError('Error general en las pruebas');
  console.error(error);
  process.exit(1);
});