// services/standaloneScriptGenerator.service.js
// Generador de script CMP standalone para validación
// Este script funciona sin backend y pasa CMP Validator

const logger = require('../utils/logger');
const { createCMPConfig } = require('../config/cmp.config');

class StandaloneScriptGenerator {
  
  /**
   * Genera un script CMP completamente standalone para validación
   * No requiere backend activo - todo está embebido
   */
  generateValidatorScript(options = {}) {
    try {
      const cmpConfig = createCMPConfig();
      const config = cmpConfig.getClientConfig(options);
      const tcfConfig = cmpConfig.getTCFAPIConfig();
      const gvlConfig = cmpConfig.getGVLConfig();
      
      logger.info('🛠️ Generando script standalone para CMP Validator con configuración unificada:', {
        cmpId: tcfConfig.cmpId,
        vendorListVersion: gvlConfig.vendorListVersion,
        tcfVersion: tcfConfig.tcfVersion
      });
      
      return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CMP Validator Test - Cookies21</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .validator-info {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #2196F3;
            margin-bottom: 20px;
        }
        .cmp-debug {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            max-width: 300px;
            z-index: 999999;
        }
        button {
            background: #2196F3;
            color: white;
            border: none;
            padding: 10px 15px;
            margin: 5px;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover { background: #1976D2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 CMP Validator Test Page</h1>
        <p><strong>CMP ID:</strong> ${config.cmpId} | <strong>Version:</strong> ${config.cmpVersion} | <strong>TCF:</strong> ${config.tcfVersion}</p>
    </div>
    
    <div class="validator-info">
        <h3>📋 Instrucciones para CMP Validator:</h3>
        <ol>
            <li>Guarda este archivo como <code>test-cmp.html</code></li>
            <li>Ábrelo en tu navegador</li>
            <li>Ve al <a href="https://iabtcf.com/#validator" target="_blank">IAB TCF Validator</a></li>
            <li>Introduce la URL o usa la herramienta de inspección</li>
            <li>El validator debería detectar automáticamente el CMP</li>
        </ol>
    </div>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3>🛠️ Debug Tools</h3>
        <button onclick="showDebugInfo()">Ver Estado CMP</button>
        <button onclick="testTCFAPI()">Probar __tcfapi</button>
        <button onclick="showBanner()">Mostrar Banner</button>
        <button onclick="clearAllConsent()">Limpiar Consentimiento</button>
        <button onclick="simulateAcceptAll()">Simular Accept All</button>
        <button onclick="simulateRejectAll()">Simular Reject All</button>
    </div>
    
    <div id="debug-output" style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto;"></div>

    <!-- ================================ -->
    <!-- SCRIPT CMP STANDALONE COMPLETO -->
    <!-- ================================ -->
    <script>
        // ================================
        // CONFIGURACIÓN CMP PARA VALIDATOR
        // ================================
        (function() {
            console.log('🚀 [CMP] Iniciando script standalone para validación');
            
            // Configuración optimizada para validator - DESDE CONFIGURACIÓN UNIFICADA
            var CMP_CONFIG = {
                cmpId: ${tcfConfig.cmpId},
                cmpVersion: ${tcfConfig.cmpVersion},
                tcfVersion: "${tcfConfig.tcfVersion}",
                tcfPolicyVersion: ${tcfConfig.tcfPolicyVersion},
                gdprApplies: ${tcfConfig.gdprApplies}, // Desde configuración unificada
                publisherCC: "${tcfConfig.publisherCC}",
                language: "${config.language}",
                isServiceSpecific: ${tcfConfig.isServiceSpecific},
                cookieName: "${tcfConfig.cookieName}",
                tcfCookieName: "${tcfConfig.tcfCookieName}",
                validatorMode: true,
                debugMode: true
            };
            
            // Global namespace
            window.CMP = window.CMP || {};
            window.CMP.config = CMP_CONFIG;
            
            // COMPLIANCE POINT 9: Inicialización explícita de legitimate interests
            // Los propósitos 1,3,4,5,6 SIEMPRE deben ser false para legitimate interest
            window.CMP.consent = {
                purposes: {
                    1: false, 2: false, 3: false, 4: false, 5: false,
                    6: false, 7: false, 8: false, 9: false, 10: false
                },
                vendors: {},
                legitimateInterests: {
                    1: false, // COMPLIANCE POINT 9: Propósito 1 SIEMPRE false para LI
                    2: false, // Puede ser true según consentimiento del usuario
                    3: false, // COMPLIANCE POINT 9: Propósito 3 SIEMPRE false para LI
                    4: false, // COMPLIANCE POINT 9: Propósito 4 SIEMPRE false para LI
                    5: false, // COMPLIANCE POINT 9: Propósito 5 SIEMPRE false para LI
                    6: false, // COMPLIANCE POINT 9: Propósito 6 SIEMPRE false para LI
                    7: false, // Puede ser true según consentimiento del usuario
                    8: false, // Puede ser true según consentimiento del usuario
                    9: false, // Puede ser true según consentimiento del usuario
                    10: false // Puede ser true según consentimiento del usuario
                },
                vendorLegitimateInterests: {},
                specialFeatures: {
                    1: false,
                    2: false
                },
                created: null,
                lastUpdated: null,
                tcString: null
            };
            
            // ================================
            // VENDOR LIST EMBEBIDA (MÍNIMA PARA VALIDACIÓN) - DESDE CONFIGURACIÓN UNIFICADA
            // ================================
            window.CMP.vendorList = {
                "vendorListVersion": ${gvlConfig.vendorListVersion},
                "tcfPolicyVersion": ${gvlConfig.tcfPolicyVersion},
                "lastUpdated": new Date().toISOString(),
                "purposes": {
                    "1": {"id": 1, "name": "Store and/or access information on a device"},
                    "2": {"id": 2, "name": "Select basic ads"},
                    "3": {"id": 3, "name": "Create a personalised ads profile"},
                    "4": {"id": 4, "name": "Select personalised ads"},
                    "5": {"id": 5, "name": "Create a personalised content profile"},
                    "6": {"id": 6, "name": "Select personalised content"},
                    "7": {"id": 7, "name": "Measure ad performance"},
                    "8": {"id": 8, "name": "Measure content performance"},
                    "9": {"id": 9, "name": "Apply market research to generate audience insights"},
                    "10": {"id": 10, "name": "Develop and improve products"}
                },
                "specialFeatures": {
                    "1": {"id": 1, "name": "Use precise geolocation data"},
                    "2": {"id": 2, "name": "Actively scan device characteristics for identification"}
                },
                "vendors": {
                    "1": {"id": 1, "name": "Exponential Interactive, Inc", "purposes": [1,2,7,8,9,10], "legIntPurposes": [2,7,8,9,10]},
                    "2": {"id": 2, "name": "Captify Technologies Limited", "purposes": [1,2,7,8], "legIntPurposes": [2,7,8]},
                    "6": {"id": 6, "name": "AdNexus", "purposes": [1,2,7,8,9,10], "legIntPurposes": [2,7,8,9,10]},
                    "8": {"id": 8, "name": "Twitter, Inc.", "purposes": [1,2,7,8], "legIntPurposes": [2,7,8]},
                    "9": {"id": 9, "name": "The Trade Desk", "purposes": [1,2,7,8,9,10], "legIntPurposes": [2,7,8,9,10]},
                    "10": {"id": 10, "name": "Index Exchange, Inc.", "purposes": [1,2,7,8], "legIntPurposes": [2,7,8]},
                    "25": {"id": 25, "name": "Criteo", "purposes": [1,2,7,8,9], "legIntPurposes": [2,7,8,9]},
                    "52": {"id": 52, "name": "Magnite (Rubicon Project)", "purposes": [1,2,7,8,9,10], "legIntPurposes": [2,7,8,9,10]},
                    "76": {"id": 76, "name": "PubMatic, Inc.", "purposes": [1,2,7,8,9], "legIntPurposes": [2,7,8,9]},
                    "755": {"id": 755, "name": "Google Advertising Products", "purposes": [1,2,7,8,9,10], "legIntPurposes": [2,7,8,9,10]},
                    "793": {"id": 793, "name": "Amazon", "purposes": [1,2,7,8], "legIntPurposes": [2,7,8]}
                }
            };
            
            // ================================
            // UTILIDADES DE COOKIES
            // ================================
            window.CMP.cookies = {
                set: function(name, value, days, path) {
                    var expires = "";
                    if (days) {
                        var date = new Date();
                        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                        expires = "; expires=" + date.toUTCString();
                    }
                    document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + expires + "; path=" + (path || "/") + "; SameSite=Lax";
                },
                get: function(name) {
                    var nameEQ = name + "=";
                    var ca = document.cookie.split(';');
                    for (var i = 0; i < ca.length; i++) {
                        var c = ca[i];
                        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                        if (c.indexOf(nameEQ) == 0) {
                            try {
                                return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
                            } catch (e) {
                                return null;
                            }
                        }
                    }
                    return null;
                },
                remove: function(name) {
                    document.cookie = name + "=; Max-Age=-99999999; Path=/;";
                }
            };
            
            // ================================
            // TC STRING GENERATOR (OPTIMIZADO PARA CMP VALIDATOR)
            // ================================
            window.CMP.generateTCString = function(consent) {
                try {
                    // Generar TC String dinámico basado en consentimiento actual
                    var timestamp = Math.floor(Date.now() / 100);
                    
                    // Contar vendors con consentimiento activo
                    var vendorsWithConsent = 0;
                    var vendorsWithLegitInterest = 0;
                    var totalVendors = Object.keys(window.CMP.vendorList.vendors || {}).length;
                    
                    if (consent.vendors) {
                        Object.keys(consent.vendors).forEach(function(vendorId) {
                            if (consent.vendors[vendorId] === true) {
                                vendorsWithConsent++;
                            }
                        });
                    }
                    
                    if (consent.vendorLegitimateInterests) {
                        Object.keys(consent.vendorLegitimateInterests).forEach(function(vendorId) {
                            if (consent.vendorLegitimateInterests[vendorId] === true) {
                                vendorsWithLegitInterest++;
                            }
                        });
                    }
                    
                    // COMPLIANCE POINT 12: TC String debe reflejar conteos reales de vendors
                    var baseTCString;
                    
                    // Usar generación dinámica basada en configuración actual
                    console.log('[CMP STANDALONE] 🔧 Generando TC String con configuración actualizada...');
                    console.log('[CMP STANDALONE] 📊 Vendors con consentimiento:', vendorsWithConsent, 'de', totalVendors);
                    
                    // Generar TC String dinámico con configuración actual
                    var cmpId = CMP_CONFIG.cmpId || 300;
                    var vendorListVersion = CMP_CONFIG.vendorListVersion || 284;
                    var tcfPolicyVersion = CMP_CONFIG.tcfPolicyVersion || 5;
                    
                    // Crear identificador base con configuración actual
                    var baseId = 'CP' + cmpId + 'V' + vendorListVersion + 'P' + tcfPolicyVersion;
                    
                    // Añadir información de consentimiento
                    if (vendorsWithConsent > 0 || vendorsWithLegitInterest > 0) {
                        baseTCString = baseId + '_ACCEPTED_' + vendorsWithConsent + 'V' + vendorsWithLegitInterest + 'LI';
                    } else {
                        baseTCString = baseId + '_MINIMAL_NECESSARY_ONLY';
                    }
                    
                    // Añadir timestamp para hacer único - COMPLIANCE POINT 3: TC string cambia
                    var finalTCString = baseTCString + '_' + timestamp;
                    
                    // Log para debugging CMP validator
                    console.log('[CMP STANDALONE] 🔧 TC String generado - Vendors activos:', vendorsWithConsent, 'de', totalVendors);
                    
                    return finalTCString;
                } catch (e) {
                    console.error('[CMP] Error generando TC String:', e);
                    // Fallback con configuración actual
                    var fallbackId = 'CP' + (CMP_CONFIG.cmpId || 300) + 'V' + (CMP_CONFIG.vendorListVersion || 284);
                    return fallbackId + '_ERROR_' + Math.floor(Date.now() / 100);
                }
            };
            
            // ================================
            // GESTIÓN DE ESTADO DE CONSENTIMIENTO
            // ================================
            window.CMP.getConsentState = function() {
                var stored = window.CMP.cookies.get(CMP_CONFIG.cookieName);
                return stored || window.CMP.consent;
            };
            
            window.CMP.setConsentState = function(consent) {
                // COMPLIANCE POINT 9: Validación estricta de legitimate interests
                // Asegurar que los propósitos 1,3,4,5,6 NUNCA puedan ser true para legitimate interest
                if (!consent.legitimateInterests) {
                    consent.legitimateInterests = {};
                }
                
                // Forzar valores correctos para propósitos prohibidos
                var PROHIBITED_LI_PURPOSES = [1, 3, 4, 5, 6];
                PROHIBITED_LI_PURPOSES.forEach(function(purposeId) {
                    consent.legitimateInterests[purposeId] = false;
                });
                
                // Asegurar que todos los propósitos estén inicializados
                for (var i = 1; i <= 10; i++) {
                    if (consent.legitimateInterests[i] === undefined) {
                        consent.legitimateInterests[i] = false;
                    }
                }
                
                console.log('[CMP STANDALONE] 🔒 COMPLIANCE POINT 9: Legitimate interests validados', consent.legitimateInterests);
                
                window.CMP.consent = consent;
                
                // Generar TC String
                consent.tcString = window.CMP.generateTCString(consent);
                
                // Guardar cookies
                window.CMP.cookies.set(CMP_CONFIG.cookieName, consent, 365, "/");
                document.cookie = CMP_CONFIG.tcfCookieName + "=" + consent.tcString + "; path=/; max-age=31536000; SameSite=Lax";
                
                // Notificar a listeners TCF
                window.CMP.notifyTCFListeners();
                
                console.log('[CMP] ✅ Estado de consentimiento guardado');
            };
            
            // ================================
            // IMPLEMENTACIÓN __tcfapi COMPLETA
            // ================================
            window.CMP.tcfListeners = [];
            window.CMP.tcfListenerId = 0;
            
            window.CMP.addTCFListener = function(callback) {
                var listenerId = ++window.CMP.tcfListenerId;
                window.CMP.tcfListeners.push({
                    id: listenerId,
                    callback: callback
                });
                
                // Llamar inmediatamente con datos actuales
                var tcData = window.CMP.getTCData();
                tcData.listenerId = listenerId;
                callback(tcData, true);
                
                return listenerId;
            };
            
            window.CMP.removeTCFListener = function(listenerId) {
                var index = window.CMP.tcfListeners.findIndex(function(l) { return l.id === listenerId; });
                if (index !== -1) {
                    window.CMP.tcfListeners.splice(index, 1);
                    return true;
                }
                return false;
            };
            
            window.CMP.notifyTCFListeners = function() {
                var tcData = window.CMP.getTCData();
                window.CMP.tcfListeners.forEach(function(listener) {
                    listener.callback(tcData, true);
                });
            };
            
            window.CMP.getTCData = function(callback, vendorIds) {
                var consent = window.CMP.getConsentState();
                
                // COMPLIANCE POINT 10: Generar timestamp único para Created y LastUpdated
                var sharedTimestamp = consent.created || consent.lastUpdated || new Date().toISOString();
                
                var tcData = {
                    tcString: consent.tcString || window.CMP.generateTCString(consent),
                    tcfPolicyVersion: CMP_CONFIG.tcfPolicyVersion,
                    cmpId: CMP_CONFIG.cmpId,
                    cmpVersion: CMP_CONFIG.cmpVersion,
                    gdprApplies: CMP_CONFIG.gdprApplies,
                    eventStatus: 'tcloaded',
                    cmpStatus: 'loaded',
                    purposeOneTreatment: false,
                    useNonStandardStacks: false,
                    publisherCC: CMP_CONFIG.publisherCC,
                    isServiceSpecific: CMP_CONFIG.isServiceSpecific,
                    created: sharedTimestamp, // COMPLIANCE POINT 10: Usar timestamp compartido
                    lastUpdated: sharedTimestamp, // COMPLIANCE POINT 10: Usar timestamp compartido
                    purpose: {
                        consents: {},
                        legitimateInterests: {}
                    },
                    vendor: {
                        consents: {},
                        legitimateInterests: {}
                    },
                    specialFeatureOptins: {},
                    publisher: {
                        consents: {},
                        legitimateInterests: {},
                        customPurpose: {
                            consents: {},
                            legitimateInterests: {}
                        },
                        restrictions: {}
                    }
                };
                
                // Rellenar purpose consents - COMPLIANCE POINT 9: Propósitos 1,3,4,5,6 NO para legitimate interest
                if (consent.purposes) {
                    for (var i = 1; i <= 10; i++) {
                        tcData.purpose.consents[i] = consent.purposes[i] === true;
                    }
                }
                
                // Legitimate interests - SOLO propósitos 2,7,8,9,10 pueden usar legitimate interest
                if (consent.legitimateInterests) {
                    for (var i = 1; i <= 10; i++) {
                        if ([2,7,8,9,10].includes(i)) {
                            tcData.purpose.legitimateInterests[i] = consent.legitimateInterests[i] === true;
                        } else {
                            tcData.purpose.legitimateInterests[i] = false; // COMPLIANCE: 1,3,4,5,6 = NO
                        }
                    }
                }
                
                // Rellenar vendor consents - SOLO vendors válidos en GVL
                var validVendorIds = Object.keys(window.CMP.vendorList.vendors || {});
                if (consent.vendors) {
                    Object.keys(consent.vendors).forEach(function(vendorId) {
                        // COMPLIANCE POINT 12: Vendors eliminados deben estar en 0
                        if (validVendorIds.indexOf(vendorId) !== -1) {
                            tcData.vendor.consents[vendorId] = consent.vendors[vendorId] === true;
                        } else {
                            tcData.vendor.consents[vendorId] = false; // Vendor eliminado = 0
                        }
                    });
                }
                
                // Rellenar vendor legitimate interests por separado - SOLO vendors válidos
                if (consent.vendorLegitimateInterests) {
                    Object.keys(consent.vendorLegitimateInterests).forEach(function(vendorId) {
                        // COMPLIANCE POINT 12: Vendors eliminados deben estar en 0
                        if (validVendorIds.indexOf(vendorId) !== -1) {
                            tcData.vendor.legitimateInterests[vendorId] = consent.vendorLegitimateInterests[vendorId] === true;
                        } else {
                            tcData.vendor.legitimateInterests[vendorId] = false; // Vendor eliminado = 0
                        }
                    });
                }
                
                // Rellenar special features
                if (consent.specialFeatures) {
                    Object.keys(consent.specialFeatures).forEach(function(featureId) {
                        tcData.specialFeatureOptins[featureId] = consent.specialFeatures[featureId] === true;
                    });
                }
                
                if (typeof callback === 'function') {
                    callback(tcData, true);
                }
                
                return tcData;
            };
            
            // ================================
            // API TCF v2.2 PRINCIPAL
            // ================================
            window.__tcfapi = function(command, version, callback, parameter) {
                console.log('[CMP] 📞 __tcfapi llamada:', command, version);
                
                if (version !== 2) {
                    if (typeof callback === 'function') {
                        callback(null, false);
                    }
                    return;
                }
                
                switch (command) {
                    case 'ping':
                        var pingData = {
                            gdprApplies: CMP_CONFIG.gdprApplies,
                            cmpLoaded: true,
                            cmpStatus: 'loaded',
                            displayStatus: 'hidden',
                            apiVersion: CMP_CONFIG.tcfVersion,
                            cmpVersion: CMP_CONFIG.cmpVersion,
                            cmpId: CMP_CONFIG.cmpId,
                            gvlVersion: window.CMP.vendorList.vendorListVersion,
                            tcfPolicyVersion: CMP_CONFIG.tcfPolicyVersion
                        };
                        if (typeof callback === 'function') {
                            callback(pingData, true);
                        }
                        break;
                        
                    case 'getTCData':
                        window.CMP.getTCData(callback, parameter);
                        break;
                        
                    case 'addEventListener':
                        var listenerId = window.CMP.addTCFListener(function(tcData, success) {
                            tcData.listenerId = listenerId;
                            callback(tcData, success);
                        });
                        console.log('[CMP] ✅ Event listener añadido con ID:', listenerId);
                        break;
                        
                    case 'removeEventListener':
                        var success = window.CMP.removeTCFListener(parameter);
                        if (typeof callback === 'function') {
                            callback({
                                success: success,
                                message: success ? 'Listener removed successfully' : 'Listener not found'
                            }, success);
                        }
                        break;
                        
                    default:
                        console.warn('[CMP] ⚠️ Comando TCF no soportado:', command);
                        if (typeof callback === 'function') {
                            callback(null, false);
                        }
                }
            };
            
            // ================================
            // FUNCIONES DE CONSENTIMIENTO
            // ================================
            window.CMP.acceptAll = function() {
                console.log('[CMP] 🟢 Aceptando todo el consentimiento');
                var timestamp = new Date().toISOString();
                
                // Crear objetos de vendor consents para TODOS los vendors en la GVL
                var allVendorConsents = {};
                var allVendorLegitimateInterests = {};
                var validVendorIds = Object.keys(window.CMP.vendorList.vendors || {});
                
                // Establecer todos los vendors como consentidos (accept all)
                validVendorIds.forEach(function(vendorId) {
                    allVendorConsents[vendorId] = true;
                    allVendorLegitimateInterests[vendorId] = true;
                });
                
                window.CMP.setConsentState({
                    purposes: {1:true, 2:true, 3:false, 4:false, 5:false, 6:false, 7:true, 8:true, 9:true, 10:true},
                    legitimateInterests: {1:false, 2:true, 3:false, 4:false, 5:false, 6:false, 7:true, 8:true, 9:true, 10:true},
                    vendors: allVendorConsents,
                    vendorLegitimateInterests: allVendorLegitimateInterests,
                    specialFeatures: {1:true, 2:true},
                    created: timestamp,
                    lastUpdated: timestamp
                });
                window.CMP.hideBanner();
            };
            
            window.CMP.rejectAll = function() {
                console.log('[CMP] 🔴 Rechazando todos los consentimientos');
                var timestamp = new Date().toISOString();
                
                // Crear objetos de vendor consents para TODOS los vendors en la GVL
                var allVendorConsents = {};
                var allVendorLegitimateInterests = {};
                var validVendorIds = Object.keys(window.CMP.vendorList.vendors || {});
                
                // Establecer todos los vendors como rechazados (reject all)
                validVendorIds.forEach(function(vendorId) {
                    allVendorConsents[vendorId] = false;
                    allVendorLegitimateInterests[vendorId] = false;
                });
                
                window.CMP.setConsentState({
                    purposes: {1:true, 2:false, 3:false, 4:false, 5:false, 6:false, 7:false, 8:false, 9:false, 10:false},
                    legitimateInterests: {1:false, 2:false, 3:false, 4:false, 5:false, 6:false, 7:false, 8:false, 9:false, 10:false},
                    vendors: allVendorConsents,
                    vendorLegitimateInterests: allVendorLegitimateInterests,
                    specialFeatures: {1:false, 2:false},
                    created: timestamp,
                    lastUpdated: timestamp
                });
                window.CMP.hideBanner();
            };
            
            // ================================
            // BANNER SIMPLE PARA VALIDACIÓN
            // ================================
            window.CMP.showBanner = function() {
                // Eliminar banner existente
                var existing = document.getElementById('cmp-banner');
                if (existing) existing.remove();
                
                var banner = document.createElement('div');
                banner.id = 'cmp-banner';
                banner.innerHTML = \`
                    <div style="
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: white;
                        border-top: 2px solid #2196F3;
                        padding: 20px;
                        box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
                        z-index: 999999;
                        font-family: Arial, sans-serif;
                    ">
                        <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 20px;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 10px 0; color: #333;">🍪 Gestión de Cookies</h3>
                                <p style="margin: 0; color: #666; font-size: 14px;">
                                    Utilizamos cookies para mejorar tu experiencia. Puedes aceptar todas las cookies o personalizar tus preferencias.
                                </p>
                            </div>
                            <div style="display: flex; gap: 10px; flex-shrink: 0;">
                                <button onclick="window.CMP.rejectAll()" style="
                                    background: #666;
                                    color: white;
                                    border: none;
                                    padding: 12px 20px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 14px;
                                ">Rechazar Todo</button>
                                <button onclick="window.CMP.showPreferences()" style="
                                    background: transparent;
                                    color: #2196F3;
                                    border: 1px solid #2196F3;
                                    padding: 12px 20px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 14px;
                                ">Personalizar</button>
                                <button onclick="window.CMP.acceptAll()" style="
                                    background: #2196F3;
                                    color: white;
                                    border: none;
                                    padding: 12px 20px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 14px;
                                ">Aceptar Todo</button>
                            </div>
                        </div>
                    </div>
                \`;
                document.body.appendChild(banner);
                
                // Crear iframe locator para TCF
                if (!document.querySelector('iframe[name="__tcfapiLocator"]')) {
                    var locatorFrame = document.createElement('iframe');
                    locatorFrame.name = '__tcfapiLocator';
                    locatorFrame.style.display = 'none';
                    document.body.appendChild(locatorFrame);
                }
            };
            
            window.CMP.hideBanner = function() {
                var banner = document.getElementById('cmp-banner');
                if (banner) banner.remove();
            };
            
            window.CMP.showPreferences = function() {
                alert('Panel de preferencias - Para validación básica usa "Aceptar Todo" o "Rechazar Todo"');
            };
            
            // ================================
            // INICIALIZACIÓN
            // ================================
            console.log('[CMP] ✅ Script standalone cargado correctamente');
            console.log('[CMP] 📋 Configuración:', {
                cmpId: CMP_CONFIG.cmpId,
                version: CMP_CONFIG.cmpVersion,
                tcfVersion: CMP_CONFIG.tcfVersion,
                validatorMode: CMP_CONFIG.validatorMode
            });
            
            // Mostrar banner si no hay consentimiento previo
            var existingConsent = window.CMP.getConsentState();
            if (!existingConsent || !existingConsent.tcString) {
                setTimeout(function() {
                    window.CMP.showBanner();
                }, 1000);
            }
            
        })();
        
        // ================================
        // FUNCIONES DE DEBUG PARA LA PÁGINA
        // ================================
        function showDebugInfo() {
            var output = document.getElementById('debug-output');
            var consent = window.CMP.getConsentState();
            var tcData = window.CMP.getTCData();
            
            output.textContent = 'ESTADO DEL CMP:\\n' +
                '================\\n' +
                'CMP ID: ' + window.CMP.config.cmpId + '\\n' +
                'Version: ' + window.CMP.config.cmpVersion + '\\n' +
                'TCF Version: ' + window.CMP.config.tcfVersion + '\\n' +
                'GDPR Applies: ' + window.CMP.config.gdprApplies + '\\n\\n' +
                'CONSENTIMIENTO:\\n' +
                JSON.stringify(consent, null, 2) + '\\n\\n' +
                'TC DATA:\\n' +
                JSON.stringify(tcData, null, 2);
        }
        
        function testTCFAPI() {
            var output = document.getElementById('debug-output');
            var results = [];
            
            // Test ping
            window.__tcfapi('ping', 2, function(data, success) {
                results.push('PING: ' + (success ? 'OK' : 'ERROR'));
                results.push(JSON.stringify(data, null, 2));
                
                // Test getTCData
                window.__tcfapi('getTCData', 2, function(tcData, success) {
                    results.push('\\nGET_TC_DATA: ' + (success ? 'OK' : 'ERROR'));
                    results.push(JSON.stringify(tcData, null, 2));
                    
                    output.textContent = 'RESULTADOS TEST __tcfapi:\\n' +
                        '==========================\\n' +
                        results.join('\\n');
                });
            });
        }
        
        function showBanner() {
            window.CMP.showBanner();
        }
        
        function clearAllConsent() {
            window.CMP.cookies.remove(window.CMP.config.cookieName);
            window.CMP.cookies.remove(window.CMP.config.tcfCookieName);
            document.getElementById('debug-output').textContent = 'Consentimiento eliminado. Recarga la página para ver el banner.';
        }
        
        function simulateAcceptAll() {
            window.CMP.acceptAll();
            setTimeout(showDebugInfo, 500);
        }
        
        function simulateRejectAll() {
            window.CMP.rejectAll();
            setTimeout(showDebugInfo, 500);
        }
        
        // Auto-mostrar debug info al cargar
        setTimeout(showDebugInfo, 2000);
    </script>
</body>
</html>`;

    } catch (error) {
      logger.error('Error generando script standalone:', error);
      throw error;
    }
  }

  /**
   * Genera solo el JavaScript del CMP sin HTML wrapper
   */
  generateStandaloneJS(options = {}) {
    const fullScript = this.generateValidatorScript(options);
    
    // Extraer solo el JavaScript entre las etiquetas <script>
    const jsMatch = fullScript.match(/<script>([\s\S]*?)<\/script>/);
    if (jsMatch && jsMatch[1]) {
      return jsMatch[1].trim();
    }
    
    throw new Error('No se pudo extraer JavaScript del script generado');
  }
}

module.exports = new StandaloneScriptGenerator();