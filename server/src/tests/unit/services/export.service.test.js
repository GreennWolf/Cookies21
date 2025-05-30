// tests/unit/services/export.service.test.js

const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const exportService = require('../../../services/export.service');
const logger = require('../../../utils/logger');
const { formatDate } = require('../../../utils/dateHelpers');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('exceljs');
jest.mock('json2csv');
jest.mock('archiver');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/dateHelpers');

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportAuditLogs', () => {
    test('debería exportar logs en formato CSV', async () => {
      // Arrange
      const logs = [
        {
          timestamp: new Date(),
          action: 'create',
          resourceType: 'domain',
          changes: []
        }
      ];

      const mockParser = {
        parse: jest.fn().mockReturnValue('timestamp,action,resourceType,changes')
      };

      Parser.mockImplementation(() => mockParser);

      // Act
      const result = await exportService.exportAuditLogs(logs, 'csv');

      // Assert
      expect(Parser).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: ['timestamp', 'action', 'resourceType', 'changes']
        })
      );
      expect(result).toBe('timestamp,action,resourceType,changes');
    });

    test('debería exportar logs en formato Excel', async () => {
      // Arrange
      const logs = [
        {
          timestamp: new Date(),
          action: 'update',
          resourceType: 'cookie'
        }
      ];

      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnThis(),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel'))
        }
      };

      // Definimos un mockSheet que incluya getRow y getColumn
      const mockSheet = {
        columns: [],
        addRows: jest.fn(),
        getRow: jest.fn().mockReturnValue({ font: {} }),
        getColumn: jest.fn().mockReturnValue({ width: 15 })
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);
      mockWorkbook.addWorksheet.mockReturnValue(mockSheet);

      // Act
      const result = await exportService.exportAuditLogs(logs, 'excel');

      // Assert
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Audit Logs');
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('exportConsents', () => {
    test('debería procesar y exportar datos de consentimiento', async () => {
      // Arrange
      // Se usa 'createdAt' en lugar de 'timestamp' para que el formateo se aplique correctamente
      const consents = [
        {
          userId: 'user-1',
          createdAt: new Date(),
          action: 'grant',
          decisions: {
            purposes: [{ id: 1, allowed: true }],
            vendors: [{ id: 1, allowed: true }]
          },
          metadata: { sample: 'data' }
        }
      ];

      formatDate.mockImplementation(date => '2024-01-01');

      // Act
      const result = await exportService.exportConsents(consents, 'json');

      // Assert
      // Se parsea el resultado para compararlo como objeto/array
      const parsedResult = JSON.parse(result);
      expect(parsedResult).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            timestamp: '2024-01-01',
            action: 'grant',
            purposes: '1:yes',
            vendors: '1:yes',
            metadata: "{\"sample\":\"data\"}"
          })
        ])
      );
    });
  });

  describe('exportDomainConfig', () => {
    test('debería exportar configuración limpia del dominio', async () => {
      // Arrange
      const domain = {
        domain: 'test.com',
        settings: {
          scanning: { enabled: true },
          design: { theme: 'light' }
        },
        bannerConfig: {
          components: []
        },
        integrations: {
          apiKeys: ['sensitive'],
          credentials: 'sensitive',
          googleAnalytics: {
            enabled: true
          }
        }
      };

      // Act
      const result = await exportService.exportDomainConfig(domain, 'json');

      // Assert
      const parsedResult = JSON.parse(result);
      expect(parsedResult).toEqual(
        expect.objectContaining({
          domain: 'test.com',
          settings: expect.any(Object),
          bannerConfig: expect.any(Object)
        })
      );
      expect(parsedResult.integrations).not.toHaveProperty('apiKeys');
      expect(parsedResult.integrations).not.toHaveProperty('credentials');
    });
  });

  describe('exportBackup', () => {
    test('debería crear archivo zip con todos los datos', async () => {
      // Arrange
      const data = {
        consents: [{ id: 1 }],
        cookies: [{ id: 1 }],
        config: { setting: true },
        logs: [{ id: 1 }]
      };

      const mockArchive = {
        append: jest.fn(),
        on: jest.fn(),
        finalize: jest.fn()
      };

      archiver.mockReturnValue(mockArchive);

      // Simular eventos del archive
      const chunks = [Buffer.from('chunk1'), Buffer.from('chunk2')];
      let dataCallback;
      let endCallback;

      mockArchive.on.mockImplementation((event, callback) => {
        if (event === 'data') dataCallback = callback;
        if (event === 'end') endCallback = callback;
      });

      // Act
      const exportPromise = exportService.exportBackup(data);

      // Simular stream de datos
      chunks.forEach(chunk => dataCallback(chunk));
      endCallback();

      const result = await exportPromise;

      // Assert
      expect(mockArchive.append).toHaveBeenCalledTimes(4); // Un append por cada sección
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('_exportToCSV', () => {
    test('debería aplicar transformaciones personalizadas', async () => {
      // Arrange
      const data = [
        { date: new Date(), value: 100 }
      ];

      const options = {
        transforms: [
          value => value * 2
        ]
      };

      const mockParser = {
        parse: jest.fn().mockReturnValue('transformed data')
      };

      Parser.mockImplementation(() => mockParser);

      // Act
      const result = await exportService._exportToCSV(data, options);

      // Assert
      expect(Parser).toHaveBeenCalledWith(
        expect.objectContaining({
          transforms: options.transforms
        })
      );
      expect(result).toBe('transformed data');
    });
  });

  describe('_exportToExcel', () => {
    test('debería aplicar estilos a la hoja', async () => {
      // Arrange
      const data = [
        { name: 'Test', value: 100 }
      ];

      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnThis(),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('styled-excel'))
        }
      };

      // Definimos un mockSheet con getRow y getColumn
      const mockSheet = {
        columns: [],
        addRows: jest.fn(),
        getRow: jest.fn().mockReturnValue({ font: {} }),
        getColumn: jest.fn().mockReturnValue({ width: 15 })
      };

      ExcelJS.Workbook.mockImplementation(() => mockWorkbook);
      mockWorkbook.addWorksheet.mockReturnValue(mockSheet);

      // Act
      const result = await exportService._exportToExcel(data, {
        sheetName: 'Test Sheet',
        columns: [
          { header: 'Name', key: 'name' },
          { header: 'Value', key: 'value' }
        ]
      });

      // Assert
      expect(mockSheet.getRow).toHaveBeenCalledWith(1);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('_cleanSensitiveData', () => {
    test('debería eliminar datos sensibles', () => {
      // Arrange
      const data = {
        apiKeys: ['key1'],
        credentials: 'secret',
        secrets: ['secret1'],
        normal: 'data'
      };

      // Act
      const result = exportService._cleanSensitiveData(data);

      // Assert
      expect(result).not.toHaveProperty('apiKeys');
      expect(result).not.toHaveProperty('credentials');
      expect(result).not.toHaveProperty('secrets');
      expect(result).toHaveProperty('normal', 'data');
    });
  });
});
