const request = require('supertest');
const app = require('../../../app');
const CookieAnalysisResult = require('../../../models/CookieAnalysisResult');
const Domain = require('../../../models/Domain');
const { AnalysisWorker } = require('../../../jobs/advancedCookieAnalysisWorker');

// Mock de los modelos
jest.mock('../../../models/CookieAnalysisResult');
jest.mock('../../../models/Domain');
jest.mock('../../../jobs/advancedCookieAnalysisWorker');

// Mock del servicio de análisis
jest.mock('../../../services/advancedCookieAnalyzer.service', () => ({
  startAnalysis: jest.fn()
}));

describe('Advanced Cookie Analysis Controller', () => {
  let authToken;
  const mockDomainId = '507f1f77bcf86cd799439011';
  const mockAnalysisId = '507f1f77bcf86cd799439012';
  const mockUserId = '507f1f77bcf86cd799439013';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de autenticación
    authToken = 'mock-jwt-token';
    
    // Mock común de Domain
    Domain.findById = jest.fn();
    
    // Mock común de CookieAnalysisResult
    CookieAnalysisResult.findById = jest.fn();
    CookieAnalysisResult.getActiveAnalysis = jest.fn();
    CookieAnalysisResult.getCookieTrends = jest.fn();
    CookieAnalysisResult.countDocuments = jest.fn();
    CookieAnalysisResult.find = jest.fn();
  });

  describe('POST /api/v1/advanced-analysis/domain/:domainId/start', () => {
    const validConfig = {
      scanType: 'full',
      includeSubdomains: true,
      maxUrls: 100,
      depth: 5,
      priority: 'normal'
    };

    test('should start analysis successfully', async () => {
      // Mock domain exists
      Domain.findById.mockResolvedValue({
        _id: mockDomainId,
        domain: 'example.com',
        clientId: 'client123'
      });

      // Mock no active analysis
      CookieAnalysisResult.getActiveAnalysis.mockResolvedValue(null);

      // Mock analysis creation
      const mockAnalysis = {
        _id: mockAnalysisId,
        scanId: 'scan_123',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true)
      };
      
      CookieAnalysisResult.prototype.save = jest.fn().mockResolvedValue(mockAnalysis);
      
      // Mock worker job
      AnalysisWorker.addAnalysisJob = jest.fn().mockResolvedValue({ id: 'job_123' });

      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${mockDomainId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validConfig);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('analysisId');
      expect(response.body.data).toHaveProperty('scanId');
    });

    test('should reject invalid domain ID', async () => {
      const response = await request(app)
        .post('/api/v1/advanced-analysis/domain/invalid-id/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validConfig);

      expect(response.status).toBe(400);
    });

    test('should reject if domain not found', async () => {
      Domain.findById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${mockDomainId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validConfig);

      expect(response.status).toBe(404);
    });

    test('should reject if analysis already in progress', async () => {
      Domain.findById.mockResolvedValue({
        _id: mockDomainId,
        domain: 'example.com',
        clientId: 'client123'
      });

      CookieAnalysisResult.getActiveAnalysis.mockResolvedValue({
        _id: 'active_analysis',
        status: 'running'
      });

      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${mockDomainId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validConfig);

      expect(response.status).toBe(400);
    });

    test('should validate scan configuration', async () => {
      Domain.findById.mockResolvedValue({
        _id: mockDomainId,
        domain: 'example.com',
        clientId: 'client123'
      });

      const invalidConfig = {
        scanType: 'invalid',
        maxUrls: 2000, // Exceeds limit
        depth: 15 // Exceeds limit
      };

      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${mockDomainId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidConfig);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/advanced-analysis/analysis/:analysisId/status', () => {
    test('should return analysis status', async () => {
      const mockAnalysis = {
        _id: mockAnalysisId,
        scanId: 'scan_123',
        domain: 'example.com',
        status: 'running',
        progress: {
          percentage: 50,
          currentPhase: 'analysis',
          currentStep: 'Analyzing cookies'
        },
        domainId: {
          clientId: 'client123'
        }
      };

      CookieAnalysisResult.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAnalysis)
      });

      const response = await request(app)
        .get(`/api/v1/advanced-analysis/analysis/${mockAnalysisId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.analysis).toHaveProperty('status', 'running');
      expect(response.body.data.analysis.progress).toHaveProperty('percentage', 50);
    });

    test('should return 404 for non-existent analysis', async () => {
      CookieAnalysisResult.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .get(`/api/v1/advanced-analysis/analysis/${mockAnalysisId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/advanced-analysis/analysis/:analysisId/results', () => {
    test('should return complete analysis results', async () => {
      const mockAnalysis = {
        _id: mockAnalysisId,
        scanId: 'scan_123',
        domain: 'example.com',
        status: 'completed',
        cookies: [
          { name: 'test_cookie', category: 'analytics', provider: { name: 'Google' } }
        ],
        statistics: {
          totalCookies: 1,
          complianceScore: { overall: 85 }
        },
        domainId: {
          clientId: 'client123'
        }
      };

      CookieAnalysisResult.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAnalysis)
      });

      const response = await request(app)
        .get(`/api/v1/advanced-analysis/analysis/${mockAnalysisId}/results`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ includeDetails: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.summary).toHaveProperty('totalCookies', 1);
      expect(response.body.data).toHaveProperty('detailed');
    });

    test('should reject if analysis not completed', async () => {
      const mockAnalysis = {
        _id: mockAnalysisId,
        status: 'running',
        domainId: {
          clientId: 'client123'
        }
      };

      CookieAnalysisResult.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAnalysis)
      });

      const response = await request(app)
        .get(`/api/v1/advanced-analysis/analysis/${mockAnalysisId}/results`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/advanced-analysis/analysis/:analysisId/cancel', () => {
    test('should cancel running analysis', async () => {
      const mockAnalysis = {
        _id: mockAnalysisId,
        status: 'running',
        save: jest.fn().mockResolvedValue(true),
        domainId: {
          clientId: 'client123'
        }
      };

      CookieAnalysisResult.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAnalysis)
      });

      const response = await request(app)
        .post(`/api/v1/advanced-analysis/analysis/${mockAnalysisId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(mockAnalysis.status).toBe('cancelled');
      expect(mockAnalysis.save).toHaveBeenCalled();
    });

    test('should reject cancelling non-running analysis', async () => {
      const mockAnalysis = {
        _id: mockAnalysisId,
        status: 'completed',
        domainId: {
          clientId: 'client123'
        }
      };

      CookieAnalysisResult.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAnalysis)
      });

      const response = await request(app)
        .post(`/api/v1/advanced-analysis/analysis/${mockAnalysisId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/advanced-analysis/domain/:domainId/history', () => {
    test('should return analysis history with pagination', async () => {
      Domain.findById.mockResolvedValue({
        _id: mockDomainId,
        domain: 'example.com',
        clientId: 'client123'
      });

      const mockAnalyses = [
        { _id: 'analysis1', scanId: 'scan1', status: 'completed' },
        { _id: 'analysis2', scanId: 'scan2', status: 'running' }
      ];

      CookieAnalysisResult.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockAnalyses)
      });

      CookieAnalysisResult.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get(`/api/v1/advanced-analysis/domain/${mockDomainId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.analyses).toHaveLength(2);
      expect(response.body.data.pagination).toHaveProperty('total', 2);
    });
  });

  describe('GET /api/v1/advanced-analysis/domain/:domainId/trends', () => {
    test('should return cookie trends', async () => {
      Domain.findById.mockResolvedValue({
        _id: mockDomainId,
        domain: 'example.com',
        clientId: 'client123'
      });

      const mockTrends = [
        { date: new Date(), totalCookies: 10, firstPartyCookies: 7 },
        { date: new Date(), totalCookies: 12, firstPartyCookies: 8 }
      ];

      CookieAnalysisResult.getCookieTrends.mockResolvedValue(mockTrends);

      const response = await request(app)
        .get(`/api/v1/advanced-analysis/domain/${mockDomainId}/trends`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ days: 30 });

      expect(response.status).toBe(200);
      expect(response.body.data.trends).toHaveLength(2);
    });
  });

  describe('GET /api/v1/advanced-analysis/compare/:analysisId1/:analysisId2', () => {
    test('should compare two analyses', async () => {
      const mockAnalysis1 = {
        _id: 'analysis1',
        status: 'completed',
        cookies: [{ name: 'cookie1', domain: 'example.com' }],
        technologies: [{ name: 'jQuery' }],
        statistics: { riskAssessment: { privacyRisk: 'low' } },
        updatedAt: new Date('2023-01-01'),
        domainId: { clientId: 'client123' }
      };

      const mockAnalysis2 = {
        _id: 'analysis2',
        status: 'completed',
        cookies: [
          { name: 'cookie1', domain: 'example.com' },
          { name: 'cookie2', domain: 'example.com' }
        ],
        technologies: [{ name: 'jQuery' }, { name: 'React' }],
        statistics: { riskAssessment: { privacyRisk: 'medium' } },
        updatedAt: new Date('2023-01-02'),
        domainId: { clientId: 'client123' }
      };

      CookieAnalysisResult.findById
        .mockResolvedValueOnce({ populate: jest.fn().mockResolvedValue(mockAnalysis1) })
        .mockResolvedValueOnce({ populate: jest.fn().mockResolvedValue(mockAnalysis2) });

      const response = await request(app)
        .get('/api/v1/advanced-analysis/compare/analysis1/analysis2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.comparison).toHaveProperty('summary');
      expect(response.body.data.comparison).toHaveProperty('changes');
    });

    test('should reject comparing same analysis', async () => {
      const response = await request(app)
        .get(`/api/v1/advanced-analysis/compare/${mockAnalysisId}/${mockAnalysisId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/advanced-analysis/domain/:domainId/schedule', () => {
    test('should schedule analysis successfully', async () => {
      Domain.findById.mockResolvedValue({
        _id: mockDomainId,
        domain: 'example.com',
        clientId: 'client123',
        save: jest.fn().mockResolvedValue(true)
      });

      const scheduleConfig = {
        schedule: {
          frequency: 'weekly',
          time: '02:00',
          daysOfWeek: [1, 3, 5]
        },
        analysisConfig: {
          scanType: 'full',
          includeSubdomains: true
        },
        enabled: true
      };

      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${mockDomainId}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleConfig);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    test('should validate schedule configuration', async () => {
      Domain.findById.mockResolvedValue({
        _id: mockDomainId,
        domain: 'example.com',
        clientId: 'client123'
      });

      const invalidSchedule = {
        schedule: {
          frequency: 'invalid',
          time: '25:00' // Invalid time
        }
      };

      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${mockDomainId}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSchedule);

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${mockDomainId}/start`)
        .send({ scanType: 'full' });

      expect(response.status).toBe(401);
    });

    test('should check domain access permissions', async () => {
      Domain.findById.mockResolvedValue({
        _id: mockDomainId,
        domain: 'example.com',
        clientId: 'different_client'
      });

      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${mockDomainId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scanType: 'full' });

      expect(response.status).toBe(403);
    });
  });
});