// tests/unit/services/bannerTemplate.service.test.js

const BannerTemplate = require('../../../models/BannerTemplate');
const Domain = require('../../../models/Domain');
const { validateBannerConfig } = require('../../../utils/bannerValidator');
const { generateHTML, generateCSS } = require('../../../services/bannerGenerator.service');
const bannerTemplateService = require('../../../services/bannerTemplate.service');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../models/BannerTemplate');
jest.mock('../../../models/Domain');
jest.mock('../../../utils/bannerValidator');
jest.mock('../../../services/bannerGenerator.service');
jest.mock('../../../utils/logger');

describe('BannerTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    test('debería crear un template exitosamente', async () => {
      const templateData = {
        name: 'Test Template',
        type: 'custom',
        clientId: 'client-1',
        components: [
          {
            type: 'button',
            id: 'accept-all',
            action: { type: 'accept_all' }
          }
        ]
      };

      const mockTemplate = {
        _id: 'template-1',
        ...templateData
      };

      validateBannerConfig.mockResolvedValue({ isValid: true });
      BannerTemplate.create.mockResolvedValue(mockTemplate);
      BannerTemplate.countDocuments.mockResolvedValue(5);

      const result = await bannerTemplateService.createTemplate(templateData);

      expect(BannerTemplate.create).toHaveBeenCalledWith(expect.objectContaining({
        ...templateData,
        metadata: expect.objectContaining({
          version: 1
        })
      }));

      expect(result).toEqual(mockTemplate);
    });

    test('debería validar límite de templates', async () => {
      BannerTemplate.countDocuments.mockResolvedValue(10);

      await expect(bannerTemplateService.createTemplate({
        clientId: 'client-1'
      })).rejects.toThrow('Maximum number of templates reached');
    });
  });

  describe('generatePreview', () => {
    test('debería generar preview del template', async () => {
      const config = {
        layout: { type: 'modal' },
        components: []
      };

      const domainId = 'domain-1';
      const mockDomain = {
        settings: {
          design: { theme: 'light' }
        }
      };

      Domain.findById.mockResolvedValue(mockDomain);
      validateBannerConfig.mockResolvedValue({ isValid: true });
      generateHTML.mockResolvedValue('<div>Preview</div>');
      generateCSS.mockResolvedValue('.preview { color: blue; }');

      const result = await bannerTemplateService.generatePreview(config, domainId);

      expect(result).toEqual({
        html: '<div>Preview</div>',
        css: '.preview { color: blue; }',
        config: expect.objectContaining({
          domain: mockDomain.settings
        })
      });
    });
  });

  describe('updateTemplate', () => {
    test('debería actualizar template existente', async () => {
      const templateId = 'template-1';
      const updates = {
        name: 'Updated Template',
        components: [
          {
            type: 'button',
            id: 'reject-all',
            action: { type: 'reject_all' }
          }
        ]
      };

      const mockTemplate = {
        _id: templateId,
        clientId: 'client-1',
        type: 'custom',
        metadata: { version: 1 }
      };

      BannerTemplate.findOne.mockResolvedValue(mockTemplate);
      validateBannerConfig.mockResolvedValue({ isValid: true });

      const updatedTemplate = {
        ...mockTemplate,
        ...updates,
        metadata: { version: 2 }
      };

      BannerTemplate.findByIdAndUpdate.mockResolvedValue(updatedTemplate);

      const result = await bannerTemplateService.updateTemplate(
        templateId,
        'client-1',
        'user-1',
        updates
      );

      expect(result).toEqual(updatedTemplate);
    });

    test('debería validar componentes requeridos', async () => {
      const updates = {
        components: [
          { type: 'text', id: 'text-1' }
        ]
      };

      await expect(bannerTemplateService.updateTemplate(
        'template-1',
        'client-1',
        'user-1',
        updates
      )).rejects.toThrow('Missing required components');
    });
  });

  describe('cloneTemplate', () => {
    test('debería clonar template exitosamente', async () => {
      const sourceTemplate = {
        _id: 'template-1',
        name: 'Original Template',
        components: [
          {
            type: 'button',
            id: 'accept-all',
            action: { type: 'accept_all' }
          }
        ],
        metadata: { version: 1 }
      };

      const cloneData = {
        name: 'Cloned Template',
        customizations: {
          'accept-all': {
            style: { backgroundColor: 'blue' }
          }
        }
      };

      BannerTemplate.findOne.mockResolvedValue(sourceTemplate);
      BannerTemplate.countDocuments.mockResolvedValue(5);

      const clonedTemplate = {
        ...sourceTemplate,
        _id: 'template-2',
        name: cloneData.name
      };

      BannerTemplate.create.mockResolvedValue(clonedTemplate);

      const result = await bannerTemplateService.cloneTemplate(
        'template-1',
        'client-1',
        'user-1',
        cloneData
      );

      expect(BannerTemplate.create).toHaveBeenCalledWith(expect.objectContaining({
        name: cloneData.name,
        type: 'custom',
        metadata: expect.objectContaining({
          version: 1
        })
      }));

      expect(result).toEqual(clonedTemplate);
    });
  });

  describe('getTemplateVersions', () => {
    test('debería obtener historial de versiones', async () => {
      const templateId = 'template-1';
      const mockTemplate = {
        _id: templateId,
        metadata: { version: 3 }
      };

      const mockVersions = [
        {
          metadata: { version: 3 },
          timestamp: new Date(),
          changes: [{ field: 'name', oldValue: 'Old', newValue: 'New' }]
        }
      ];

      BannerTemplate.findOne.mockResolvedValue(mockTemplate);
      // Mock para Audit.find() aquí si es necesario

      const result = await bannerTemplateService.getTemplateVersions(
        templateId,
        'client-1',
        { limit: 10 }
      );

      expect(result).toEqual({
        currentVersion: 3,
        versions: mockVersions
      });
    });
  });
});