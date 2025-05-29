const mongoose = require('mongoose');
const logger = require('../utils/logger');

const mongooseOptions = {
  autoIndex: process.env.NODE_ENV !== 'production',
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: process.env.MONGODB_RETRY_WRITES === 'true'
};

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB ya está conectada');
      return;
    }

    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('URI de MongoDB no configurada');
    }

    await mongoose.connect(mongoURI, mongooseOptions);
    
    // Configurar hooks globales
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', false);
    }

    // Validar conexión
    await mongoose.connection.db.admin().ping();
    logger.info('MongoDB conectada exitosamente');

  } catch (error) {
    logger.error('Error al conectar con MongoDB:', error);
    throw error; // Propagar error para manejo en servidor
  }
};

module.exports = {
  connectDB,
  mongoose
};