/**
 * Script para habilitar notificaciones de creación de clientes para el owner
 */

const mongoose = require('mongoose');
const UserAccount = require('./src/models/UserAccount');
require('dotenv').config();

async function enableClientNotifications() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar el usuario owner
    const owner = await UserAccount.findOne({ role: 'owner' });
    
    if (!owner) {
      console.log('❌ No se encontró ningún usuario owner');
      return;
    }

    console.log(`📧 Configurando notificaciones para: ${owner.name} (${owner.email})`);

    // Habilitar notificaciones de creación de clientes
    await UserAccount.findByIdAndUpdate(owner._id, {
      $set: {
        'preferences.notifications.clientCreation.enabled': true,
        'preferences.notifications.clientCreation.emailAddress': owner.email
      }
    });

    console.log('✅ Notificaciones de creación de clientes habilitadas');

    // Verificar la actualización
    const updatedOwner = await UserAccount.findById(owner._id).select('preferences.notifications.clientCreation');
    console.log('📋 Configuración actual:', updatedOwner.preferences.notifications.clientCreation);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  enableClientNotifications();
}

module.exports = enableClientNotifications;