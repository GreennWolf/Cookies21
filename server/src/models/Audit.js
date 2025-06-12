// models/Audit.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditSchema = new Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Client'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // No required, ya que pueden haber acciones sin usuario autenticado
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'generate', 'consent', 'view', 'cancel_subscription', 'reactivate_subscription'],
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    index: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  context: {
    type: Schema.Types.Mixed,
    default: {}
  },
  legalProof: {
    consentVersion: String,  // Versión del texto legal presentado
    consentText: String,     // Hash del texto mostrado
    displayedTexts: [{       // Textos específicos mostrados
      section: String,
      content: String,
      language: String
    }],
    verificationHash: String, // Hash de todo el registro
    timestamp: {
      iso: String,
      unix: Number,
      precision: String     // 'millisecond', etc.
    }
  },
  
  // Seguridad y cumplimiento
  securityInfo: {
    digitalSignature: String, // Firma de datos para integridad
    accessLog: [{             // Quién accedió a esta información
      userId: mongoose.Schema.Types.ObjectId,
      timestamp: Date,
      action: String,
      ipAddress: String
    }],
    modificationHistory: [{
      field: String,
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
      userId: mongoose.Schema.Types.ObjectId,
      timestamp: Date
    }]
  },
  
  // Contexto administrativo
  adminContext: {
    changeReason: String,    // Razón del cambio
    regulatoryReference: String, // Referencia normativa
    approvalChain: [{        // Cadena de aprobación
      userId: mongoose.Schema.Types.ObjectId,
      role: String,
      timestamp: Date,
      comments: String
    }]
  },
  
  // Detección de riesgos
  riskAssessment: {
    complianceScore: Number, // Puntuación automática de cumplimiento
    flaggedIssues: [{
      issueType: String,
      severity: String,
      description: String,
      regulationReference: String
    }],
    automaticChecks: [{
      checkName: String,
      passed: Boolean,
      details: String
    }]
  }
}, {
  // Opciones del esquema
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  collection: 'audits'
});

// Índices compuestos para optimizar consultas comunes
AuditSchema.index({ clientId: 1, timestamp: -1 });
AuditSchema.index({ resourceType: 1, resourceId: 1 });
AuditSchema.index({ clientId: 1, action: 1 });

module.exports = mongoose.model('Audit', AuditSchema);