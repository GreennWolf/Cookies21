// models/Client.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  // Campo principal de email
  contactEmail: {
    type: String,
    required: [true, 'El email de contacto es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\S+@\S+\.\S+$/,
      'Por favor ingresa un email válido'
    ]
  },
  // Campo alternativo email (para mantener compatibilidad con el índice existente)
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true, // Permite valores nulos sin considerarlos duplicados
    index: true
  },
  password: {
    type: String,
    required: false,
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    select: false
  },
  company: {
    type: String,
    trim: true
  },
  // Nueva sección para información fiscal española
  fiscalInfo: {
    cif: {
      type: String,
      trim: true
    },
    razonSocial: {
      type: String,
      trim: true
    },
    direccion: {
      type: String,
      trim: true
    },
    codigoPostal: {
      type: String,
      trim: true
    },
    poblacion: {
      type: String,
      trim: true
    },
    provincia: {
      type: String,
      trim: true
    },
    pais: {
      type: String,
      default: 'España',
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  subscription: {
    plan: {
      type: String,
      default: 'basic'
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    maxUsers: {
      type: Number,
      default: 5
    },
    currentUsers: {
      type: Number,
      default: 1
    },
    features: {
      autoTranslate: { type: Boolean, default: true },
      cookieScanning: { type: Boolean, default: true },
      customization: { type: Boolean, default: true }
    },
    isUnlimited: {
      type: Boolean,
      default: false
    }
  },
  domains: [{
    type: String,
    trim: true
  }],
  security: {
    passwordResetToken: String,
    passwordResetExpires: Date,
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: String
  },
  apiKeys: [{
    key: {
      type: String,
      sparse: true
    },
    name: String,
    permissions: [String],
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: Date,
    ipRestrictions: [String]
  }]
}, {
  timestamps: true
});

// Crear un índice único y sparse para el campo apiKeys.key
clientSchema.index({ 'apiKeys.key': 1 }, { unique: true, sparse: true });

// Middleware para hashear la contraseña antes de guardar
clientSchema.pre('save', async function(next) {
  // Solo hashear la contraseña si ha sido modificada (o es nueva)
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para asegurar que el campo email coincida con contactEmail
clientSchema.pre('save', function(next) {
  // Sincronizar email con contactEmail para mantener compatibilidad
  if (this.contactEmail && (!this.email || this.email !== this.contactEmail)) {
    this.email = this.contactEmail;
  }
  next();
});

// Middleware para generar una API key por defecto si no existe ninguna
clientSchema.pre('save', function(next) {
  // Solo generar API key para nuevos clientes (isNew) y si no tienen ninguna API key
  if (this.isNew && (!this.apiKeys || this.apiKeys.length === 0)) {
    const key = crypto.randomBytes(32).toString('base64url');
    
    this.apiKeys = [{
      key,
      name: 'Default API Key',
      permissions: ['read'],
      createdAt: Date.now(),
      ipRestrictions: []
    }];
  }
  next();
});

// Método para verificar contraseña
clientSchema.methods.verifyPassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para generar token de reseteo de contraseña
clientSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.security.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.security.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutos
  
  return resetToken;
};

// Método para generar una API key
clientSchema.methods.generateApiKey = async function(options = {}) {
  const key = crypto.randomBytes(32).toString('base64url');
  
  const apiKey = {
    key,
    name: options.name || 'API Key',
    permissions: options.permissions || ['read'],
    createdAt: Date.now(),
    ipRestrictions: options.ipRestrictions || []
  };
  
  this.apiKeys.push(apiKey);
  await this.save();
  
  return apiKey;
};

// Método estático para validar una API key
clientSchema.statics.validateApiKey = async function(apiKey) {
  const client = await this.findOne({
    'apiKeys.key': apiKey,
    status: 'active'
  });
  
  if (!client) return null;
  
  const keyInfo = client.apiKeys.find(k => k.key === apiKey);
  if (!keyInfo) return null;
  
  // Actualizar lastUsed
  keyInfo.lastUsed = Date.now();
  await client.save();
  
  return {
    clientId: client._id,
    permissions: keyInfo.permissions,
    ipRestrictions: keyInfo.ipRestrictions,
    domains: client.domains
  };
};

// Método para verificar límites de suscripción (para dominios y usuarios)
clientSchema.methods.checkSubscriptionLimits = async function() {
  const UserAccount = mongoose.model('UserAccount');
  
  // Contar usuarios actuales
  const usersCount = await UserAccount.countDocuments({ clientId: this._id });
  
  // Actualizar contador de usuarios
  this.subscription.currentUsers = usersCount;
  await this.save();
  
  // Contar dominios actuales
  const domainsCount = this.domains.length;
  
  return {
    // Verificar si puede agregar más usuarios
    canAddMoreUsers: this.subscription.isUnlimited || usersCount < this.subscription.maxUsers,
    // Verificar si puede agregar más dominios
    // (para dominios, probablemente querrás tener un límite específico o recuperarlo del plan)
    canAddMoreDomains: this.subscription.isUnlimited || domainsCount < 10, // Ejemplo: límite de 10 dominios
    // Información actual
    currentUsers: usersCount,
    maxUsers: this.subscription.maxUsers,
    currentDomains: domainsCount,
    isUnlimited: this.subscription.isUnlimited
  };
};

// Método para actualizar la suscripción desde un plan
clientSchema.methods.updateFromPlan = async function(plan, options = {}) {
  const SubscriptionPlan = mongoose.model('SubscriptionPlan');
  
  // Si se proporcionó un ID de plan, obtenerlo
  let subscriptionPlan = plan;
  if (typeof plan === 'string') {
    subscriptionPlan = await SubscriptionPlan.findById(plan);
    if (!subscriptionPlan) {
      throw new Error('Plan de suscripción no encontrado');
    }
  }
  
  // Actualizar detalles de la suscripción
  this.subscription.plan = subscriptionPlan.name.toLowerCase();
  this.subscription.planId = subscriptionPlan._id;
  
  // Fechas de inicio/fin
  if (options.startDate) {
    this.subscription.startDate = new Date(options.startDate);
  }
  
  // Usar isUnlimited del plan o de las opciones
  this.subscription.isUnlimited = 
    options.isUnlimited !== undefined ? options.isUnlimited : subscriptionPlan.limits.isUnlimitedUsers;
  
  // Si es ilimitado, configurar fecha lejana, de lo contrario usar endDate o calcular basado en el plan
  if (this.subscription.isUnlimited) {
    this.subscription.endDate = new Date(2099, 11, 31);
  } else if (options.endDate) {
    this.subscription.endDate = new Date(options.endDate);
  }
  
  // Configurar usuarios máximos (usar el valor del plan o un valor personalizado)
  this.subscription.maxUsers = 
    options.maxUsers || subscriptionPlan.limits.maxUsers;
  
  // Actualizar características
  this.subscription.features = {
    autoTranslate: subscriptionPlan.features.autoTranslate,
    cookieScanning: subscriptionPlan.features.cookieScanning,
    customization: subscriptionPlan.features.customization
  };
  
  // Guardar cambios
  await this.save();
  
  return this.subscription;
};

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;