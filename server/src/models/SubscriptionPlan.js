// models/SubscriptionPlan.js
const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del plan es requerido'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  // Los límites del plan
  limits: {
    maxUsers: {
      type: Number,
      required: true,
      min: 1,
      default: 5
    },
    // Si isUnlimitedUsers es true, maxUsers se ignora
    isUnlimitedUsers: {
      type: Boolean,
      default: false
    },
    maxDomains: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    // Si isUnlimitedDomains es true, maxDomains se ignora
    isUnlimitedDomains: {
      type: Boolean,
      default: false
    }
  },
  // Características activadas para el plan
  features: {
    autoTranslate: {
      type: Boolean,
      default: false
    },
    cookieScanning: {
      type: Boolean,
      default: true
    },
    customization: {
      type: Boolean,
      default: false
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    multiLanguage: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    }
  },
  // Información de precio (opcional)
  pricing: {
    enabled: {
      type: Boolean,
      default: true
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'MXN'],
      default: 'USD'
    },
    amount: {
      type: Number,
      min: 0,
      default: 0
    },
    interval: {
      type: String,
      enum: ['monthly', 'quarterly', 'annually', 'custom'],
      default: 'monthly'
    },
    customDays: {
      type: Number,
      min: 1,
      default: null
    }
  },
  // Metadatos para la UI
  metadata: {
    color: {
      type: String,
      default: '#3498db'
    },
    icon: String,
    displayOrder: {
      type: Number,
      default: 99
    },
    isRecommended: {
      type: Boolean,
      default: false
    },
    tags: [String]
  }
}, {
  timestamps: true
});

// Método para verificar si un cliente con este plan puede agregar más usuarios
subscriptionPlanSchema.methods.canAddMoreUsers = function(currentUsers) {
  if (this.limits.isUnlimitedUsers) return true;
  return currentUsers < this.limits.maxUsers;
};

// Método para verificar si un cliente con este plan puede agregar más dominios
subscriptionPlanSchema.methods.canAddMoreDomains = function(currentDomains) {
  if (this.limits.isUnlimitedDomains) return true;
  return currentDomains < this.limits.maxDomains;
};

// Método para clonar un plan (útil para crear planes similares)
subscriptionPlanSchema.methods.clone = async function(newName) {
  const planData = this.toObject();
  
  // Remover campos que no deben clonarse
  delete planData._id;
  delete planData.id;
  delete planData.createdAt;
  delete planData.updatedAt;
  
  // Establecer nuevo nombre
  planData.name = newName || `${this.name} (copia)`;
  
  // Crear y devolver el nuevo plan
  return await this.constructor.create(planData);
};

// Método estático para crear planes predeterminados
subscriptionPlanSchema.statics.createDefaultPlans = async function() {
  const defaultPlans = [
    {
      name: 'Básico',
      description: 'Plan básico para pequeñas empresas',
      limits: {
        maxUsers: 5,
        isUnlimitedUsers: false,
        maxDomains: 1,
        isUnlimitedDomains: false
      },
      features: {
        autoTranslate: false,
        cookieScanning: true,
        customization: false,
        advancedAnalytics: false,
        multiLanguage: false,
        apiAccess: false,
        prioritySupport: false
      },
      pricing: {
        enabled: true,
        amount: 29,
        currency: 'USD',
        interval: 'monthly'
      },
      metadata: {
        color: '#3498db',
        displayOrder: 1,
        isRecommended: false
      }
    },
    {
      name: 'Estándar',
      description: 'Plan recomendado para empresas en crecimiento',
      limits: {
        maxUsers: 10,
        isUnlimitedUsers: false,
        maxDomains: 5,
        isUnlimitedDomains: false
      },
      features: {
        autoTranslate: true,
        cookieScanning: true,
        customization: true,
        advancedAnalytics: false,
        multiLanguage: true,
        apiAccess: true,
        prioritySupport: false
      },
      pricing: {
        enabled: true,
        amount: 99,
        currency: 'USD',
        interval: 'monthly'
      },
      metadata: {
        color: '#2ecc71',
        displayOrder: 2,
        isRecommended: true
      }
    },
    {
      name: 'Premium',
      description: 'Plan completo para empresas exigentes',
      limits: {
        maxUsers: 25,
        isUnlimitedUsers: false,
        maxDomains: 15,
        isUnlimitedDomains: false
      },
      features: {
        autoTranslate: true,
        cookieScanning: true,
        customization: true,
        advancedAnalytics: true,
        multiLanguage: true,
        apiAccess: true,
        prioritySupport: true
      },
      pricing: {
        enabled: true,
        amount: 199,
        currency: 'USD',
        interval: 'monthly'
      },
      metadata: {
        color: '#9b59b6',
        displayOrder: 3,
        isRecommended: false
      }
    },
    {
      name: 'Enterprise',
      description: 'Plan personalizado para grandes empresas',
      limits: {
        maxUsers: 50,
        isUnlimitedUsers: true,
        maxDomains: 30,
        isUnlimitedDomains: true
      },
      features: {
        autoTranslate: true,
        cookieScanning: true,
        customization: true,
        advancedAnalytics: true,
        multiLanguage: true,
        apiAccess: true,
        prioritySupport: true
      },
      pricing: {
        enabled: false,  // Precio personalizado, contactar con ventas
        amount: 0,
        currency: 'USD',
        interval: 'monthly'
      },
      metadata: {
        color: '#e74c3c',
        displayOrder: 4,
        isRecommended: false
      }
    }
  ];

  // Verificar si ya existen planes
  const count = await this.countDocuments();
  if (count === 0) {
    await this.insertMany(defaultPlans);
    console.log('Planes predeterminados creados');
  }
};

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan;