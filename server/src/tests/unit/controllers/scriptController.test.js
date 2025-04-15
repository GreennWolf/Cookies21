// tests/unit/controllers/scriptController.test.js

const ScriptController = require('../../../controllers/ScriptController');
const Script = require('../../../models/Script');
const Domain = require('../../../models/Domain');
const { validateScript } = require('../../../utils/scriptValidator');
const { sanitizeScript } = require('../../../utils/scriptSanitizer');
const { describe, test, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../models/Script');
jest.mock('../../../models/Domain');
jest.mock('../../../utils/scriptValidator');
jest.mock('../../../utils/scriptSanitizer');

describe('ScriptController', () => {
  let req;
  let res;
  let next;
  const mockDomainId = 'mock-domain-id';
  const mockClientId = 'mock-client-id';

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      clientId: mockClientId,
      userId: 'mock-user-id'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();

    // Mock del dominio por defecto
    Domain.findOne.mockResolvedValue({
      _id: mockDomainId,
      clientId: mockClientId
    });
  });

  describe('getScripts', () => {
    test('debería obtener scripts de un dominio', async () => {
      // Arrange
      req.params.domainId = mockDomainId;
      req.query = {
        category: 'analytics',
        type: 'external',
        status: 'active'
      };

      const mockScripts = [
        {
          name: 'Google Analytics',
          type: 'external',
          category: 'analytics',
          status: 'active'
        }
      ];

      Script.find.mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(mockScripts)
      }));

      // Act
      await ScriptController.getScripts(req, res, next);

      // Assert
      expect(Script.find).toHaveBeenCalledWith({
        domainId: mockDomainId,
        category: 'analytics',
        type: 'external',
        status: 'active'
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { scripts: mockScripts }
      });
    });
  });

  describe('createScript', () => {
    test('debería crear un script externo exitosamente', async () => {
      // Arrange
      const scriptData = {
        domainId: mockDomainId,
        name: 'Google Analytics',
        provider: 'Google',
        category: 'analytics',
        type: 'external',
        url: 'https://www.google-analytics.com/analytics.js',
        loadConfig: {
          async: true,
          defer: false
        }
      };

      req.body = scriptData;

      const mockCreatedScript = {
        _id: 'mock-script-id',
        ...scriptData,
        metadata: {
          createdBy: 'user',
          lastModifiedBy: req.userId
        }
      };

      Script.create.mockResolvedValueOnce(mockCreatedScript);

      // Act
      await ScriptController.createScript(req, res, next);

      // Assert
      expect(Script.create).toHaveBeenCalledWith(expect.objectContaining({
        ...scriptData,
        metadata: expect.objectContaining({
          createdBy: 'user',
          lastModifiedBy: req.userId
        })
      }));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { script: mockCreatedScript }
      });
    });

    test('debería validar y sanitizar scripts inline', async () => {
      // Arrange
      const scriptContent = 'console.log("test");';
      const scriptData = {
        domainId: mockDomainId,
        name: 'Custom Script',
        type: 'inline',
        category: 'analytics',
        content: scriptContent
      };

      req.body = scriptData;

      validateScript.mockResolvedValueOnce({ isValid: true });
      sanitizeScript.mockReturnValueOnce(scriptContent);
      Script.create.mockResolvedValueOnce({ ...scriptData, _id: 'mock-script-id' });

      // Act
      await ScriptController.createScript(req, res, next);

      // Assert
      expect(validateScript).toHaveBeenCalledWith(scriptContent);
      expect(sanitizeScript).toHaveBeenCalledWith(scriptContent);
      expect(Script.create).toHaveBeenCalledWith(expect.objectContaining({
        content: scriptContent
      }));
    });
  });

  describe('updateScript', () => {
    test('debería actualizar un script exitosamente', async () => {
      // Arrange
      const scriptId = 'mock-script-id';
      const updates = {
        name: 'Updated Script',
        loadConfig: {
          async: false
        }
      };

      req.params.id = scriptId;
      req.body = updates;

      const mockScript = {
        _id: scriptId,
        domainId: {
          clientId: mockClientId
        },
        metadata: {
          version: 1
        }
      };

      Script.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockScript)
      });

      const updatedScript = {
        ...mockScript,
        ...updates,
        metadata: {
          version: 2,
          lastModifiedBy: req.userId
        }
      };

      Script.findByIdAndUpdate.mockResolvedValueOnce(updatedScript);

      // Act
      await ScriptController.updateScript(req, res, next);

      // Assert
      expect(Script.findByIdAndUpdate).toHaveBeenCalledWith(
        scriptId,
        {
          ...updates,
          metadata: expect.objectContaining({
            version: 2,
            lastModifiedBy: req.userId
          })
        },
        { new: true, runValidators: true }
      );
    });
  });

  describe('updateLoadOrder', () => {
    test('debería actualizar el orden de carga de scripts', async () => {
      // Arrange
      req.params.domainId = mockDomainId;
      const scriptOrder = [
        { scriptId: 'script-1', loadOrder: 0 },
        { scriptId: 'script-2', loadOrder: 1 }
      ];
      req.body = { scriptOrder };

      const mockScripts = [
        { _id: 'script-1', name: 'First Script' },
        { _id: 'script-2', name: 'Second Script' }
      ];

      Script.findByIdAndUpdate.mockResolvedValue({});
      Script.find.mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(mockScripts)
      }));

      // Act
      await ScriptController.updateLoadOrder(req, res, next);

      // Assert
      expect(Script.find).toHaveBeenCalledWith({ domainId: mockDomainId });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { scripts: mockScripts }
      });
    });
  });

  describe('checkExternalScripts', () => {
    test('debería verificar scripts externos', async () => {
      // Arrange
      req.params.domainId = mockDomainId;
      
      const mockScript = {
        _id: 'script-1',
        checkForUpdates: jest.fn().mockResolvedValue({ hasChanged: false })
      };

      Script.find.mockResolvedValue([mockScript]);

      // Act
      await ScriptController.checkExternalScripts(req, res, next);

      // Assert
      expect(mockScript.checkForUpdates).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          results: expect.arrayContaining([
            expect.objectContaining({
              scriptId: mockScript._id,
              hasChanged: false
            })
          ])
        }
      });
    });
  });

  describe('generateScriptTags', () => {
    test('debería generar HTML para scripts activos', async () => {
      // Arrange
      req.params.domainId = mockDomainId;
      
      const mockScript = {
        status: 'active',
        generateHtml: jest.fn().mockReturnValue('<script src="test.js"></script>')
      };

      Script.find.mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue([mockScript])
      }));

      // Act
      await ScriptController.generateScriptTags(req, res, next);

      // Assert
      expect(mockScript.generateHtml).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          scriptTags: ['<script src="test.js"></script>']
        }
      });
    });
  });
});
