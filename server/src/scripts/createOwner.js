/**
 * Script para crear un usuario "owner" (super-administrador)
 * 
 * Uso:
 * node scripts/createOwner.js
 * 
 * También acepta variables de entorno:
 * OWNER_EMAIL - Email del owner (default: owner@yoursystem.com)
 * OWNER_NAME - Nombre del owner (default: System Owner)
 * OWNER_PASSWORD - Contraseña inicial (default: generada automáticamente)
 */

const mongoose = require('mongoose');
const UserAccount = require('../models/UserAccount');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

// Función para generar una contraseña segura
const generateSecurePassword = () => {
  const length = 12;
  const uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  
  const allChars = uppercaseLetters + lowercaseLetters + numbers + specialChars;
  
  // Asegurar que haya al menos uno de cada tipo
  let password = '';
  password += uppercaseLetters.charAt(Math.floor(Math.random() * uppercaseLetters.length));
  password += lowercaseLetters.charAt(Math.floor(Math.random() * lowercaseLetters.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Completar con caracteres aleatorios hasta la longitud deseada
  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Mezclar los caracteres (Fisher-Yates shuffle)
  password = password.split('');
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  return password.join('');
};

// Ejecutar el script
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Conectado a la base de datos');
    
    try {
      // Verificar si ya existe un owner
      const existingOwner = await UserAccount.findOne({ role: 'owner' });
      
      if (existingOwner) {
        console.log('¡ATENCIÓN! Ya existe un usuario owner en el sistema:');
        console.log(`Email: ${existingOwner.email}`);
        console.log(`Nombre: ${existingOwner.name}`);
        console.log(`Creado: ${existingOwner.createdAt}`);
        process.exit(0);
      }
      
      // Obtener valores de environment o usar defaults
      const email = process.env.OWNER_EMAIL || 'owner@yoursystem.com';
      const name = process.env.OWNER_NAME || 'System Owner';
      const password = process.env.OWNER_PASSWORD || generateSecurePassword();
      
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Crear el usuario owner
      const owner = await UserAccount.create({
        name,
        email,
        password: hashedPassword,
        role: 'owner',
        status: 'active',
        security: {
          mfaEnabled: false,
          passwordChangedAt: new Date()
        }
      });
      
      console.log('¡Usuario owner creado exitosamente!');
      console.log('-----------------------------------');
      console.log(`ID: ${owner._id}`);
      console.log(`Email: ${owner.email}`);
      console.log(`Nombre: ${owner.name}`);
      console.log(`Contraseña: ${password}`);
      console.log('-----------------------------------');
      console.log('IMPORTANTE: Guarde esta información en un lugar seguro.');
      console.log('Se recomienda cambiar la contraseña después del primer inicio de sesión.');
      
      process.exit(0);
    } catch (error) {
      console.error('Error al crear el usuario owner:', error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error al conectar con la base de datos:', err);
    process.exit(1);
  });