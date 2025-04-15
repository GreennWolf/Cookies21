const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Definición de permisos por recurso
const PERMISSIONS = {
  users: ['create', 'read', 'update', 'delete'],
  subscription: ['read', 'update'],
  apiKeys: ['create', 'read', 'revoke'],
  domains: ['create', 'read', 'update', 'delete'],
  banner: ['create', 'read', 'update', 'delete'],
  cookies: ['create', 'read', 'update', 'delete'],
  analytics: ['read'],
  settings: ['read', 'update']
};

// Definición de roles y sus permisos
const ROLE_PERMISSIONS = {
  admin: {
    users: ['create', 'read', 'update', 'delete'],
    subscription: ['read', 'update'],
    apiKeys: ['create', 'read', 'revoke'],
    domains: ['create', 'read', 'update', 'delete'],
    banner: ['create', 'read', 'update', 'delete'],
    cookies: ['create', 'read', 'update', 'delete'],
    analytics: ['read'],
    settings: ['read', 'update']
  },
  editor: {
    users: ['read'],
    subscription: ['read'],
    apiKeys: ['read'],
    domains: ['read', 'update'],
    banner: ['read', 'update'],
    cookies: ['create', 'read', 'update'],
    analytics: ['read'],
    settings: ['read', 'update']
  },
  viewer: {
    users: [],
    subscription: [],
    apiKeys: [],
    domains: ['read'],
    banner: ['read'],
    cookies: ['read'],
    analytics: ['read'],
    settings: ['read']
  }
};

const userAccountSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido']
  },
  password: {
    type: String,
    required: true,
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'pending'
  },
  customPermissions: {
    enabled: {
      type: Boolean,
      default: false
    },
    permissions: [{
      resource: {
        type: String,
        enum: Object.keys(PERMISSIONS)
      },
      actions: [{
        type: String,
        enum: ['create', 'read', 'update', 'delete', 'revoke']
      }]
    }]
  },
  accessControl: {
    allowedDomains: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Domain'
    }],
    ipRestrictions: [String],
    lastLogin: Date,
    failedAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: String,
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: true
      }
    },
    dashboardLayout: Object
  },
  security: {
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: String,
    recoveryKeys: [String],
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.security.mfaSecret;
      delete ret.security.recoveryKeys;
      delete ret.security.passwordResetToken;
      return ret;
    }
  }
});

// Índices
userAccountSchema.index({ clientId: 1 });
userAccountSchema.index({ status: 1 });
userAccountSchema.index({ 'security.passwordResetToken': 1 });

// Middleware pre-save
userAccountSchema.pre('save', async function(next) {
  // Hash password si fue modificada
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
    this.security.passwordChangedAt = new Date();
  }

  // Validar permisos personalizados
  if (this.customPermissions.enabled) {
    const rolePerms = ROLE_PERMISSIONS[this.role];
    this.customPermissions.permissions.forEach(perm => {
      const allowedActions = rolePerms[perm.resource] || [];
      perm.actions = perm.actions.filter(action => allowedActions.includes(action));
    });
  }

  next();
});

// Métodos de instancia
userAccountSchema.methods = {
  // Verificar password
  async verifyPassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  },

  // Verificar permisos
  hasPermission(resource, action) {
    if (this.customPermissions.enabled) {
      const resourcePerms = this.customPermissions.permissions
        .find(p => p.resource === resource);
      return resourcePerms && resourcePerms.actions.includes(action);
    }
    return ROLE_PERMISSIONS[this.role][resource]?.includes(action) || false;
  },

  // Generar token de reset de password
  createPasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.security.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    this.security.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    return resetToken;
  },

  // Configurar MFA
  async setupMFA() {
    const secret = crypto.randomBytes(20).toString('hex');
    const recoveryKeys = Array(8).fill(null).map(() => 
      crypto.randomBytes(10).toString('hex')
    );
    
    this.security.mfaSecret = secret;
    this.security.recoveryKeys = recoveryKeys;
    this.security.mfaEnabled = true;
    
    await this.save();
    return { secret, recoveryKeys };
  },

  // Verificar acceso a dominio
  canAccessDomain(domainId) {
    if (this.accessControl.allowedDomains.length === 0) return true;
    return this.accessControl.allowedDomains.some(d => 
      d.toString() === domainId.toString()
    );
  }
};

// Métodos estáticos
userAccountSchema.statics = {
  // Obtener usuarios por cliente
  async getClientUsers(clientId) {
    return this.find({ 
      clientId,
      status: 'active'
    }).select('-security');
  },

  // Verificar si existe admin
  async hasAdmin(clientId) {
    return await this.exists({
      clientId,
      role: 'admin',
      status: 'active'
    });
  },

  // Validar restricciones de invitación
  async validateInvitation(clientId, role, inviterId) {
    const inviter = await this.findById(inviterId);
    if (!inviter || inviter.role !== 'admin') {
      throw new Error('Solo administradores pueden invitar usuarios');
    }

    const userCount = await this.countDocuments({ clientId });
    const client = await mongoose.model('Client').findById(clientId);
    
    return {
      canInvite: userCount < client.subscription.maxUsers,
      remainingSlots: client.subscription.maxUsers - userCount
    };
  }
};

module.exports = mongoose.model('UserAccount', userAccountSchema);