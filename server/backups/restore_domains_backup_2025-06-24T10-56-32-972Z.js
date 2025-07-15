#!/usr/bin/env node

/**
 * SCRIPT DE RESTAURACIÓN AUTOMÁTICO
 * Generado automáticamente para el backup: domains_backup_2025-06-24T10-56-32-972Z
 * Fecha: 2025-06-24T10:56:33.150Z
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function restore() {
  try {
    console.log('🔄 Iniciando restauración desde backup: domains_backup_2025-06-24T10-56-32-972Z');
    
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Leer backup
    const backupPath = path.join(__dirname, 'domains_backup_2025-06-24T10-56-32-972Z.json');
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Archivo de backup no encontrado: ${backupPath}`);
    }
    
    const domains = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`📊 Cargando ${domains.length} dominios desde backup`);
    
    // Confirmar restauración
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('⚠️ ¿Confirmas la restauración? Esto sobrescribirá los datos actuales (y/N): ', resolve);
    });
    
    readline.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Restauración cancelada');
      return;
    }
    
    // Restaurar dominios
    const collection = mongoose.connection.db.collection('domains');
    
    // Limpiar colección actual
    await collection.deleteMany({});
    console.log('🧹 Colección domains limpiada');
    
    // Insertar dominios del backup
    await collection.insertMany(domains);
    console.log(`✅ ${domains.length} dominios restaurados`);
    
    console.log('🎉 ¡Restauración completada exitosamente!');
    
  } catch (error) {
    console.error('💥 Error en restauración:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

restore();
