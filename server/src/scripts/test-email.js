// scripts/test-email.js
/**
 * Script para probar la configuración de email directamente
 * Uso: node scripts/test-email.js
 */

require('dotenv').config({ path: '../../.env' }); // Cargar variables de entorno
const nodemailer = require('nodemailer');

// Función para mostrar información de las variables de entorno
function showEnvironmentInfo() {
  console.log('🔍 Variables de entorno para email:');
  console.log(`  EMAIL_HOST: ${process.env.EMAIL_HOST || 'No configurado'}`);
  console.log(`  EMAIL_PORT: ${process.env.EMAIL_PORT || 'No configurado'}`);
  console.log(`  EMAIL_USER: ${process.env.EMAIL_USER || 'No configurado'}`);
  console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM || 'No configurado'}`);
  console.log(`  EMAIL_PASS: ${process.env.EMAIL_PASS ? '****[Configurado]****' : '❌ No configurado'}`);
  console.log('\n');
}

// Función para probar la conexión SMTP
async function testSMTPConnection() {
  console.log('🔄 Probando conexión SMTP...');
  
  try {
    // Verificar que tenemos las variables necesarias
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Faltan variables de entorno requeridas para la conexión SMTP');
    }
    
    // Crear transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      debug: true, // Habilitar logs detallados
      logger: true,
      tls: {
        rejectUnauthorized: false // Ignorar problemas de certificados
      }
    });
    
    console.log('🔄 Verificando conexión...');
    const verifyResult = await transporter.verify();
    console.log('✅ Conexión SMTP verificada:', verifyResult);
    
    // Preguntar si desea enviar email de prueba
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('📧 ¿Desea enviar un email de prueba? (s/n): ', async (answer) => {
      if (answer.toLowerCase() === 's') {
        readline.question('📧 Ingrese el email de destino: ', async (email) => {
          try {
            await sendTestEmail(transporter, email);
            readline.close();
            process.exit(0);
          } catch (error) {
            console.error('❌ Error al enviar email:', error);
            readline.close();
            process.exit(1);
          }
        });
      } else {
        console.log('👋 Prueba finalizada sin enviar email.');
        readline.close();
        process.exit(0);
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error al probar conexión SMTP:', error);
    console.error('Detalles adicionales:', {
      name: error.name,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    });
    return false;
  }
}

// Función para enviar un email de prueba
async function sendTestEmail(transporter, to) {
  console.log(`🔄 Enviando email de prueba a ${to}...`);
  
  try {
    const fromEmail = process.env.EMAIL_FROM || `"Test" <${process.env.EMAIL_USER}>`;
    
    // Enviar email
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject: `Email de prueba - ${new Date().toLocaleTimeString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <h2 style="color: #235C88;">Email de prueba desde Cookie21</h2>
          <p>Este es un email de prueba enviado el ${new Date().toLocaleString()}.</p>
          <p>Si estás recibiendo este mensaje, la configuración SMTP está funcionando correctamente.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
          <p><strong>Configuración:</strong></p>
          <ul>
            <li>Host: ${process.env.EMAIL_HOST}</li>
            <li>Puerto: ${process.env.EMAIL_PORT}</li>
            <li>Usuario: ${process.env.EMAIL_USER}</li>
            <li>Remitente: ${fromEmail}</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} Cookie21. Todos los derechos reservados.</p>
        </div>
      `,
      text: `
        Email de prueba desde Cookie21
        
        Este es un email de prueba enviado el ${new Date().toLocaleString()}.
        
        Si estás recibiendo este mensaje, la configuración SMTP está funcionando correctamente.
        
        Configuración:
        - Host: ${process.env.EMAIL_HOST}
        - Puerto: ${process.env.EMAIL_PORT}
        - Usuario: ${process.env.EMAIL_USER}
        - Remitente: ${fromEmail}
        
        © ${new Date().getFullYear()} Cookie21. Todos los derechos reservados.
      `
    });
    
    console.log('✅ Email enviado correctamente');
    console.log('  ID del mensaje:', info.messageId);
    console.log('  Respuesta:', info.response);
    
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email de prueba:', error);
    console.error('Detalles adicionales:', {
      name: error.name,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    });
    throw error;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando prueba de email...\n');
  
  try {
    // Mostrar información de las variables de entorno
    showEnvironmentInfo();
    
    // Probar configuración SMTP alternativa
    if (process.argv.includes('--alt')) {
      console.log('🔧 Probando con configuración alternativa (puerto 587)...');
      
      // Usar configuración alternativa con puerto 587
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_HOST = process.env.EMAIL_HOST || 'cookie21.com';
      
      console.log(`  Host: ${process.env.EMAIL_HOST}`);
      console.log(`  Puerto: ${process.env.EMAIL_PORT}`);
      console.log(`  Usuario: ${process.env.EMAIL_USER}\n`);
    }
    
    // Probar conexión SMTP
    await testSMTPConnection();
    
  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

// Ejecutar el script
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});