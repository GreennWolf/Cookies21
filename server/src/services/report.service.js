// services/report.service.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');
const csv = require('csv-stringify');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const analyticsService = require('./analytics.service');
const Domain = require('../models/Domain');

class ReportService {
  /**
   * Genera un informe basado en los datos de analytics proporcionados
   * @param {Object} data - Datos agregados de analytics
   * @param {string} format - Formato del informe: 'pdf', 'csv', 'json'
   * @returns {Promise<Object>} - URL o contenido del informe generado
   */
  async generateReport(data, format = 'pdf') {
    try {
      switch (format.toLowerCase()) {
        case 'pdf':
          return await this._generatePDFReport(data);
        case 'csv':
          return await this._generateCSVReport(data);
        case 'json':
          return data; // Simplemente devolvemos los datos JSON
        default:
          throw new Error(`Formato no soportado: ${format}`);
      }
    } catch (error) {
      logger.error('Error generando informe:', error);
      throw error;
    }
  }

  /**
   * Genera un informe completo con todas las métricas disponibles
   * @param {string} domainId - ID del dominio
   * @param {Object} options - Opciones de periodo y formato
   * @returns {Promise<Object>} - Informe completo
   */
  async generateComprehensiveReport(domainId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        format = 'pdf',
        includeUX = true,
        includeJourney = true,
        includeABTests = true,
        includePerformance = true
      } = options;

      // Obtener información del dominio
      const domain = await Domain.findById(domainId);
      if (!domain) {
        throw new Error(`Dominio no encontrado: ${domainId}`);
      }

      // Recopilar todos los datos necesarios en paralelo
      const [
        baseAnalytics,
        consentStats,
        cookieAnalytics,
        demographics
      ] = await Promise.all([
        analyticsService.aggregateAnalytics(domainId, startDate, endDate),
        analyticsService.getConsentStats(domainId, { startDate, endDate }),
        analyticsService.getCookieAnalytics(domainId, { startDate, endDate }),
        analyticsService.getDemographicAnalysis(domainId, { startDate, endDate })
      ]);

      // Datos adicionales opcionales
      const additionalData = {};
      
      if (includeUX) {
        additionalData.uxMetrics = await analyticsService.getUXMetricsAnalytics(
          domainId, { startDate, endDate }
        );
      }
      
      if (includeJourney) {
        additionalData.userJourney = await analyticsService.getUserJourneyAnalytics(
          domainId, { startDate, endDate }
        );
        
        additionalData.sessionContext = await analyticsService.getSessionContextAnalytics(
          domainId, { startDate, endDate }
        );
      }
      
      if (includeABTests) {
        additionalData.abTests = await analyticsService.getABTestResults(
          domainId, { startDate, endDate }
        );
      }

      // Compilar todos los datos
      const reportData = {
        metadata: {
          domain: domain.name,
          url: domain.url,
          period: {
            start: startDate,
            end: endDate,
            duration: Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000)) // días
          },
          generatedAt: new Date(),
          reportId: uuidv4()
        },
        overview: baseAnalytics,
        consents: consentStats,
        cookies: cookieAnalytics,
        demographics: demographics,
        ...additionalData
      };

      // Generar informe en el formato solicitado
      return await this.generateReport(reportData, format);
    } catch (error) {
      logger.error('Error generando informe completo:', error);
      throw error;
    }
  }

  /**
   * Genera un informe comparativo entre varios dominios
   * @param {Array<string>} domainIds - IDs de los dominios a comparar
   * @param {Object} options - Opciones de periodo y formato
   * @returns {Promise<Object>} - Informe comparativo
   */
  async generateComparisonReport(domainIds, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        format = 'pdf',
        metrics = ['acceptanceRate', 'customizationRate', 'performance']
      } = options;

      // Obtener información de los dominios
      const domains = await Domain.find({ _id: { $in: domainIds } });
      if (domains.length !== domainIds.length) {
        throw new Error('No se encontraron todos los dominios solicitados');
      }

      // Recopilar datos para cada dominio
      const domainsData = await Promise.all(
        domains.map(async (domain) => {
          const domainStats = await analyticsService.aggregateAnalytics(
            domain._id, startDate, endDate
          );
          
          return {
            domainId: domain._id,
            name: domain.name,
            url: domain.url,
            stats: this._extractComparisonMetrics(domainStats, metrics)
          };
        })
      );

      // Crear análisis comparativo
      const comparisonData = {
        metadata: {
          period: {
            start: startDate,
            end: endDate,
            duration: Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000)) // días
          },
          generatedAt: new Date(),
          reportId: uuidv4(),
          domains: domains.map(d => ({ id: d._id, name: d.name, url: d.url }))
        },
        metrics: this._calculateComparisonMetrics(domainsData, metrics),
        domainsData
      };

      // Generar informe en el formato solicitado
      return await this.generateReport(comparisonData, format);
    } catch (error) {
      logger.error('Error generando informe comparativo:', error);
      throw error;
    }
  }

  /**
   * Genera un informe en formato PDF
   * @param {Object} data - Datos para el informe
   * @returns {Promise<Object>} - URL y metadata del PDF generado
   * @private
   */
  async _generatePDFReport(data) {
    return new Promise((resolve, reject) => {
      try {
        // Crear nombre y ruta del archivo
        const fileName = `report_${Date.now()}.pdf`;
        const tempDir = path.join(os.tmpdir(), 'consent-reports');
        
        // Asegurar que el directorio existe
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const filePath = path.join(tempDir, fileName);
        
        // Crear documento PDF
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        
        // Cuando termine de escribir, resolvemos la promesa
        stream.on('finish', () => {
          resolve({
            url: `/reports/${fileName}`,
            filePath,
            fileName,
            mimeType: 'application/pdf',
            size: fs.statSync(filePath).size
          });
        });
        
        // Si hay error, rechazamos la promesa
        stream.on('error', (error) => {
          reject(error);
        });
        
        // Pipe del documento al stream
        doc.pipe(stream);
        
        // Generar contenido del PDF
        this._buildPDFContent(doc, data);
        
        // Finalizar el documento
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Construye el contenido del PDF
   * @param {PDFDocument} doc - Documento PDF
   * @param {Object} data - Datos para el informe
   * @private
   */
  _buildPDFContent(doc, data) {
    // Estilos y configuración
    const titleSize = 22;
    const subtitleSize = 18;
    const sectionSize = 14;
    const textSize = 10;
    const lineGap = 5;
    
    const blue = '#0066cc';
    const gray = '#666666';
    
    // Portada
    doc.fontSize(titleSize)
       .fillColor(blue)
       .text('Informe de Consentimiento de Cookies', {
         align: 'center'
       })
       .moveDown(2);
    
    // Metadata
    if (data.metadata) {
      doc.fontSize(subtitleSize)
         .fillColor(blue)
         .text(data.metadata.domain || 'Dominio', {
           align: 'center'
         })
         .fontSize(textSize)
         .fillColor(gray)
         .text(data.metadata.url || '', {
           align: 'center'
         })
         .moveDown(1)
         .fontSize(textSize)
         .text(`Período: ${this._formatDate(data.metadata.period?.start)} a ${this._formatDate(data.metadata.period?.end)}`, {
           align: 'center'
         })
         .text(`Informe generado el: ${this._formatDate(data.metadata.generatedAt)}`, {
           align: 'center'
         })
         .moveDown(3);
    }
    
    // Si es un reporte comparativo, incluir lista de dominios
    if (data.metadata && data.metadata.domains) {
      doc.addPage()
         .fontSize(sectionSize)
         .fillColor(blue)
         .text('Dominios analizados', { underline: true })
         .moveDown(1);
      
      data.metadata.domains.forEach((domain, index) => {
        doc.fontSize(textSize)
           .fillColor('black')
           .text(`${index + 1}. ${domain.name}`, { continued: true })
           .fillColor(gray)
           .text(` (${domain.url})`, { lineGap });
      });
      
      doc.moveDown(2);
    }
    
    // Resumen general
    doc.addPage()
       .fontSize(sectionSize)
       .fillColor(blue)
       .text('Resumen General', { underline: true })
       .moveDown(1);
    
    // Visitas y consentimientos
    if (data.overview && data.overview.consents) {
      const consents = data.overview.consents;
      
      doc.fontSize(textSize)
         .fillColor('black')
         .text(`Total de visitas: ${data.overview.visits?.total || 0}`)
         .text(`Visitantes únicos: ${data.overview.visits?.unique || 0}`)
         .moveDown(1)
         .text(`Tasa de aceptación: ${this._formatPercentage(consents.rates?.acceptanceRate)}`)
         .text(`Tasa de rechazo: ${this._formatPercentage(consents.rates?.rejectionRate)}`)
         .text(`Tasa de personalización: ${this._formatPercentage(consents.rates?.customizationRate)}`)
         .moveDown(2);
    }
    
    // Análisis de cookies
    if (data.cookies && data.cookies.categories) {
      doc.fontSize(sectionSize)
         .fillColor(blue)
         .text('Análisis de Cookies', { underline: true })
         .moveDown(1);
      
      // Tabla de categorías
      data.cookies.categories.forEach(category => {
        doc.fontSize(textSize)
           .fillColor('black')
           .text(`${category.category}: ${category.count} cookies (${this._formatPercentage(category.percentage)})`, { lineGap });
      });
      
      doc.moveDown(2);
      
      // Proveedores de cookies, si están disponibles
      if (data.cookies.providers && data.cookies.providers.length > 0) {
        doc.fontSize(sectionSize - 2)
           .fillColor(blue)
           .text('Principales proveedores de cookies', { lineGap })
           .moveDown(1);
        
        data.cookies.providers
          .slice(0, 5) // Mostrar solo los principales 5
          .forEach(provider => {
            doc.fontSize(textSize)
               .fillColor('black')
               .text(`${provider.provider}: ${provider.cookieCount} cookies`, { lineGap });
          });
        
        doc.moveDown(2);
      }
    }
    
    // Análisis demográfico
    if (data.demographics) {
      doc.addPage()
         .fontSize(sectionSize)
         .fillColor(blue)
         .text('Análisis Demográfico', { underline: true })
         .moveDown(1);
      
      // Países
      if (data.demographics.countries && data.demographics.countries.length > 0) {
        doc.fontSize(sectionSize - 2)
           .fillColor(blue)
           .text('Por País', { lineGap })
           .moveDown(1);
        
        data.demographics.countries
          .slice(0, 5) // Top 5 países
          .forEach(country => {
            doc.fontSize(textSize)
               .fillColor('black')
               .text(`${country.name}: ${country.visits} visitas (Aceptación: ${this._formatPercentage(country.acceptanceRate)})`, { lineGap });
          });
        
        doc.moveDown(2);
      }
      
      // Dispositivos
      if (data.demographics.devices && data.demographics.devices.length > 0) {
        doc.fontSize(sectionSize - 2)
           .fillColor(blue)
           .text('Por Dispositivo', { lineGap })
           .moveDown(1);
        
        data.demographics.devices.forEach(device => {
          doc.fontSize(textSize)
             .fillColor('black')
             .text(`${device.type}: ${device.visits} visitas (Aceptación: ${this._formatPercentage(device.acceptanceRate)})`, { lineGap });
        });
        
        doc.moveDown(2);
      }
    }
    
    // Métricas UX, si están disponibles
    if (data.uxMetrics) {
      doc.addPage()
         .fontSize(sectionSize)
         .fillColor(blue)
         .text('Métricas de Experiencia de Usuario', { underline: true })
         .moveDown(1);
      
      // Tiempos de lectura
      doc.fontSize(textSize)
         .fillColor('black')
         .text(`Tiempo medio de lectura: ${this._formatTime(data.uxMetrics.readingTime?.averageReadingTime || 0)}`)
         .moveDown(1);
      
      // Indecisión
      if (data.uxMetrics.indecisionScore) {
        doc.text(`Puntuación de indecisión: ${data.uxMetrics.indecisionScore.averageIndecision?.toFixed(2) || 0}`)
           .moveDown(1);
      }
      
      // Elementos con más hover
      if (data.uxMetrics.hoverElements && data.uxMetrics.hoverElements.length > 0) {
        doc.fontSize(sectionSize - 2)
           .fillColor(blue)
           .text('Elementos con más tiempo de hover', { lineGap })
           .moveDown(1);
        
        data.uxMetrics.hoverElements
          .slice(0, 3) // Top 3 elementos
          .forEach(element => {
            doc.fontSize(textSize)
               .fillColor('black')
               .text(`${element._id}: ${this._formatTime(element.avgDuration)} (${element.count} veces)`, { lineGap });
          });
        
        doc.moveDown(2);
      }
    }
    
    // Resultados de test A/B, si están disponibles
    if (data.abTests && data.abTests.variantResults) {
      doc.addPage()
         .fontSize(sectionSize)
         .fillColor(blue)
         .text('Resultados de Pruebas A/B', { underline: true })
         .moveDown(1);
      
      data.abTests.variantResults.forEach(variant => {
        doc.fontSize(textSize)
           .fillColor('black')
           .text(`Variante ${variant.variantId}:`, { lineGap })
           .text(`  Total: ${variant.total} impresiones`, { lineGap })
           .text(`  Tasa de aceptación: ${this._formatPercentage(variant.acceptanceRate)}`, { lineGap })
           .text(`  Tasa de personalización: ${this._formatPercentage(variant.customizationRate)}`, { lineGap })
           .text(`  Tiempo medio de decisión: ${this._formatTime(variant.avgTimeToDecision)}`, { lineGap })
           .moveDown(1);
      });
      
      // Significancia estadística
      if (data.abTests.significanceTest) {
        const sig = data.abTests.significanceTest;
        
        doc.fontSize(sectionSize - 2)
           .fillColor(blue)
           .text('Análisis de significancia', { lineGap })
           .moveDown(1)
           .fontSize(textSize)
           .fillColor('black')
           .text(`Estadísticamente significativo: ${sig.significant ? 'Sí' : 'No'}`, { lineGap })
           .text(`Nivel de confianza: ${sig.confidence}%`, { lineGap })
           .text(`Valor p: ${sig.pValue}`, { lineGap });
      }
    }
    
    // Métricas de rendimiento, si están disponibles
    if (data.overview && data.overview.performance) {
      doc.addPage()
         .fontSize(sectionSize)
         .fillColor(blue)
         .text('Métricas de Rendimiento', { underline: true })
         .moveDown(1);
      
      const perf = data.overview.performance;
      
      if (perf.loadTime) {
        doc.fontSize(textSize)
           .fillColor('black')
           .text(`Tiempo de carga medio: ${this._formatTime(perf.loadTime.avg)}`, { lineGap })
           .text(`Tiempo de carga mínimo: ${this._formatTime(perf.loadTime.min)}`, { lineGap })
           .text(`Tiempo de carga máximo: ${this._formatTime(perf.loadTime.max)}`, { lineGap })
           .moveDown(1);
      }
      
      if (perf.scriptSize) {
        doc.text(`Tamaño original del script: ${this._formatSize(perf.scriptSize.original)}`, { lineGap })
           .text(`Tamaño comprimido: ${this._formatSize(perf.scriptSize.compressed)}`, { lineGap })
           .text(`Reducción: ${this._formatPercentage((1 - perf.scriptSize.compressed / perf.scriptSize.original) * 100)}`, { lineGap })
           .moveDown(1);
      }
      
      // Errores registrados
      if (perf.errors && perf.errors.length > 0) {
        doc.fontSize(sectionSize - 2)
           .fillColor(blue)
           .text('Errores registrados', { lineGap })
           .moveDown(1);
        
        perf.errors.forEach(error => {
          doc.fontSize(textSize)
             .fillColor('black')
             .text(`${error.type}: ${error.count} ocurrencias (última: ${this._formatDate(error.lastOccurrence)})`, { lineGap });
        });
      }
    }
    
    // Pie de página con número de página
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Solo añadir número de página si hay más de una página
      if (pageCount > 1) {
        doc.fontSize(8)
           .fillColor(gray)
           .text(
             `Página ${i + 1} de ${pageCount}`,
             50,
             doc.page.height - 50,
             { align: 'center' }
           );
      }
      
      // Pie de página con ID del informe
      if (data.metadata && data.metadata.reportId) {
        doc.fontSize(8)
           .fillColor(gray)
           .text(
             `ID del informe: ${data.metadata.reportId}`,
             50,
             doc.page.height - 30,
             { align: 'center' }
           );
      }
    }
  }
  
  /**
   * Genera un informe en formato CSV
   * @param {Object} data - Datos para el informe
   * @returns {Promise<Object>} - URL y metadata del CSV generado
   * @private
   */
  async _generateCSVReport(data) {
    return new Promise((resolve, reject) => {
      try {
        // Crear nombre y ruta del archivo
        const fileName = `report_${Date.now()}.csv`;
        const tempDir = path.join(os.tmpdir(), 'consent-reports');
        
        // Asegurar que el directorio existe
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const filePath = path.join(tempDir, fileName);
        
        // Preparar datos para CSV
        const csvData = this._prepareCSVData(data);
        
        // Crear archivo CSV
        csv.stringify(csvData.rows, {
          header: true,
          columns: csvData.columns
        }, (error, output) => {
          if (error) {
            return reject(error);
          }
          
          fs.writeFile(filePath, output, (err) => {
            if (err) {
              return reject(err);
            }
            
            resolve({
              url: `/reports/${fileName}`,
              filePath,
              fileName,
              mimeType: 'text/csv',
              size: fs.statSync(filePath).size
            });
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Prepara los datos para formato CSV
   * @param {Object} data - Datos para el informe
   * @returns {Object} - Datos preparados para CSV
   * @private
   */
  _prepareCSVData(data) {
    // Crear estructura de columnas
    const columns = [
      { key: 'category', header: 'Categoría' },
      { key: 'metric', header: 'Métrica' },
      { key: 'value', header: 'Valor' }
    ];
    
    // Crear filas
    const rows = [];
    
    // Datos generales
    rows.push({ category: 'General', metric: 'Dominio', value: data.metadata?.domain || 'N/A' });
    rows.push({ category: 'General', metric: 'URL', value: data.metadata?.url || 'N/A' });
    rows.push({ category: 'General', metric: 'Periodo Inicio', value: this._formatDate(data.metadata?.period?.start) });
    rows.push({ category: 'General', metric: 'Periodo Fin', value: this._formatDate(data.metadata?.period?.end) });
    rows.push({ category: 'General', metric: 'Total Visitas', value: data.overview?.visits?.total || 0 });
    rows.push({ category: 'General', metric: 'Visitantes Únicos', value: data.overview?.visits?.unique || 0 });
    
    // Consentimientos
    if (data.consents && data.consents.rates) {
      rows.push({ category: 'Consentimientos', metric: 'Tasa de Aceptación', value: this._formatPercentage(data.consents.rates.acceptanceRate) });
      rows.push({ category: 'Consentimientos', metric: 'Tasa de Rechazo', value: this._formatPercentage(data.consents.rates.rejectionRate) });
      rows.push({ category: 'Consentimientos', metric: 'Tasa de Personalización', value: this._formatPercentage(data.consents.rates.customizationRate) });
    }
    
    // Cookies por categoría
    if (data.cookies && data.cookies.categories) {
      data.cookies.categories.forEach(category => {
        rows.push({
          category: 'Cookies',
          metric: `Categoría ${category.category}`,
          value: `${category.count} (${this._formatPercentage(category.percentage)})`
        });
      });
    }
    
    // Datos demográficos - países
    if (data.demographics && data.demographics.countries) {
      data.demographics.countries.forEach(country => {
        rows.push({
          category: 'Demografía - Países',
          metric: country.name,
          value: `${country.visits} visitas (${this._formatPercentage(country.acceptanceRate)} aceptación)`
        });
      });
    }
    
    // Datos demográficos - dispositivos
    if (data.demographics && data.demographics.devices) {
      data.demographics.devices.forEach(device => {
        rows.push({
          category: 'Demografía - Dispositivos',
          metric: device.type,
          value: `${device.visits} visitas (${this._formatPercentage(device.acceptanceRate)} aceptación)`
        });
      });
    }
    
    // UX Metrics
    if (data.uxMetrics) {
      rows.push({
        category: 'Métricas UX',
        metric: 'Tiempo Medio de Lectura',
        value: this._formatTime(data.uxMetrics.readingTime?.averageReadingTime || 0)
      });
      
      if (data.uxMetrics.indecisionScore) {
        rows.push({
          category: 'Métricas UX',
          metric: 'Puntuación de Indecisión',
          value: data.uxMetrics.indecisionScore.averageIndecision?.toFixed(2) || 0
        });
      }
    }
    
    // Tests A/B
    if (data.abTests && data.abTests.variantResults) {
      data.abTests.variantResults.forEach(variant => {
        rows.push({
          category: 'Test A/B',
          metric: `Variante ${variant.variantId} - Impresiones`,
          value: variant.total
        });
        
        rows.push({
          category: 'Test A/B',
          metric: `Variante ${variant.variantId} - Tasa de Aceptación`,
          value: this._formatPercentage(variant.acceptanceRate)
        });
      });
      
      if (data.abTests.significanceTest) {
        rows.push({
          category: 'Test A/B',
          metric: 'Significancia Estadística',
          value: data.abTests.significanceTest.significant ? 'Sí' : 'No'
        });
        
        rows.push({
          category: 'Test A/B',
          metric: 'Nivel de Confianza',
          value: `${data.abTests.significanceTest.confidence}%`
        });
      }
    }
    
    // Rendimiento
    if (data.overview && data.overview.performance) {
      const perf = data.overview.performance;
      
      if (perf.loadTime) {
        rows.push({
          category: 'Rendimiento',
          metric: 'Tiempo de Carga Medio',
          value: this._formatTime(perf.loadTime.avg)
        });
      }
      
      if (perf.scriptSize) {
        rows.push({
          category: 'Rendimiento',
          metric: 'Tamaño del Script',
          value: `${this._formatSize(perf.scriptSize.original)} / ${this._formatSize(perf.scriptSize.compressed)} (${this._formatPercentage((1 - perf.scriptSize.compressed / perf.scriptSize.original) * 100)} reducción)`
        });
      }
    }
    
    return { columns, rows };
  }
  
  /**
   * Formatea una fecha en formato legible
   * @param {Date|string} date - Fecha a formatear
   * @returns {string} - Fecha formateada
   * @private
   */
  _formatDate(date) {
    if (!date) return 'N/A';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Formatea un porcentaje
   * @param {number} value - Valor a formatear
   * @returns {string} - Porcentaje formateado
   * @private
   */
  _formatPercentage(value) {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(2)}%`;
  }
  
  /**
   * Formatea un tiempo en milisegundos a formato legible
   * @param {number} ms - Tiempo en milisegundos
   * @returns {string} - Tiempo formateado
   * @private
   */
  _formatTime(ms) {
    if (!ms) return '0ms';
    
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }
  
  /**
   * Formatea un tamaño en bytes a formato legible
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} - Tamaño formateado
   * @private
   */
  _formatSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
}

module.exports = new ReportService();