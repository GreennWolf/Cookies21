const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const logger = require('../utils/logger');
const { formatDate } = require('../utils/dateHelpers');

class ExportService {
  // Exportar registros de auditoría
  async exportAuditLogs(logs, format = 'csv', options = {}) {
    try {
      switch (format.toLowerCase()) {
        case 'csv':
          return await this._exportToCSV(logs, {
            fields: ['timestamp', 'action', 'resourceType', 'changes'],
            ...options
          });
        case 'excel':
          return await this._exportToExcel(logs, {
            sheetName: 'Audit Logs',
            columns: [
              { header: 'Timestamp', key: 'timestamp' },
              { header: 'Action', key: 'action' },
              { header: 'Resource Type', key: 'resourceType' },
              { header: 'Changes', key: 'changes' }
            ],
            ...options
          });
        case 'json':
          return JSON.stringify(logs, null, 2);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting audit logs:', error);
      throw error;
    }
  }

  // Exportar datos de consentimiento
  async exportConsents(consents, format = 'csv', options = {}) {
    try {
      const processedData = this._processConsentData(consents);

      switch (format.toLowerCase()) {
        case 'csv':
          return await this._exportToCSV(processedData, {
            fields: [
              'userId',
              'timestamp',
              'action',
              'purposes',
              'vendors',
              'metadata'
            ],
            ...options
          });
        case 'excel':
          return await this._exportToExcel(processedData, {
            sheetName: 'Consent Records',
            columns: [
              { header: 'User ID', key: 'userId' },
              { header: 'Timestamp', key: 'timestamp' },
              { header: 'Action', key: 'action' },
              { header: 'Purposes', key: 'purposes' },
              { header: 'Vendors', key: 'vendors' },
              { header: 'Metadata', key: 'metadata' }
            ],
            ...options
          });
        case 'json':
          return JSON.stringify(processedData, null, 2);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting consents:', error);
      throw error;
    }
  }

  // Exportar configuración de dominio
  async exportDomainConfig(domain, format = 'json', options = {}) {
    try {
      const config = this._processDomainConfig(domain);

      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(config, null, 2);
        case 'yaml':
          return await this._exportToYAML(config);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting domain config:', error);
      throw error;
    }
  }

  // Exportar backup completo
  async exportBackup(data, options = {}) {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      const chunks = [];

      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Agregar archivos al zip
      if (data.consents) {
        archive.append(
          JSON.stringify(data.consents, null, 2),
          { name: 'consents.json' }
        );
      }

      if (data.cookies) {
        archive.append(
          JSON.stringify(data.cookies, null, 2),
          { name: 'cookies.json' }
        );
      }

      if (data.config) {
        archive.append(
          JSON.stringify(data.config, null, 2),
          { name: 'config.json' }
        );
      }

      if (data.logs) {
        archive.append(
          JSON.stringify(data.logs, null, 2),
          { name: 'audit_logs.json' }
        );
      }

      archive.finalize();
    });
  }

  // Métodos privados
  async _exportToCSV(data, options) {
    const {
      fields,
      delimiter = ',',
      transforms = []
    } = options;

    const parser = new Parser({
      fields,
      delimiter,
      transforms
    });

    return parser.parse(data);
  }

  async _exportToExcel(data, options) {
    const {
      sheetName = 'Sheet1',
      columns,
      transforms = {}
    } = options;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);

    // Configurar columnas
    sheet.columns = columns;

    // Aplicar transformaciones y agregar filas
    const transformedData = data.map(row => {
      const transformedRow = {};
      columns.forEach(({ key }) => {
        transformedRow[key] = transforms[key] 
          ? transforms[key](row[key])
          : row[key];
      });
      return transformedRow;
    });

    sheet.addRows(transformedData);

    // Aplicar estilos
    sheet.getRow(1).font = { bold: true };
    columns.forEach((col, i) => {
      sheet.getColumn(i + 1).width = 15;
    });

    return await workbook.xlsx.writeBuffer();
  }

  async _exportToYAML(data) {
    const YAML = require('yaml');
    return YAML.stringify(data);
  }

  _processConsentData(consents) {
    return consents.map(consent => ({
      userId: consent.userId,
      timestamp: formatDate(consent.createdAt),
      action: consent.action,
      purposes: this._formatPurposes(consent.decisions.purposes),
      vendors: this._formatVendors(consent.decisions.vendors),
      metadata: JSON.stringify(consent.metadata)
    }));
  }

  _processDomainConfig(domain) {
    return {
      domain: domain.domain,
      settings: domain.settings,
      bannerConfig: domain.bannerConfig,
      integrations: this._cleanSensitiveData(domain.integrations)
    };
  }

  _formatPurposes(purposes) {
    return purposes
      .map(p => `${p.id}:${p.allowed ? 'yes' : 'no'}`)
      .join(';');
  }

  _formatVendors(vendors) {
    return vendors
      .map(v => `${v.id}:${v.allowed ? 'yes' : 'no'}`)
      .join(';');
  }

  _cleanSensitiveData(data) {
    const cleaned = { ...data };
    delete cleaned.apiKeys;
    delete cleaned.credentials;
    delete cleaned.secrets;
    return cleaned;
  }
}

module.exports = new ExportService();