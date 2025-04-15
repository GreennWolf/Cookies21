const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  apiKeys: [{
    key: {
      type: String,
      unique: true
    },
    name: {
      type: String,
      default: 'Default'
    },
    permissions: [{
      type: String,
      enum: ['read', 'write', 'admin']
    }],
    domains: [{
      type: String,
      lowercase: true,
      trim: true
    }],
    lastUsed: Date,
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active'
    },
    createdAt: Date,
    expiresAt: Date
  }],
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    allowedDomains: {
      type: Number,
      default: 1
    },
    features: {
      autoTranslate: {
        type: Boolean,
        default: true
      },
      cookieScanning: {
        type: Boolean,
        default: true
      },
      customization: {
        type: Boolean,
        default: true
      }
    },
    startDate: Date,
    endDate: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  company: {
    name: String,
    website: String,
    size: String,
    industry: String
  },
  settings: {
    defaultLanguage: {
      type: String,
      default: 'en'
    },
    notificationEmail: String,
    timezone: String
  }
}, { 
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

clientSchema.index({ status: 1 });

clientSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

clientSchema.methods.generateApiKey = async function(options = {}) {
  const {
    name = 'Default',
    permissions = ['read'],
    domains = [],
    expiresIn = null
  } = options;

  const buffer = crypto.randomBytes(32);
  const timestamp = Date.now().toString(36);
  const prefix = 'cmp';
  const key = `${prefix}_${buffer.toString('hex')}_${timestamp}`;

  const apiKey = {
    key,
    name,
    permissions,
    domains,
    status: 'active',
    createdAt: new Date(),
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null
  };

  this.apiKeys.push(apiKey);
  await this.save();

  return apiKey;
};

clientSchema.statics.validateApiKey = async function(apiKey) {
  const client = await this.findOne({
    'apiKeys.key': apiKey,
    'apiKeys.status': 'active',
    status: 'active'
  });

  if (!client) return null;

  const key = client.apiKeys.find(k => k.key === apiKey);

  if (key.expiresAt && key.expiresAt < new Date()) {
    key.status = 'revoked';
    await client.save();
    return null;
  }

  key.lastUsed = new Date();
  await client.save();

  return {
    clientId: client._id,
    permissions: key.permissions,
    domains: key.domains
  };
};

clientSchema.methods.revokeApiKey = async function(apiKey) {
  const key = this.apiKeys.find(k => k.key === apiKey);
  if (key) {
    key.status = 'revoked';
    await this.save();
    return true;
  }
  return false;
};

clientSchema.methods.validateDomain = function(domain) {
  const activeKeys = this.apiKeys.filter(k => k.status === 'active');
  return activeKeys.some(key => 
    key.domains.length === 0 || 
    key.domains.includes(domain.toLowerCase())
  );
};

clientSchema.methods.verifyPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

clientSchema.methods.checkSubscriptionLimits = async function() {
  const domainCount = await mongoose.model('Domain').countDocuments({
    clientId: this._id
  });

  return {
    domainsUsed: domainCount,
    domainsLimit: this.subscription.allowedDomains,
    canAddMoreDomains: domainCount < this.subscription.allowedDomains
  };
};

module.exports = mongoose.model('Client', clientSchema);