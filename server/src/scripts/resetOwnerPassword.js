/**
 * Script mejorado para resetear la contraseña del usuario owner
 * 
 * Este script hace más que simplemente cambiar la contraseña:
 * 1. Actualiza la contraseña con un hash correcto de bcrypt
 * 2. Verifica manualmente que la contraseña nueva se pueda validar
 * 3. Asegura que todos los campos necesarios existan (accessControl, security)
 * 4. Garantiza que el estado sea 'active'
 * 
 * Ejecutar con: node scripts/resetOwnerPassword.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.dev') });

// Importamos el modelo UserAccount
const UserAccount = require('../models/UserAccount');

// Función principal
async function resetOwnerPassword() {
  console.log('🔌 Conectando a la base de datos...');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conexión exitosa a la base de datos.');

    // 1. Primero verificamos si existe el usuario owner
    const ownerUser = await UserAccount.findOne({ role: 'owner' });
    
    if (!ownerUser) {
      console.error('❌ ERROR: No se encontró ningún usuario con rol "owner" en la base de datos.');
      process.exit(1);
    }
    
    console.log('\n📋 INFORMACIÓN DEL USUARIO OWNER:');
    console.log(`ID: ${ownerUser._id}`);
    console.log(`Email: ${ownerUser.email}`);
    console.log(`Nombre: ${ownerUser.name}`);
    console.log(`Estado actual: ${ownerUser.status}`);
    
    // Verificar hash actual de la contraseña
    console.log('\n🔍 ANÁLISIS DE LA CONTRASEÑA ACTUAL:');
    if (ownerUser.password) {
      console.log(`Hash actual: ${ownerUser.password.substring(0, 10)}... (${ownerUser.password.length} caracteres)`);
      console.log(`¿Es un hash bcrypt válido? ${ownerUser.password.startsWith('$2') ? 'SÍ' : 'NO'}`);
    } else {
      console.log('⚠️ No hay contraseña almacenada para este usuario');
    }
    
    // 2. Generar una nueva contraseña simple y su hash
    const newPassword = 'Ssaw34177234.';
    console.log(`\n🔑 Generando nueva contraseña: ${newPassword}`);
    
    // Generar hash de la contraseña
    const salt = await bcrypt.genSalt(12);
    console.log(`🧂 Salt generado: ${salt}`);
    
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    console.log(`🔒 Hash generado: ${hashedPassword.substring(0, 10)}... (${hashedPassword.length} caracteres)`);
    
    // 3. Verificar que el hash se pueda validar
    console.log('\n🔍 VERIFICANDO VALIDACIÓN DEL HASH:');
    try {
      const testVerify = await bcrypt.compare(newPassword, hashedPassword);
      console.log(`Verificación del nuevo hash: ${testVerify ? '✅ ÉXITO' : '❌ FALLO'}`);
      
      if (!testVerify) {
        console.error('❌ ERROR: La nueva contraseña no puede ser validada con su hash. Hay un problema con bcrypt.');
        process.exit(1);
      }
    } catch (verifyError) {
      console.error(`❌ ERROR en verificación: ${verifyError.message}`);
      process.exit(1);
    }
    
    // 4. Actualizar contraseña y estado
    console.log('\n🔄 ACTUALIZANDO USUARIO:');
    
    ownerUser.password = hashedPassword; // Usamos directamente el hash
    
    // Verificar estado
    if (ownerUser.status !== 'active') {
      console.log(`⚠️ El usuario owner no tiene estado "active" (actual: ${ownerUser.status}), actualizando...`);
      ownerUser.status = 'active';
    }
    
    // Asegurarse de que exista el campo accessControl
    if (!ownerUser.accessControl) {
      console.log('⚠️ Campo accessControl no existía, inicializando...');
      ownerUser.accessControl = {
        allowedDomains: [],
        ipRestrictions: [],
        failedAttempts: 0
      };
    } else {
      // Resetear contadores de intentos fallidos
      ownerUser.accessControl.failedAttempts = 0;
      ownerUser.accessControl.lockUntil = undefined;
      console.log('✅ Contadores de intentos fallidos reseteados');
    }
    
    // Asegurarse de que exista el campo security
    if (!ownerUser.security) {
      console.log('⚠️ Campo security no existía, inicializando...');
      ownerUser.security = {
        mfaEnabled: false
      };
    }
    
    // 5. Guardar cambios
    console.log('💾 Guardando cambios...');
    
    // Usar findByIdAndUpdate para evitar middlewares que puedan re-hashear la contraseña
    const updateResult = await UserAccount.findByIdAndUpdate(
      ownerUser._id,
      {
        $set: {
          password: hashedPassword,
          status: 'active',
          accessControl: ownerUser.accessControl,
          security: ownerUser.security
        }
      },
      { new: true }
    );
    
    console.log(`✅ Usuario actualizado: ${updateResult ? 'SÍ' : 'NO'}`);
    
    console.log('\n🎉 CONTRASEÑA RESETEADA EXITOSAMENTE');
    console.log('-----------------------------------');
    console.log(`Email: ${ownerUser.email}`);
    console.log(`Nueva contraseña: ${newPassword}`);
    console.log('-----------------------------------');
    console.log('Intenta iniciar sesión nuevamente con estas credenciales.');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
}

// Ejecutar la función
resetOwnerPassword();