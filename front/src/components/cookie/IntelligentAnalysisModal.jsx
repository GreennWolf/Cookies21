import React, { useState } from 'react';
import { X, Brain, Shield, AlertTriangle, CheckCircle, User, Tag, BarChart3, Clock } from 'lucide-react';

const IntelligentAnalysisModal = ({ isOpen, onClose, results }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !results) return null;

  const { summary, cookies, metadata } = results;

  // Función para obtener el color del nivel de riesgo
  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Función para obtener el color del propósito
  const getPurposeColor = (purpose) => {
    switch (purpose) {
      case 'necessary': return 'text-blue-600 bg-blue-100';
      case 'functional': return 'text-purple-600 bg-purple-100';
      case 'analytics': return 'text-green-600 bg-green-100';
      case 'advertising': return 'text-red-600 bg-red-100';
      case 'personalization': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-emerald-600 to-cyan-600 text-white">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Análisis Inteligente - {summary.domain}</h2>
              <p className="text-emerald-100 text-sm">
                Clasificación automática con IA • {summary.totalCookies} cookies analizadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Resumen General
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'cookies'
                ? 'border-emerald-500 text-emerald-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Cookies Detalladas
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'compliance'
                ? 'border-emerald-500 text-emerald-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Cumplimiento GDPR
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'vendors'
                ? 'border-emerald-500 text-emerald-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Vendors Detectados
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Total Cookies</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{summary.totalCookies}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Compliance</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{summary.compliance.complianceRate}%</p>
                </div>

                <div className={`p-4 rounded-lg ${getRiskColor(summary.riskAssessment).replace('text-', 'bg-').replace('-600', '-50')}`}>
                  <div className="flex items-center space-x-2">
                    <Shield className={`w-5 h-5 ${getRiskColor(summary.riskAssessment).split(' ')[0]}`} />
                    <span className={`text-sm font-medium ${getRiskColor(summary.riskAssessment).split(' ')[0].replace('-600', '-800')}`}>
                      Nivel de Riesgo
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${getRiskColor(summary.riskAssessment).split(' ')[0].replace('-600', '-900')}`}>
                    {summary.riskAssessment.charAt(0).toUpperCase() + summary.riskAssessment.slice(1)}
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Vendors</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{summary.topVendors?.length || 0}</p>
                </div>
              </div>

              {/* Distribución por propósito */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Distribución por Propósito</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(summary.byPurpose || {}).map(([purpose, count]) => (
                    <div key={purpose} className="text-center">
                      <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold ${getPurposeColor(purpose)}`}>
                        {count}
                      </div>
                      <p className="text-xs mt-2 capitalize">{purpose}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Vendors */}
              {summary.topVendors && summary.topVendors.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Top Vendors Detectados</h3>
                  <div className="space-y-2">
                    {summary.topVendors.slice(0, 5).map((vendor, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <span className="font-medium">{vendor.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{vendor.count} cookies</span>
                          <div className="flex space-x-1">
                            {vendor.purposes?.map((purpose, i) => (
                              <span key={i} className={`px-2 py-1 text-xs rounded ${getPurposeColor(purpose)}`}>
                                {purpose}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cookies Tab */}
          {activeTab === 'cookies' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cookies Analizadas ({cookies?.length || 0})</h3>
              <div className="space-y-3">
                {cookies?.slice(0, 20).map((cookie, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{cookie.features.name}</h4>
                        <p className="text-sm text-gray-600">{cookie.features.domain}</p>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs rounded ${getPurposeColor(cookie.classification.purpose)}`}>
                          {cookie.classification.purpose}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${getRiskColor(cookie.compliance.riskLevel)}`}>
                          {cookie.compliance.riskLevel}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong>Vendor:</strong> {cookie.vendor.name}
                        {cookie.vendor.iabId && (
                          <span className="text-gray-500"> (IAB: {cookie.vendor.iabId})</span>
                        )}
                      </div>
                      <div>
                        <strong>Confianza:</strong> {Math.round(cookie.classification.confidence * 100)}%
                      </div>
                      <div>
                        <strong>Duración:</strong> {
                          cookie.features.duration === -1 
                            ? 'Sesión' 
                            : `${Math.round(cookie.features.duration / 86400)} días`
                        }
                      </div>
                    </div>

                    {cookie.compliance.violations?.length > 0 && (
                      <div className="mt-3 p-2 bg-red-50 rounded border-l-4 border-red-400">
                        <p className="text-sm text-red-800">
                          <strong>Violaciones:</strong> {cookie.compliance.violations.map(v => v.message).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Estado del Cumplimiento</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Cookies Cumpliendo:</span>
                      <span className="font-medium">{summary.compliance.compliant}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Violaciones:</span>
                      <span className="font-medium text-red-600">{summary.compliance.violations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Advertencias:</span>
                      <span className="font-medium text-yellow-600">{summary.compliance.warnings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Necesitan Consentimiento:</span>
                      <span className="font-medium">{summary.compliance.needsConsent}</span>
                    </div>
                  </div>
                </div>

                {summary.criticalIssues && summary.criticalIssues.length > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span>Problemas Críticos</span>
                    </h3>
                    <div className="space-y-2">
                      {summary.criticalIssues.slice(0, 5).map((issue, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded border-l-4 border-red-400">
                          <p className="font-medium text-red-800">{issue.type}</p>
                          <p className="text-sm text-red-600">{issue.description}</p>
                          <p className="text-xs text-red-500 mt-1">{issue.count} ocurrencias</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vendors Tab */}
          {activeTab === 'vendors' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vendors Detectados</h3>
              {summary.topVendors && summary.topVendors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summary.topVendors.map((vendor, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium text-lg mb-2">{vendor.name}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Cookies:</span>
                          <span className="font-medium">{vendor.count}</span>
                        </div>
                        <div>
                          <span>Propósitos:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {vendor.purposes?.map((purpose, i) => (
                              <span key={i} className={`px-2 py-1 text-xs rounded ${getPurposeColor(purpose)}`}>
                                {purpose}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No se detectaron vendors conocidos</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Análisis: {metadata?.analysisTime ? `${metadata.analysisTime}ms` : 'N/A'}</span>
            </div>
            <div>
              Versión: {metadata?.version || '2.0'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntelligentAnalysisModal;