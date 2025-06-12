const mongoose = require('mongoose');

const subscriptionRenewalRequestSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAccount',
    required: true
  },
  requestType: {
    type: String,
    enum: ['renewal', 'reactivation', 'upgrade', 'support'],
    required: true
  },
  currentSubscriptionStatus: {
    type: String,
    enum: ['expired', 'cancelled', 'suspended', 'active'],
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  contactPreference: {
    type: String,
    enum: ['email', 'phone'],
    default: 'email'
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rejected'],
    default: 'pending',
    index: true
  },
  adminNotes: {
    type: String,
    maxlength: 2000
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAccount'
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAccount'
  }
}, {
  timestamps: true
});

// Índices compuestos para consultas frecuentes
subscriptionRenewalRequestSchema.index({ clientId: 1, status: 1 });
subscriptionRenewalRequestSchema.index({ status: 1, createdAt: -1 });
subscriptionRenewalRequestSchema.index({ requestedBy: 1, createdAt: -1 });

// Método para obtener el estado de la solicitud más reciente de un cliente
subscriptionRenewalRequestSchema.statics.getLatestRequestForClient = async function(clientId) {
  return this.findOne({ 
    clientId, 
    status: { $in: ['pending', 'in_progress'] } 
  })
  .populate('requestedBy', 'name email')
  .sort({ createdAt: -1 });
};

// Método para marcar como procesada
subscriptionRenewalRequestSchema.methods.markAsProcessed = function(resolvedBy, adminNotes = '') {
  this.status = 'completed';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.adminNotes = adminNotes;
  return this.save();
};

// Virtual para tiempo transcurrido
subscriptionRenewalRequestSchema.virtual('timeElapsed').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    return 'Hace menos de 1 hora';
  } else if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }
});

subscriptionRenewalRequestSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('SubscriptionRenewalRequest', subscriptionRenewalRequestSchema);