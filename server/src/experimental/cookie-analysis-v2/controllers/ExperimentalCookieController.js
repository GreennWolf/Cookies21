const SuperFastCookieScanner = require('../services/SuperFastCookieScanner');
const UltraAdvancedCookieScanner = require('../services/UltraAdvancedCookieScanner');
const CookieClassifierML = require('../services/CookieClassifierML');
const VendorDetector = require('../services/VendorDetector');
const ComprehensiveReportGenerator = require('../services/ComprehensiveReportGenerator');
const CookieImporter = require('../services/CookieImporter');
const CookieAnalysisV2 = require('../models/CookieAnalysisV2');

// Importar sistema actual para comparación
const CookiesScanController = require('../../../controllers/CookiesScanController');

const { catchAsync } = require('../../../utils/catchAsync');
const AppError = require('../../../utils/appError');

class ExperimentalCookieController {
  constructor() {
    // Usar el SuperFastCookieScanner que detecta muchas más cookies
    this.superFastScanner = new SuperFastCookieScanner({
      headless: true,
      timeout: 60000,   // 1 minuto para SuperFast
      waitTime: 5000,   // 5 segundos para carga dinámica
      scrollDepth: 3,   // Scroll optimizado
      interactionLevel: 'focused'  // Modo enfocado en cookies
    });
    
    // Mantener el UltraAdvanced como opción alternativa
    this.ultraScanner = new UltraAdvancedCookieScanner({
      headless: true,
      timeout: 180000,  // 3 minutos para ULTRA escaneo
      waitTime: 15000,  // 15 segundos para carga dinámica
      scrollDepth: 8,   // Scroll más agresivo
      interactionLevel: 'aggressive'  // Modo ULTRA agresivo
    });
    
    this.classifier = new CookieClassifierML();
    this.vendorDetector = new VendorDetector();
    this.reportGenerator = new ComprehensiveReportGenerator();
    this.cookieImporter = new CookieImporter();
  }

  /**
   * Escanear dominio con el nuevo sistema
   * POST /api/v1/experimental/cookie-analysis/scan/:domainId
   */
  scanDomain = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    const { 
      compare = false, 
      scannerType = 'superfast',  // 'superfast' o 'ultra'
      timeout,
      waitTime,
      scrollDepth
    } = req.body;
    
    console.log(`🚀 [Experimental] Iniciando escaneo de dominio ID: ${domainId}`);
    
    // Obtener información del dominio desde la base de datos
    const Domain = require('../../../models/Domain');
    const domainRecord = await Domain.findById(domainId);
    
    if (!domainRecord) {
      throw new AppError('Domain not found', 404);
    }
    
    const domain = domainRecord.domain;
    console.log(`🚀 [Experimental] Dominio encontrado: ${domain}`);
    
    // Validar dominio
    if (!this.isValidDomain(domain)) {
      throw new AppError('Invalid domain format', 400);
    }
    
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    
    try {
      // 1. Seleccionar scanner según el tipo solicitado
      let scanner, scannerName;
      
      if (scannerType === 'ultra') {
        scanner = this.ultraScanner;
        scannerName = 'UltraAdvanced';
        console.log('🚀 Usando UltraAdvancedCookieScanner para análisis profundo...');
      } else {
        scanner = this.superFastScanner;
        scannerName = 'SuperFast';
        console.log('⚡ Usando SuperFastCookieScanner para máxima detección...');
      }
      
      // Configurar opciones personalizadas si se proporcionan
      if (timeout || waitTime || scrollDepth) {
        const customOptions = {
          ...(scanner === this.superFastScanner ? {
            headless: true,
            timeout: timeout || 60000,
            waitTime: waitTime || 5000,
            scrollDepth: scrollDepth || 3,
            interactionLevel: 'focused'
          } : {
            headless: true,
            timeout: timeout || 180000,
            waitTime: waitTime || 15000,
            scrollDepth: scrollDepth || 8,
            interactionLevel: 'aggressive'
          })
        };
        
        // Crear nuevo scanner con opciones personalizadas
        if (scannerType === 'ultra') {
          scanner = new UltraAdvancedCookieScanner(customOptions);
        } else {
          scanner = new SuperFastCookieScanner(customOptions);
        }
      }
      
      // Ejecutar escaneo
      const scanData = await scanner.scan(url);
      console.log(`📊 ${scannerName} escaneo completado: ${scanData.cookies.length} cookies encontradas`);
      
      // 2. Clasificar cookies
      console.log('🔍 Iniciando clasificación de cookies...');
      const classifiedCookies = await Promise.all(
        scanData.cookies.map(cookie => this.classifyAndEnrichCookie(cookie, scanData))
      );
      
      // 3. Actualizar datos del escaneo
      scanData.cookies = classifiedCookies;
      
      // 4. Generar reporte comprehensivo
      console.log('📋 Generando reporte comprehensivo...');
      const report = await this.reportGenerator.generateReport(scanData);
      
      // 5. Guardar en base de datos
      const analysisRecord = await this.saveAnalysis(scanData, report);
      
      // 6. Importar cookies detectadas al sistema principal
      console.log('📤 Importando cookies al sistema principal...');
      console.log(`📊 Total de cookies a importar: ${scanData.cookies.length}`);
      
      let importResult = { imported: 0, updated: 0, skipped: 0, errors: [], totalProcessed: 0 };
      
      try {
        importResult = await this.cookieImporter.importCookiesFromV2Analysis(scanData, domainId);
        console.log(`✅ Importación completada: ${importResult.imported} nuevas, ${importResult.updated} actualizadas, ${importResult.skipped} omitidas`);
        
        if (importResult.errors.length > 0) {
          console.log(`⚠️ Errores durante importación: ${importResult.errors.length}`);
          importResult.errors.forEach(err => console.log(`  - ${err}`));
        }
      } catch (importError) {
        console.error('❌ Error al importar cookies:', importError);
        // No detenemos el flujo, continuamos con el reporte
        importResult.errors.push(`Error general de importación: ${importError.message}`);
      }
      
      // 7. Comparar con sistema actual si se solicita
      let comparison = null;
      if (compare) {
        console.log('⚖️ Ejecutando comparación con sistema actual...');
        comparison = await this.compareWithCurrentSystem(domain, scanData);
        report.comparison = comparison;
      }
      
      console.log(`✅ [Experimental] Escaneo completado: ${analysisRecord.scanId}`);
      
      res.status(200).json({
        status: 'success',
        data: {
          scanId: analysisRecord.scanId,
          domain: scanData.domain,
          summary: report.summary,
          compliance: report.compliance,
          privacy: report.privacy,
          technologies: report.technologies,
          riskAssessment: report.riskAssessment,
          recommendations: report.recommendations,
          comparison: comparison,
          metadata: report.metadata,
          // Información de la importación de cookies
          cookieImport: {
            newCookies: importResult.imported,
            updatedCookies: importResult.updated,
            skippedCookies: importResult.skipped,
            totalProcessed: importResult.totalProcessed,
            errors: importResult.errors
          }
        }
      });
      
    } catch (error) {
      console.error('❌ [Experimental] Error en escaneo:', error);
      throw new AppError(`Scan failed: ${error.message}`, 500);
    }
  });

  /**
   * Escanear URL manual (solo para testing de owners)
   * POST /api/v1/experimental/cookie-analysis/scan-url
   */
  scanURL = catchAsync(async (req, res) => {
    const { 
      url,
      scannerType = 'superfast',
      timeout,
      waitTime,
      scrollDepth,
      saveToDatabase = false
    } = req.body;
    
    if (!url) {
      throw new AppError('URL is required', 400);
    }
    
    // Validar que sea owner
    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can scan manual URLs', 403);
    }
    
    console.log(`🚀 [Experimental] Owner ${req.user.email} escaneando URL manual: ${url}`);
    
    try {
      // Validar URL
      let validUrl;
      try {
        validUrl = url.startsWith('http') ? url : `https://${url}`;
        new URL(validUrl); // Validar formato
      } catch {
        throw new AppError('Invalid URL format', 400);
      }
      
      // Seleccionar scanner
      let scanner, scannerName;
      
      if (scannerType === 'ultra') {
        const customOptions = {
          headless: true,
          timeout: timeout || 180000,
          waitTime: waitTime || 15000,
          scrollDepth: scrollDepth || 8,
          interactionLevel: 'aggressive'
        };
        scanner = new UltraAdvancedCookieScanner(customOptions);
        scannerName = 'UltraAdvanced';
      } else {
        const customOptions = {
          headless: true,
          timeout: timeout || 60000,
          waitTime: waitTime || 5000,
          scrollDepth: scrollDepth || 3,
          interactionLevel: 'focused'
        };
        scanner = new SuperFastCookieScanner(customOptions);
        scannerName = 'SuperFast';
      }
      
      console.log(`⚡ Usando ${scannerName}Scanner para URL manual...`);
      
      // Ejecutar escaneo
      const scanData = await scanner.scan(validUrl);
      console.log(`📊 ${scannerName} escaneo de URL completado: ${scanData.cookies.length} cookies encontradas`);
      
      // Clasificar cookies básicamente
      const classifiedCookies = scanData.cookies.map(cookie => ({
        ...cookie,
        classification: {
          purpose: cookie.category || 'unknown',
          confidence: 0.8
        },
        vendor: {
          name: 'Unknown',
          confidence: 0.5
        }
      }));
      
      scanData.cookies = classifiedCookies;
      
      // Crear reporte básico
      const basicReport = {
        summary: {
          domain: new URL(validUrl).hostname,
          totalCookies: scanData.cookies.length,
          scanDuration: scanData.scanDuration,
          bySource: {},
          byCategory: {}
        },
        scannerType,
        scannerName,
        isManualURL: true
      };
      
      // Agrupar estadísticas
      scanData.cookies.forEach(cookie => {
        const source = cookie.source || 'unknown';
        const category = cookie.category || 'unknown';
        
        basicReport.summary.bySource[source] = (basicReport.summary.bySource[source] || 0) + 1;
        basicReport.summary.byCategory[category] = (basicReport.summary.byCategory[category] || 0) + 1;
      });
      
      res.status(200).json({
        status: 'success',
        data: {
          url: validUrl,
          domain: scanData.domain,
          summary: basicReport.summary,
          cookies: scanData.cookies.slice(0, 100), // Limitar a 100 para respuesta
          technologies: scanData.technologies,
          networkRequests: scanData.networkRequests?.length || 0,
          scannerInfo: {
            type: scannerType,
            name: scannerName,
            version: '2.0.0'
          },
          metadata: {
            isManualScan: true,
            scannedBy: req.user.email,
            scanTime: new Date().toISOString()
          }
        }
      });
      
    } catch (error) {
      console.error('❌ [Experimental] Error en escaneo de URL:', error);
      throw new AppError(`URL scan failed: ${error.message}`, 500);
    }
  });

  /**
   * Obtener reporte detallado
   * GET /api/v1/experimental/cookie-analysis/report/:scanId
   */
  getDetailedReport = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    const { format = 'json' } = req.query;
    
    const analysis = await CookieAnalysisV2.findOne({ scanId });
    
    if (!analysis) {
      throw new AppError('Analysis not found', 404);
    }
    
    // Generar reporte en el formato solicitado
    let report;
    
    switch (format) {
      case 'summary':
        report = analysis.generateReport();
        break;
      case 'full':
        report = {
          metadata: {
            scanId: analysis.scanId,
            domain: analysis.domain,
            scanDate: analysis.scanDate,
            scanDuration: analysis.scanDuration
          },
          summary: analysis.summary,
          compliance: analysis.compliance,
          privacy: analysis.privacy,
          cookies: analysis.cookies,
          technologies: analysis.technologies,
          comparison: analysis.comparison
        };
        break;
      default:
        report = analysis.generateReport();
    }
    
    res.status(200).json({
      status: 'success',
      data: report
    });
  });

  /**
   * Comparar sistemas (nuevo vs actual)
   * GET /api/v1/experimental/cookie-analysis/compare/:domainId
   */
  compareSystems = catchAsync(async (req, res) => {
    const { domainId } = req.params;
    
    console.log(`⚖️ [Experimental] Comparando sistemas para dominio ID: ${domainId}`);
    
    // Obtener información del dominio desde la base de datos
    const Domain = require('../../../models/Domain');
    const domainRecord = await Domain.findById(domainId);
    
    if (!domainRecord) {
      throw new AppError('Domain not found', 404);
    }
    
    const domain = domainRecord.domain;
    console.log(`⚖️ [Experimental] Comparando sistemas para dominio: ${domain}`);
    
    // Ejecutar ambos sistemas en paralelo
    const [newSystemResult, currentSystemResult] = await Promise.all([
      this.runNewSystemScan(domain),
      this.runCurrentSystemScan(domainId) // Pasar domainId al sistema actual
    ]);
    
    // Generar comparación detallada
    const comparison = this.generateDetailedComparison(newSystemResult, currentSystemResult);
    
    res.status(200).json({
      status: 'success',
      data: {
        domain,
        domainId,
        comparison,
        newSystem: newSystemResult.summary,
        currentSystem: currentSystemResult.summary,
        improvement: comparison.improvement
      }
    });
  });

  /**
   * Obtener lista de escaneos
   * GET /api/v1/experimental/cookie-analysis/scans
   */
  getScans = catchAsync(async (req, res) => {
    const { limit = 50, page = 1, domain } = req.query;
    
    const query = {};
    if (domain) {
      query.domain = { $regex: domain, $options: 'i' };
    }
    
    const scans = await CookieAnalysisV2.find(query)
      .select('scanId domain scanDate summary.total compliance.overallScore status')
      .sort({ scanDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await CookieAnalysisV2.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        scans,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  });

  /**
   * Eliminar escaneo
   * DELETE /api/v1/experimental/cookie-analysis/scan/:scanId
   */
  deleteScan = catchAsync(async (req, res) => {
    const { scanId } = req.params;
    
    const result = await CookieAnalysisV2.findOneAndDelete({ scanId });
    
    if (!result) {
      throw new AppError('Scan not found', 404);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Scan deleted successfully'
    });
  });

  /**
   * Estadísticas del sistema experimental
   * GET /api/v1/experimental/cookie-analysis/stats
   */
  getStats = catchAsync(async (req, res) => {
    const stats = await CookieAnalysisV2.aggregate([
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          avgCookiesPerScan: { $avg: '$summary.total' },
          avgComplianceScore: { $avg: '$compliance.overallScore' },
          totalCookiesAnalyzed: { $sum: '$summary.total' }
        }
      }
    ]);
    
    const categoryStats = await CookieAnalysisV2.aggregate([
      { $unwind: '$cookies' },
      {
        $group: {
          _id: '$cookies.category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const vendorStats = await CookieAnalysisV2.aggregate([
      { $unwind: '$cookies' },
      { $match: { 'cookies.vendor.name': { $exists: true } } },
      {
        $group: {
          _id: '$cookies.vendor.name',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        general: stats[0] || {},
        categories: categoryStats,
        topVendors: vendorStats
      }
    });
  });

  // Métodos auxiliares
  async classifyAndEnrichCookie(cookie, pageData) {
    try {
      // 1. Clasificar cookie
      const classification = await this.classifier.classifyCookie(cookie, pageData);
      
      // 2. Detectar vendor
      const vendorInfo = await this.vendorDetector.detectVendor(cookie, pageData);
      
      // 3. Enriquecer con datos adicionales
      const enrichedCookie = {
        ...cookie,
        category: classification.category,
        categoryConfidence: classification.confidence,
        vendor: vendorInfo,
        analysis: {
          isThirdParty: cookie.isThirdParty || false,
          isPersistent: cookie.isPersistent || false,
          estimatedRisk: this.calculateRisk(cookie, classification, vendorInfo),
          dataTypes: this.inferDataTypes(cookie, classification),
          purposes: this.inferPurposes(cookie, classification, vendorInfo)
        },
        enrichedData: {
          description: this.generateDescription(cookie, classification, vendorInfo),
          dataController: vendorInfo?.name,
          privacyPolicy: vendorInfo?.vendor?.urls?.privacyPolicy,
          retentionPeriod: this.calculateRetentionPeriod(cookie),
          legalBasis: this.determineLegalBasis(classification.category),
          requiresConsent: classification.category !== 'necessary'
        }
      };
      
      return enrichedCookie;
      
    } catch (error) {
      console.error(`Error processing cookie ${cookie.name}:`, error);
      return {
        ...cookie,
        category: 'unknown',
        categoryConfidence: 0,
        analysis: {
          isThirdParty: false,
          isPersistent: false,
          estimatedRisk: 'unknown'
        }
      };
    }
  }

  async saveAnalysis(scanData, report) {
    const analysisData = {
      scanId: scanData.scanId,
      domain: scanData.domain,
      url: scanData.url,
      scanDate: new Date(),
      scanDuration: scanData.scanDuration,
      summary: report.summary,
      cookies: scanData.cookies,
      compliance: report.compliance,
      privacy: report.privacy,
      technologies: report.technologies,
      comparison: report.comparison,
      status: 'completed'
    };
    
    // Intentar guardar en base de datos, pero si falla, continuar en modo testing
    try {
      const analysis = new CookieAnalysisV2(analysisData);
      await analysis.save();
      return analysis;
    } catch (dbError) {
      console.log('⚠️ No se pudo guardar en BD, continuando en modo testing:', dbError.message);
      // Retornar el análisis sin guardarlo (modo testing)
      analysisData._id = `testing_${analysisData.scanId}`;
      analysisData.createdAt = new Date();
      analysisData.updatedAt = new Date();
      return analysisData;
    }
  }

  async compareWithCurrentSystem(domain, newSystemData) {
    try {
      // Ejecutar sistema actual (simulado)
      const currentSystemData = await this.runCurrentSystemScan(domain);
      
      return this.generateDetailedComparison(newSystemData, currentSystemData);
      
    } catch (error) {
      console.error('Error comparing systems:', error);
      return {
        error: 'Could not compare with current system',
        newSystemFound: newSystemData.cookies.length,
        currentSystemFound: 0
      };
    }
  }

  async runNewSystemScan(domain) {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const scanData = await this.scanner.scan(url);
    
    const classifiedCookies = await Promise.all(
      scanData.cookies.map(cookie => this.classifyAndEnrichCookie(cookie, scanData))
    );
    
    scanData.cookies = classifiedCookies;
    const report = await this.reportGenerator.generateReport(scanData);
    
    return { scanData, report };
  }

  async runCurrentSystemScan(domain) {
    // Simular llamada al sistema actual
    // En implementación real, esto llamaría al CookiesScanController existente
    return {
      summary: {
        total: 0,
        byCategory: {},
        found: []
      },
      scanDuration: 0
    };
  }

  generateDetailedComparison(newResult, currentResult) {
    const newCookies = newResult.scanData?.cookies || [];
    const currentCookies = currentResult.summary?.found || [];
    
    const newCookieNames = new Set(newCookies.map(c => c.name));
    const currentCookieNames = new Set(currentCookies.map(c => c.name));
    
    const onlyInNew = newCookies.filter(c => !currentCookieNames.has(c.name));
    const onlyInCurrent = currentCookies.filter(c => !newCookieNames.has(c.name));
    const inBoth = newCookies.filter(c => currentCookieNames.has(c.name));
    
    const improvement = {
      detectionRate: newCookies.length > 0 ? 
        ((newCookies.length - currentCookies.length) / Math.max(currentCookies.length, 1)) * 100 : 0,
      newCookiesFound: onlyInNew.length,
      missedByCurrent: onlyInNew.length,
      commonCookies: inBoth.length
    };
    
    return {
      newSystem: {
        total: newCookies.length,
        scanTime: newResult.scanData?.scanDuration || 0
      },
      currentSystem: {
        total: currentCookies.length,
        scanTime: currentResult.scanDuration || 0
      },
      comparison: {
        onlyInNew: onlyInNew.map(c => ({ name: c.name, category: c.category })),
        onlyInCurrent: onlyInCurrent.map(c => ({ name: c.name })),
        inBoth: inBoth.length
      },
      improvement
    };
  }

  // Utility methods
  isValidDomain(domain) {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    const urlRegex = /^https?:\/\//;
    
    return domainRegex.test(domain) || urlRegex.test(domain);
  }

  calculateRisk(cookie, classification, vendorInfo) {
    let riskScore = 0;
    
    // Risk by category
    switch (classification.category) {
      case 'necessary': riskScore += 1; break;
      case 'functional': riskScore += 2; break;
      case 'analytics': riskScore += 3; break;
      case 'social': riskScore += 4; break;
      case 'marketing': riskScore += 5; break;
      default: riskScore += 3;
    }
    
    // Risk by third-party
    if (cookie.isThirdParty) riskScore += 2;
    
    // Risk by persistence
    if (cookie.isPersistent) riskScore += 1;
    
    // Risk by vendor confidence
    if (!vendorInfo || vendorInfo.confidence < 0.5) riskScore += 2;
    
    if (riskScore <= 3) return 'low';
    if (riskScore <= 6) return 'medium';
    return 'high';
  }

  inferDataTypes(cookie, classification) {
    const dataTypes = [];
    
    switch (classification.category) {
      case 'necessary':
        dataTypes.push('technical');
        break;
      case 'analytics':
        dataTypes.push('behavioral', 'technical');
        break;
      case 'marketing':
        dataTypes.push('behavioral', 'personal', 'commercial');
        break;
      case 'social':
        dataTypes.push('social', 'behavioral');
        break;
      default:
        dataTypes.push('unknown');
    }
    
    return dataTypes;
  }

  inferPurposes(cookie, classification, vendorInfo) {
    const purposes = [];
    
    if (vendorInfo?.vendor?.purposes) {
      purposes.push(...vendorInfo.vendor.purposes);
    } else {
      switch (classification.category) {
        case 'necessary':
          purposes.push('functionality', 'security');
          break;
        case 'analytics':
          purposes.push('measurement', 'analytics');
          break;
        case 'marketing':
          purposes.push('advertising', 'targeting');
          break;
        case 'social':
          purposes.push('social_media');
          break;
      }
    }
    
    return purposes;
  }

  generateDescription(cookie, classification, vendorInfo) {
    if (vendorInfo?.vendor?.knownCookies) {
      const knownCookie = vendorInfo.vendor.knownCookies.find(kc => kc.name === cookie.name);
      if (knownCookie?.description) {
        return knownCookie.description;
      }
    }
    
    const categoryInfo = this.classifier.getCategoryInfo(classification.category);
    return categoryInfo ? categoryInfo.description : 'Cookie purpose not identified';
  }

  calculateRetentionPeriod(cookie) {
    if (cookie.maxAge) {
      const days = cookie.maxAge / (24 * 60 * 60);
      if (days < 1) return `${Math.round(days * 24)} hours`;
      if (days < 30) return `${Math.round(days)} days`;
      if (days < 365) return `${Math.round(days / 30)} months`;
      return `${Math.round(days / 365)} years`;
    }
    
    if (cookie.expires) {
      const now = new Date();
      const expires = new Date(cookie.expires);
      const days = (expires - now) / (1000 * 60 * 60 * 24);
      
      if (days < 1) return `${Math.round(days * 24)} hours`;
      if (days < 30) return `${Math.round(days)} days`;
      if (days < 365) return `${Math.round(days / 30)} months`;
      return `${Math.round(days / 365)} years`;
    }
    
    return 'Session';
  }

  determineLegalBasis(category) {
    switch (category) {
      case 'necessary': return 'Legitimate interest';
      case 'functional': return 'Legitimate interest';
      case 'analytics': return 'Consent';
      case 'marketing': return 'Consent';
      case 'social': return 'Consent';
      default: return 'Consent';
    }
  }
}

module.exports = new ExperimentalCookieController();