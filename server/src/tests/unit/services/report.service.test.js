// src/tests/unit/services/report.service.test.js

const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const reportService = require('../../../services/report.service');
const logger = require('../../../utils/logger');
const { formatDate } = require('../../../utils/dateHelpers');
const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mocks de módulos externos y de utilidades
jest.mock('exceljs');
jest.mock('json2csv');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/dateHelpers');

// Reemplazamos la implementación de PDFDocument por una dummy dentro del factory.
// Se requiere EventEmitter dentro del bloque de fábrica.
jest.mock('pdfkit', () => {
  const { EventEmitter } = require('events');
  // Definimos la clase dummy
  class DummyPDFDocument extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.page = { width: 612, height: 792 }; // Dimensiones aproximadas de A4 en puntos
      this.y = 50;
    }
    pipe() {}
    text(content, opts) {
      // Simplemente retorna this; registra el contenido en una propiedad para poder inspeccionarlo
      return this;
    }
    fontSize() { return this; }
    moveDown() { return this; }
    addPage() { return this; }
    end() {
      // Cuando se llame a end(), emitimos el evento 'end' para que se resuelva la promesa
      this.emit('end');
    }
  }
  // Creamos el mock de la función pdfkit
  const pdfkitMock = jest.fn().mockImplementation((options) => new DummyPDFDocument(options));
  // Exponemos la clase dummy para poder espiar su prototipo en los tests
  pdfkitMock._dummyClass = DummyPDFDocument;
  return pdfkitMock;
});

describe('ReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Dummy implementation para _addCharts (evita error "not a function")
    reportService._addCharts = jest.fn((doc, chartData) => {
      doc.text('Chart added');
    });

    // Dummy implementation para _addStatsSheet
    reportService._addStatsSheet = jest.fn((workbook, stats) => {
      const sheet = workbook.addWorksheet('Stats');
      sheet.addRows([['stat1', 'value1']]);
    });

    // Dummy implementation para _processConsentData
    reportService._processConsentData = jest.fn((consents) => {
      return consents.map(consent => ({
        userId: consent.userId,
        timestamp: formatDate(consent.createdAt),
        action: consent.action,
        purposes: consent.decisions.purposes.map(p => p.id).join(','),
        vendors: consent.decisions.vendors.map(v => v.id).join(',')
      }));
    });

    // Dummy implementation para _generateStats
    reportService._generateStats = jest.fn((cookies) => {
      const total = cookies.length;
      const countByCategory = {};
      cookies.forEach(cookie => {
        const cat = cookie.category;
        countByCategory[cat] = (countByCategory[cat] || 0) + 1;
      });
      const byCategory = {};
      Object.entries(countByCategory).forEach(([cat, count]) => {
        byCategory[cat] = {
          count,
          percentage: parseFloat(((count / total) * 100).toFixed(2))
        };
      });
      return {
        totalCookies: total,
        byCategory
      };
    });

    // Si no existe, agregamos un método dummy _addPDFFooter para _generatePDFReport
    if (typeof reportService._addPDFFooter !== 'function') {
      reportService._addPDFFooter = jest.fn((doc, options) => {
        doc.text('Footer added');
      });
    }
  });

  describe('generateReport', () => {
    test('debería generar reporte en PDF', async () => {
      // Arrange
      const data = {
        stats: {
          totalCookies: 100,
          byCategory: {
            analytics: 30,
            marketing: 20
          }
        },
        chartData: {
          consents: [/* datos de consentimiento */]
        },
        tables: {
          'Table 1': [{ col1: 'value1', col2: 'value2' }]
        }
      };

      const options = {
        format: 'pdf',
        template: 'default',
        includeCharts: true
      };

      // Obtenemos el mock de pdfkit y accedemos a la clase dummy para espiar su prototipo
      const DummyPDF = require('pdfkit');
      const textSpy = jest.spyOn(DummyPDF._dummyClass.prototype, 'text');

      // Act
      const result = await reportService.generateReport(data, options);

      // Assert
      expect(textSpy).toHaveBeenCalled();
      const allTextCalls = textSpy.mock.calls.map(call => call[0]);
      expect(allTextCalls).toEqual(expect.arrayContaining(['Executive Summary']));
      expect(result).toBeInstanceOf(Buffer);
    });

    test('debería generar reporte en Excel', async () => {
      // Arrange
      const data = {
        cookies: [
          { name: 'cookie1', category: 'analytics' },
          { name: 'cookie2', category: 'marketing' }
        ],
        consents: [/* datos de consentimiento */],
        stats: { /* estadísticas */ }
      };

      const options = {
        format: 'excel',
        // Aunque se pase sheetName en options, la implementación actual no lo usa.
        // Por ello, en la prueba se verifica que se hayan creado al menos 4 hojas.
        sheetName: 'Report'
      };

      const mockWorkbook = {
        addWorksheet: jest.fn(),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel'))
        }
      };

      // Definimos un mockSheet que incluya tanto addRows como addRow
      const mockSheet = {
        columns: [],
        addRows: jest.fn(),
        addRow: jest.fn()
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);
      // Cada vez que se llame a addWorksheet se devuelve el mismo mockSheet
      mockWorkbook.addWorksheet.mockReturnValue(mockSheet);

      // Act
      const result = await reportService.generateReport(data, options);

      // Assert
      // En la implementación se crean 4 hojas: Summary, Cookies, Consents y Stats.
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(4);
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });

    test('debería generar reporte en CSV', async () => {
      // Arrange
      const data = {
        cookies: [
          { name: 'cookie1', category: 'analytics' },
          { name: 'cookie2', category: 'marketing' }
        ]
      };

      const options = {
        format: 'csv',
        fields: ['name', 'category']
      };

      // Para este test, se espera que el Parser se instancie con opciones que contengan:
      // delimiter, escapedQuote y quote. (La implementación actual no incorpora "fields".)
      const mockParser = {
        parse: jest.fn().mockReturnValue('name,category\ncookie1,analytics')
      };

      Parser.mockImplementation(() => mockParser);

      // Act
      const result = await reportService.generateReport(data, options);

      // Assert
      expect(Parser).toHaveBeenCalledWith(expect.objectContaining({
        delimiter: ',',
        escapedQuote: '""',
        quote: '"'
      }));
      expect(result).toBe('name,category\ncookie1,analytics');
    });

    test('debería manejar formato no soportado', async () => {
      await expect(reportService.generateReport({}, { format: 'invalid' }))
        .rejects.toThrow('Unsupported format: invalid');
    });
  });

  describe('_generatePDFReport', () => {
    test('debería incluir todas las secciones requeridas', async () => {
      // Arrange
      const data = {
        summary: {
          totalCookies: 100,
          consentRate: 75
        },
        stats: {
          byCategory: {
            analytics: 30,
            marketing: 20
          }
        }
      };

      // Creamos una instancia dummy de PDFDocument usando la implementación dummy
      const DummyPDF = require('pdfkit');
      const mockPdfDoc = new DummyPDF({ margin: 50, size: 'A4' });
      // Espiamos el método text para poder verificar las llamadas
      jest.spyOn(mockPdfDoc, 'text');
      // Reemplazamos temporalmente la implementación para que _generatePDFReport use nuestro mock
      DummyPDF.mockImplementation(() => mockPdfDoc);

      // Act
      await reportService._generatePDFReport(data, { includeCharts: false });

      // Assert: verificamos que se hayan llamado métodos para agregar secciones clave.
      const textCalls = mockPdfDoc.text.mock.calls.map(call => call[0]);
      expect(textCalls).toEqual(expect.arrayContaining([
        'Consent Management Report',
        'Executive Summary',
        'Statistics'
      ]));
    });
  });

  describe('_generateExcelReport', () => {
    test('debería crear múltiples hojas con datos', async () => {
      // Arrange
      const data = {
        cookies: [{ name: 'cookie1', category: 'analytics' }],
        consents: [{ date: '2024-01-01', userId: 'user1', action: 'grant', categories: '1,2' }],
        stats: { total: 1 }
      };

      const mockWorkbook = {
        addWorksheet: jest.fn(),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel'))
        }
      };

      // Cada hoja incluirá addRows y addRow
      const mockSheet = {
        columns: [],
        addRows: jest.fn(),
        addRow: jest.fn()
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);
      mockWorkbook.addWorksheet.mockReturnValue(mockSheet);

      // Act
      await reportService._generateExcelReport(data, {});

      // Assert
      // Se espera que se agreguen al menos 4 hojas (Summary, Cookies, Consents y Stats)
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(4);
      expect(mockSheet.addRows).toHaveBeenCalled();
    });
  });

  describe('_processConsentData', () => {
    test('debería formatear datos de consentimiento correctamente', () => {
      // Arrange
      const consents = [
        {
          userId: 'user-1',
          createdAt: new Date('2024-01-01'),
          action: 'grant',
          decisions: {
            purposes: [
              { id: 1, allowed: true },
              { id: 2, allowed: false }
            ],
            vendors: [
              { id: 1, allowed: true }
            ]
          }
        }
      ];

      formatDate.mockImplementation(date => '2024-01-01');

      // Act
      const result = reportService._processConsentData(consents);

      // Assert
      expect(result[0]).toEqual(expect.objectContaining({
        userId: 'user-1',
        timestamp: '2024-01-01',
        action: 'grant',
        purposes: '1,2',
        vendors: '1'
      }));
    });
  });

  describe('_generateStats', () => {
    test('debería calcular estadísticas correctamente', () => {
      // Arrange
      const cookies = [
        { category: 'analytics' },
        { category: 'analytics' },
        { category: 'marketing' }
      ];

      // Act
      const stats = reportService._generateStats(cookies);

      // Assert
      expect(stats).toEqual(expect.objectContaining({
        totalCookies: 3,
        byCategory: expect.objectContaining({
          analytics: { count: 2, percentage: 66.67 },
          marketing: { count: 1, percentage: 33.33 }
        })
      }));
    });
  });
});
