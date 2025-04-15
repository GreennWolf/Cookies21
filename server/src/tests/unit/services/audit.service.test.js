const mongoose = require('mongoose');
const Audit = require('../../../models/Audit');
const logger = require('../../../utils/logger');
const { getDifferences } = require('../../../utils/objectHelpers');
const auditService = require('../../../services/audit.service');

jest.mock('../../../models/Audit');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/objectHelpers');

describe('AuditService', () => {
  let mockObjectId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockObjectId = new mongoose.Types.ObjectId();
  });

  describe('logAction', () => {
    test('debería registrar una acción de auditoría', async () => {
      const actionData = {
        clientId: mockObjectId,
        userId: mockObjectId,
        action: 'create',
        resourceType: 'domain',
        resourceId: mockObjectId,
        changes: [],
        metadata: { status: 'success' },
        context: { ipAddress: '127.0.0.1' }
      };

      const mockAudit = {
        _id: mockObjectId,
        ...actionData,
        severity: 'low',
        timestamp: expect.any(Date)
      };

      Audit.create.mockResolvedValue(mockAudit);

      const result = await auditService.logAction(actionData);

      expect(Audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...actionData,
          metadata: { status: 'success' },
          severity: expect.any(String),
          timestamp: expect.any(Date)
        })
      );

      expect(result).toEqual(mockAudit);
    });

    test('debería asignar severidad crítica para acciones sensibles', async () => {
      const criticalAction = {
        action: 'delete',
        resourceType: 'apiKey',
        clientId: mockObjectId,
        userId: mockObjectId
      };

      Audit.create.mockResolvedValue({
        _id: mockObjectId,
        ...criticalAction,
        changes: [],
        metadata: {},
        severity: 'critical',
        timestamp: new Date()
      });

      await auditService.logAction(criticalAction);

      expect(Audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical'
        })
      );
    });

    test('debería manejar errores al registrar acción', async () => {
      const error = new Error('Database error');
      Audit.create.mockRejectedValue(error);

      await expect(auditService.logAction({}))
        .rejects.toThrow('Error logging audit action:');

      expect(logger.error).toHaveBeenCalledWith(
        'Error logging audit action:',
        error
      );
    });
  });

  describe('logResourceChange', () => {
    test('debería registrar cambios en un recurso', async () => {
      const changeData = {
        clientId: mockObjectId,
        userId: mockObjectId,
        resourceType: 'domain',
        resourceId: mockObjectId,
        oldData: { name: 'old', status: 'active' },
        newData: { name: 'new', status: 'active' }
      };

      const mockChanges = [
        { field: 'name', oldValue: 'old', newValue: 'new' }
      ];

      getDifferences.mockReturnValue(mockChanges);

      Audit.create.mockResolvedValue({
        _id: mockObjectId,
        clientId: changeData.clientId,
        userId: changeData.userId,
        action: 'update',
        resourceType: changeData.resourceType,
        resourceId: changeData.resourceId,
        changes: mockChanges,
        metadata: { status: 'success' },
        context: {
          previousState: changeData.oldData,
          newState: changeData.newData
        },
        severity: 'low',
        timestamp: new Date()
      });

      await auditService.logResourceChange(changeData);

      expect(Audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          changes: mockChanges,
          metadata: expect.objectContaining({
            status: 'success'
          }),
          context: {
            previousState: changeData.oldData,
            newState: changeData.newData
          }
        })
      );
    });

    test('debería omitir registro si no hay cambios', async () => {
      getDifferences.mockReturnValue([]);

      const result = await auditService.logResourceChange({
        oldData: { name: 'same' },
        newData: { name: 'same' }
      });

      expect(result).toBeNull();
      expect(Audit.create).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'No changes detected, skipping audit log'
      );
    });

    test('debería manejar errores al registrar cambios', async () => {
      const error = new Error('Error comparing objects');
      getDifferences.mockImplementation(() => {
        throw error;
      });

      await expect(
        auditService.logResourceChange({
          oldData: {},
          newData: {}
        })
      ).rejects.toThrow('Error logging resource change:');

      expect(logger.error).toHaveBeenCalledWith(
        'Error logging resource change:',
        error
      );
    });
  });

  describe('logConsentChange', () => {
    test('debería registrar nuevo consentimiento', async () => {
      const consentChange = {
        domainId: mockObjectId,
        userId: mockObjectId,
        action: 'create',
        newConsent: {
          _id: mockObjectId,
          decisions: {
            purposes: [{ id: 1, allowed: true }],
            vendors: [{ id: 1, allowed: true }]
          },
          tcString: 'mock-tc-string'
        },
        context: { clientId: mockObjectId }
      };

      Audit.create.mockResolvedValue({
        _id: mockObjectId,
        clientId: consentChange.context.clientId,
        userId: consentChange.userId,
        action: 'create',
        resourceType: 'consent',
        resourceId: mockObjectId,
        changes: [{
          type: 'create',
          data: consentChange.newConsent
        }],
        metadata: {
          status: 'success',
          tcString: 'mock-tc-string'
        },
        context: {
          domainId: consentChange.domainId,
          previousConsent: undefined,
          newConsent: consentChange.newConsent
        },
        severity: 'low',
        timestamp: new Date()
      });

      await auditService.logConsentChange(consentChange);

      expect(Audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'consent',
          resourceId: mockObjectId,
          action: 'create',
          changes: [{
            type: 'create',
            data: consentChange.newConsent
          }],
          metadata: {
            status: 'success',
            tcString: 'mock-tc-string'
          }
        })
      );
    });

    test('debería registrar actualización de consentimiento', async () => {
      const consentChange = {
        domainId: mockObjectId,
        userId: mockObjectId,
        action: 'update',
        oldConsent: {
          decisions: {
            purposes: [
              { id: 1, allowed: false },
              { id: 2, allowed: true }
            ],
            vendors: [{ id: 1, allowed: false }]
          }
        },
        newConsent: {
          decisions: {
            purposes: [
              { id: 1, allowed: true },
              { id: 2, allowed: true }
            ],
            vendors: [{ id: 1, allowed: true }]
          },
          tcString: 'mock-tc-string'
        }
      };

      Audit.create.mockResolvedValue({
        _id: mockObjectId,
        clientId: undefined,
        userId: consentChange.userId,
        action: 'update',
        resourceType: 'consent',
        resourceId: consentChange.newConsent._id,
        changes: [
          {
            type: 'modify',
            field: 'purposes',
            id: 1,
            oldValue: { id: 1, allowed: false },
            newValue: { id: 1, allowed: true }
          },
          {
            type: 'modify',
            field: 'vendors',
            id: 1,
            oldValue: { id: 1, allowed: false },
            newValue: { id: 1, allowed: true }
          }
        ],
        metadata: {
          status: 'success',
          tcString: 'mock-tc-string'
        },
        context: {
          domainId: consentChange.domainId,
          previousConsent: consentChange.oldConsent,
          newConsent: consentChange.newConsent
        },
        severity: 'low',
        timestamp: new Date()
      });

      await auditService.logConsentChange(consentChange);

      expect(Audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.arrayContaining([
            expect.objectContaining({
              type: 'modify',
              field: 'purposes',
              id: 1,
              oldValue: expect.objectContaining({ allowed: false }),
              newValue: expect.objectContaining({ allowed: true })
            }),
            expect.objectContaining({
              type: 'modify',
              field: 'vendors',
              id: 1,
              oldValue: expect.objectContaining({ allowed: false }),
              newValue: expect.objectContaining({ allowed: true })
            })
          ])
        })
      );
    });

    test('debería manejar errores al registrar cambios de consentimiento', async () => {
      const error = new Error('Invalid consent data');
      Audit.create.mockRejectedValue(error);

      await expect(
        auditService.logConsentChange({
          action: 'update',
          oldConsent: {},
          newConsent: {}
        })
      ).rejects.toThrow('Error logging consent change:');

      expect(logger.error).toHaveBeenCalledWith(
        'Error logging consent change:',
        error
      );
    });
  });

  describe('logError', () => {
    test('debería registrar un error con severidad alta', async () => {
      const errorData = {
        clientId: mockObjectId,
        userId: mockObjectId,
        error: new Error('Test error'),
        resourceType: 'domain',
        resourceId: mockObjectId,
        context: { path: '/api/domains' }
      };

      const mockAudit = {
        _id: mockObjectId,
        clientId: errorData.clientId,
        userId: errorData.userId,
        action: 'error',
        resourceType: errorData.resourceType,
        resourceId: errorData.resourceId,
        changes: [],
        metadata: {
          status: 'error',
          errorMessage: 'Test error',
          errorStack: expect.any(String),
          errorCode: undefined
        },
        context: errorData.context,
        severity: 'high',
        timestamp: new Date()
      };

      Audit.create.mockResolvedValue(mockAudit);

      const result = await auditService.logError(errorData);

      expect(Audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          severity: 'high',
          metadata: expect.objectContaining({
            status: 'error',
            errorMessage: 'Test error',
            errorStack: expect.any(String)
          })
        })
      );

      expect(result).toEqual(mockAudit);
    });
  });

  describe('getResourceHistory', () => {
    test('debería obtener historial completo de un recurso', async () => {
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        includeChanges: true,
        sortOrder: 'desc'
      };

      const mockHistory = [
        {
          action: 'create',
          timestamp: new Date('2024-01-01'),
          userId: { name: 'User 1', email: 'user1@test.com' }
        },
        {
          action: 'update',
          timestamp: new Date('2024-01-15'),
          userId: { name: 'User 2', email: 'user2@test.com' }
        }
      ];

      const selectMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockResolvedValue(mockHistory);
      Audit.find.mockReturnValue({
        select: selectMock,
        sort: sortMock,
        populate: populateMock
      });

      const result = await auditService.getResourceHistory(
        'domain',
        mockObjectId,
        options
      );

      expect(Audit.find).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'domain',
          resourceId: mockObjectId,
          timestamp: {
            $gte: options.startDate,
            $lte: options.endDate
          }
        })
      );

      expect(selectMock).toHaveBeenCalledWith('+changes');
      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
      expect(result).toEqual(mockHistory);
    });

    test('debería filtrar campos según opciones', async () => {
      const options = {
        includeChanges: false,
        sortOrder: 'asc'
      };

      const selectMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockReturnThis();
      const populateMock = jest.fn().mockResolvedValue([]);
      Audit.find.mockReturnValue({
        select: selectMock,
        sort: sortMock,
        populate: populateMock
      });

      await auditService.getResourceHistory('domain', mockObjectId, options);

      expect(selectMock).toHaveBeenCalledWith('-changes');
      expect(sortMock).toHaveBeenCalledWith({ timestamp: 1 });
    });

    test('debería manejar errores al obtener historial', async () => {
      const error = new Error('Database error');
      Audit.find.mockImplementation(() => {
        throw error;
      });

      await expect(
        auditService.getResourceHistory('domain', mockObjectId)
      ).rejects.toThrow('Error getting resource history:');

      expect(logger.error).toHaveBeenCalledWith(
        'Error getting resource history:',
        error
      );
    });
  });

  describe('_determineSeverity', () => {
    const testCases = [
      { action: 'delete', resourceType: 'apiKey', expected: 'critical' },
      { action: 'delete', resourceType: 'domain', expected: 'high' },
      { action: 'update', resourceType: 'apiKey', expected: 'medium' },
      { action: 'read', resourceType: 'banner', expected: 'low' }
    ];

    testCases.forEach(({ action, resourceType, expected }) => {
      test(`debería retornar severidad ${expected} para acción ${action} en recurso ${resourceType}`, () => {
        const result = auditService._determineSeverity(action, resourceType);
        expect(result).toBe(expected);
      });
    });
  });

  describe('_compareArrays', () => {
    test('debería detectar elementos añadidos, modificados y eliminados', () => {
      const oldArray = [
        { id: 1, value: 'old' },
        { id: 2, value: 'unchanged' }
      ];

      const newArray = [
        { id: 1, value: 'new' },
        { id: 2, value: 'unchanged' },
        { id: 3, value: 'added' }
      ];

      const changes = [];
      auditService._compareArrays(oldArray, newArray, 'test', changes);

      expect(changes).toEqual(expect.arrayContaining([
        {
          type: 'modify',
          field: 'test',
          id: 1,
          oldValue: expect.objectContaining({ value: 'old' }),
          newValue: expect.objectContaining({ value: 'new' })
        },
        {
          type: 'add',
          field: 'test',
          id: 3,
          value: expect.objectContaining({ value: 'added' })
        }
      ]));
    });
  });
});
