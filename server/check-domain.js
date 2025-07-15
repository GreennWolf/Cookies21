const mongoose = require('mongoose');
require('./src/config/database');

async function checkDomain() {
  try {
    const Domain = require('./src/models/Domain');
    const domain = await Domain.findById('684050ecaa28cd25f0be84cb').populate('clientId');
    
    console.log('Dominio encontrado:');
    console.log('- ID:', domain?._id);
    console.log('- URL:', domain?.url);
    console.log('- ClientId field:', domain?.clientId);
    console.log('- Cliente asociado:', domain?.clientId ? {
      id: domain.clientId._id,
      name: domain.clientId.name,
      status: domain.clientId.status
    } : 'NO ENCONTRADO');
    
    if (domain && !domain.clientId) {
      console.log('⚠️  El dominio existe pero NO tiene clientId asignado');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDomain();