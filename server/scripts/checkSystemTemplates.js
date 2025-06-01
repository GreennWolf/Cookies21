// scripts/checkSystemTemplates.js
require('dotenv').config();
const mongoose = require('mongoose');
const BannerTemplate = require('../src/models/BannerTemplate');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error de conexión MongoDB:', error);
    process.exit(1);
  }
};

const checkSystemTemplates = async () => {
  try {
    console.log('🔍 Verificando templates en la base de datos...\n');
    
    // 1. Obtener todos los templates
    const allTemplates = await BannerTemplate.find({});
    console.log(`📊 Total de templates en la BD: ${allTemplates.length}`);
    
    if (allTemplates.length === 0) {
      console.log('❌ No hay ningún template en la base de datos');
      return;
    }
    
    // 2. Analizar por tipo
    const systemTemplates = allTemplates.filter(t => t.type === 'system');
    const customTemplates = allTemplates.filter(t => t.type === 'custom');
    
    console.log(`🔧 Templates de sistema: ${systemTemplates.length}`);
    console.log(`👤 Templates personalizados: ${customTemplates.length}`);
    console.log('');
    
    // 3. Analizar templates del sistema en detalle
    if (systemTemplates.length > 0) {
      console.log('📋 TEMPLATES DEL SISTEMA ENCONTRADOS:');
      console.log('='.repeat(50));
      
      systemTemplates.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   ID: ${template._id}`);
        console.log(`   Tipo: ${template.type}`);
        console.log(`   Estado: ${template.status}`);
        console.log(`   Público: ${template.metadata?.isPublic ? 'Sí' : 'No'}`);
        console.log(`   Creado: ${template.createdAt}`);
        console.log(`   Componentes: ${template.components?.length || 0}`);
        console.log('');
      });
      
      // 4. Verificar cuáles cumplen los criterios para aparecer en getSystemTemplates
      const validSystemTemplates = systemTemplates.filter(t => 
        t.type === 'system' && 
        t.status === 'active' && 
        t.metadata?.isPublic === true
      );
      
      console.log('🎯 TEMPLATES QUE DEBERÍAN APARECER EN getSystemTemplates:');
      console.log('='.repeat(55));
      console.log(`Total válidos: ${validSystemTemplates.length}`);
      
      if (validSystemTemplates.length > 0) {
        validSystemTemplates.forEach((template, index) => {
          console.log(`${index + 1}. ${template.name} (ID: ${template._id})`);
        });
      } else {
        console.log('❌ Ningún template del sistema cumple todos los criterios:');
        console.log('   - type: "system"');
        console.log('   - status: "active"');
        console.log('   - metadata.isPublic: true');
        console.log('');
        
        // Mostrar por qué cada template no es válido
        systemTemplates.forEach((template, index) => {
          console.log(`${index + 1}. ${template.name}:`);
          if (template.type !== 'system') {
            console.log(`   ❌ Tipo incorrecto: "${template.type}" (debe ser "system")`);
          }
          if (template.status !== 'active') {
            console.log(`   ❌ Estado incorrecto: "${template.status}" (debe ser "active")`);
          }
          if (template.metadata?.isPublic !== true) {
            console.log(`   ❌ No es público: ${template.metadata?.isPublic} (debe ser true)`);
          }
          console.log('');
        });
      }
    } else {
      console.log('❌ No hay templates del sistema en la base de datos');
      console.log('');
      console.log('📝 Para crear templates del sistema, ejecute:');
      console.log('   node scripts/createSystemTemplate.js');
    }
    
    // 5. Mostrar algunos templates personalizados como referencia
    if (customTemplates.length > 0) {
      console.log('👤 ALGUNOS TEMPLATES PERSONALIZADOS:');
      console.log('='.repeat(40));
      customTemplates.slice(0, 3).forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   Cliente: ${template.clientId || 'Sin cliente'}`);
        console.log(`   Estado: ${template.status}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error verificando templates:', error);
  }
};

const main = async () => {
  try {
    await connectDB();
    await checkSystemTemplates();
    console.log('🎉 Verificación completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  }
};

main();