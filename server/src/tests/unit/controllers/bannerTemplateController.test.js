// tests/unit/controllers/bannerTemplateController.test.js

const BannerTemplateController = require('../../../controllers/BannerTemplateController');
const BannerTemplate = require('../../../models/BannerTemplate');
const Domain = require('../../../models/Domain');
const { validateBannerConfig } = require('../../../utils/bannerValidator');
const { sanitizeStyles } = require('../../../utils/styleSanitizer');
const { generateHTML, generateCSS } = require('../../../services/bannerGenerator.service');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
// Mocks
jest.mock('../../../models/BannerTemplate');
jest.mock('../../../models/Domain');
jest.mock('../../../utils/bannerValidator');
jest.mock('../../../utils/styleSanitizer');
jest.mock('../../../services/bannerGenerator.service');

describe('BannerTemplateController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      clientId: 'mock-client-id',
      userId: 'mock-user-id'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    test('debería crear un template exitosamente', async () => {
      // Arrange
      const templateData = {
        name: 'Test Template',
        layout: {
          type: 'modal',
          position: 'center'
        },
        components: [
          {
            type: 'button',
            id: 'accept-all',
            action: { type: 'accept_all' }
          }
        ]
      };

      req.body = templateData;

      validateBannerConfig.mockResolvedValue({ isValid: true });
      sanitizeStyles.mockImplementation(styles => styles);

      const mockTemplate = {
        _id: 'mock-template-id',
        ...templateData,
        clientId: req.clientId,
        type: 'custom'
      };

      BannerTemplate.create.mockResolvedValue(mockTemplate);
      BannerTemplate.countDocuments.mockResolvedValue(5); // Simular que hay 5 templates

      // Act
      await BannerTemplateController.createTemplate(req, res, next);

      // Assert
      expect(BannerTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...templateData,
          clientId: req.clientId,
          type: 'custom',
          metadata: expect.objectContaining({
            createdBy: req.userId,
            version: 1
          })
        })
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { template: mockTemplate }
      });
    });

    test('debería validar configuración inválida', async () => {
      // Arrange
      const invalidTemplate = {
        name: 'Invalid Template',
        layout: { type: 'invalid' }
      };

      req.body = invalidTemplate;

      validateBannerConfig.mockResolvedValue({
        isValid: false,
        errors: ['Invalid layout type']
      });

      // Act
      await BannerTemplateController.createTemplate(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid banner configuration')
        })
      );
    });
  });

  describe('previewTemplate', () => {
    test('debería generar una previsualización del template', async () => {
      // Arrange
      const config = {
        layout: { type: 'modal', position: 'center' },
        components: []
      };

      req.body = { config };
      req.query = { domainId: 'mock-domain-id' };

      const mockDomain = {
        settings: {
          design: { theme: 'light' }
        }
      };

      Domain.findById.mockResolvedValue(mockDomain);
      validateBannerConfig.mockResolvedValue({ isValid: true });
      generateHTML.mockResolvedValue('<div>Mock HTML</div>');
      generateCSS.mockResolvedValue('.mock-css { color: blue; }');

      // Act
      await BannerTemplateController.previewTemplate(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          preview: expect.objectContaining({
            html: expect.any(String),
            css: expect.any(String),
            config: expect.any(Object)
          })
        }
      });
    });
  });
});