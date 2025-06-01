#!/usr/bin/env node

const { MongoClient } = require('mongodb');

async function setupDatabase() {
  console.log('🗄️  CONFIGURACIÓN DE BASE DE DATOS');
  console.log('================================');
  
  const username = 'wolf';
  const password = 'Ssaw34177234.';
  const host = 'localhost';
  const port = '27017';
  
  // URIs para diferentes bases de datos
  const databases = [
    { name: 'cookies21', uri: `mongodb://${username}:${password}@${host}:${port}/cookies21` },
    { name: 'cookies21_dev', uri: `mongodb://${username}:${password}@${host}:${port}/cookies21_dev` }
  ];
  
  for (const db of databases) {
    console.log(`\n🔍 Verificando base de datos: ${db.name}`);
    
    try {
      const client = new MongoClient(db.uri);
      await client.connect();
      
      console.log(`✅ Conexión exitosa a ${db.name}`);
      
      // Verificar algunas colecciones
      const database = client.db();
      const collections = await database.listCollections().toArray();
      
      console.log(`📊 Colecciones encontradas: ${collections.length}`);
      if (collections.length > 0) {
        collections.forEach(col => console.log(`   - ${col.name}`));
      } else {
        console.log('   (Base de datos vacía - se creará automáticamente)');
      }
      
      await client.close();
      
    } catch (error) {
      console.log(`❌ Error conectando a ${db.name}:`);
      console.log(`   ${error.message}`);
      
      if (error.message.includes('Authentication failed')) {
        console.log('💡 Problema de autenticación. Verificar:');
        console.log('   1. Usuario existe en MongoDB');
        console.log('   2. Contraseña es correcta');
        console.log('   3. Usuario tiene permisos en la base de datos');
      }
    }
  }
  
  console.log('\n💡 COMANDOS ÚTILES DE MONGODB:');
  console.log('================================');
  console.log('# Conectar a MongoDB:');
  console.log(`mongosh mongodb://${username}:${password}@${host}:${port}/cookies21`);
  console.log('');
  console.log('# Verificar usuario:');
  console.log('db.runCommand({usersInfo: "wolf"})');
  console.log('');
  console.log('# Crear usuario si no existe:');
  console.log('use admin');
  console.log('db.createUser({');
  console.log('  user: "wolf",');
  console.log('  pwd: "Ssaw34177234.",');
  console.log('  roles: ["root"]');
  console.log('})');
  console.log('');
  console.log('# Listar bases de datos:');
  console.log('show dbs');
}

setupDatabase().catch(console.error);