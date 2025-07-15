// models/UserAccount.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userAccountSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    // El clientId no es requerido para usuarios owner
    required: function() {
      return this.role !== 'owner';
    }
  },
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\S+@\S+\.\S+$/,
      'Por favor ingresa un email válido'
    ]
  },
  password: {
    type: String,
    // La contraseña es requerida si el usuario no está pendiente
    required: function() {
      return this.status !== 'pending';
    },
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    select: false
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer'],
    default: 'viewer'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'active'
  },
  accessControl: {
    lastLogin: Date,
    failedAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    allowedDomains: [String],
    ipRestrictions: [String]
  },
  customPermissions: {
    enabled: {
      type: Boolean,
      default: false
    },
    permissions: [
      {
        resource: String,
        actions: [String]
      }
    ]
  },
  security: {
    passwordResetToken: String,
    passwordResetExpires: Date,
    invitationToken: String,
    invitationExpires: Date,
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: String
  },
  preferences: {
    language: {
      type: String,
      enum: ['es', 'en', 'fr', 'de', 'it', 'pt', 'nl'],
      default: 'es'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      clientCreation: {
        enabled: {
          type: Boolean,
          default: false
        },
        emailAddress: {
          type: String,
          // Por defecto será el email del usuario, pero puede ser personalizado
          validate: {
            validator: function(v) {
              // Solo validar si está presente
              if (!v) return true;
              return /^\S+@\S+\.\S+$/.test(v);
            },
            message: 'Por favor ingresa un email válido para notificaciones'
          }
        }
      }
    }
  }
}, {
  timestamps: true,
  // Asegurar que los subdocumentos se guarden correctamente
  minimize: false
});

// Middleware para hashear la contraseña antes de guardar
userAccountSchema.pre('save', async function(next) {
  // Solo hashear la contraseña si ha sido modificada (o es nueva) y existe
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para verificar contraseña
userAccountSchema.methods.verifyPassword = async function(candidatePassword) {
  if (!this.password) return false;
  
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error en verifyPassword:', error);
    return false;
  }
};

// Método para generar token de reseteo de contraseña
userAccountSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.security = this.security || {};
  this.security.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.security.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutos
  
  return resetToken;
};

// Método para generar token de invitación
userAccountSchema.methods.createInvitationToken = function() {
  const invitationToken = crypto.randomBytes(32).toString('hex');
  
  this.security = this.security || {};
  this.security.invitationToken = crypto
    .createHash('sha256')
    .update(invitationToken)
    .digest('hex');
  
  this.security.invitationExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 días
  
  return invitationToken;
};

// Método para verificar permiso
userAccountSchema.methods.hasPermission = function(resource, action) {
  // Los roles owner y admin siempre tienen todos los permisos
  if (this.role === 'owner' || this.role === 'admin') {
    return true;
  }
  
  // Si no hay permisos personalizados, usar permisos basados en rol
  if (!this.customPermissions || !this.customPermissions.enabled) {
    return this.hasRolePermission(resource, action);
  }
  
  // Verificar permisos personalizados
  const resourcePermission = this.customPermissions.permissions.find(p => p.resource === resource);
  return resourcePermission && resourcePermission.actions.includes(action);
};

// Método para verificar permiso basado en rol
userAccountSchema.methods.hasRolePermission = function(resource, action) {
  // Definir permisos por rol
  const rolePermissions = {
    editor: {
      domains: ['read', 'create', 'update'],
      banner: ['read', 'create', 'update'],
      cookies: ['read', 'update'],
      analytics: ['read']
    },
    viewer: {
      domains: ['read'],
      banner: ['read'],
      cookies: ['read'],
      analytics: ['read']
    }
  };
  
  const permissions = rolePermissions[this.role];
  if (!permissions) return false;
  
  const actions = permissions[resource];
  return actions && actions.includes(action);
};

// Método para verificar acceso a dominio
userAccountSchema.methods.canAccessDomain = function(domainId) {
  // El owner y admin siempre pueden acceder a todos los dominios
  if (this.role === 'owner' || this.role === 'admin') {
    return true;
  }
  
  // Verificar restricciones de dominio si existen
  if (this.accessControl && this.accessControl.allowedDomains && this.accessControl.allowedDomains.length > 0) {
    return this.accessControl.allowedDomains.includes(domainId.toString());
  }
  
  // Por defecto permitir acceso
  return true;
};

// Método estático para verificar límites de usuarios por cliente
userAccountSchema.statics.checkUserLimits = async function(clientId) {
  const Client = mongoose.model('Client');
  const client = await Client.findById(clientId);
  
  if (!client) {
    throw new Error('Cliente no encontrado');
  }
  
  const userCount = await this.countDocuments({ clientId });
  
  return {
    canInvite: userCount < client.subscription.maxUsers,
    remainingSlots: client.subscription.maxUsers - userCount
  };
};

const UserAccount = mongoose.model('UserAccount', userAccountSchema);

module.exports = UserAccount;