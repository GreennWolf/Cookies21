require('dotenv').config();
const mongoose = require('mongoose');
const BannerTemplate = require('../src/models/BannerTemplate');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error de conexión MongoDB:', error);
    process.exit(1);
  }
};

const fixSystemTemplates = async () => {
  try {
    // Buscar todas las plantillas del sistema
    const systemTemplates = await BannerTemplate.find({ type: 'system' });
    
    console.log(`\n📊 Plantillas del sistema encontradas: ${systemTemplates.length}`);
    
    for (const template of systemTemplates) {
      console.log(`\n🔍 Revisando plantilla: ${template.name}`);
      console.log(`   ID: ${template._id}`);
      console.log(`   Tipo: ${template.type}`);
      console.log(`   Estado: ${template.status}`);
      console.log(`   isPublic: ${template.metadata?.isPublic}`);
      
      // Actualizar para que sea pública y activa
      const updates = {};
      
      if (template.status !== 'active') {
        updates.status = 'active';
        console.log(`   ⚡ Actualizando estado a 'active'`);
      }
      
      if (!template.metadata || template.metadata.isPublic !== true) {
        updates.metadata = {
          ...template.metadata,
          isPublic: true
        };
        console.log(`   ⚡ Actualizando metadata.isPublic a true`);
      }
      
      if (Object.keys(updates).length > 0) {
        await BannerTemplate.updateOne(
          { _id: template._id },
          { $set: updates }
        );
        console.log(`   ✅ Plantilla actualizada`);
      } else {
        console.log(`   ✅ Plantilla ya está configurada correctamente`);
      }
    }
    
    // Verificar el resultado
    const publicSystemTemplates = await BannerTemplate.find({
      type: 'system',
      status: 'active',
      'metadata.isPublic': true
    });
    
    console.log(`\n✨ Total de plantillas del sistema públicas y activas: ${publicSystemTemplates.length}`);
    
    if (publicSystemTemplates.length > 0) {
      console.log('\n📋 Plantillas del sistema disponibles:');
      publicSystemTemplates.forEach(t => {
        console.log(`   - ${t.name} (ID: ${t._id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error al actualizar plantillas:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixSystemTemplates();
  await mongoose.disconnect();
  console.log('\n👋 Desconectado de MongoDB');
};

main();