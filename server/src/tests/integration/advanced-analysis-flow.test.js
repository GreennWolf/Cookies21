const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const CookieAnalysisResult = require('../../models/CookieAnalysisResult');
const Domain = require('../../models/Domain');
const Client = require('../../models/Client');
const UserAccount = require('../../models/UserAccount');
const { AnalysisWorker } = require('../../jobs/advancedCookieAnalysisWorker');

// Mock del worker para evitar procesar trabajos reales
jest.mock('../../jobs/advancedCookieAnalysisWorker', () => ({
  AnalysisWorker: {
    addAnalysisJob: jest.fn().mockResolvedValue({ id: 'mock_job_id' })
  }
}));

describe('Advanced Analysis Integration Flow', () => {
  let client, domain, user, authToken;
  
  beforeAll(async () => {
    // Conectar a base de datos de test
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cookies21_test');
    }
  });

  beforeEach(async () => {
    // Limpiar base de datos
    await CookieAnalysisResult.deleteMany({});
    await Domain.deleteMany({});
    await Client.deleteMany({});
    await UserAccount.deleteMany({});

    // Crear cliente de test
    client = await Client.create({
      name: 'Test Client',
      email: 'test@example.com',
      status: 'active',
      subscription: {
        plan: 'professional',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    // Crear dominio de test
    domain = await Domain.create({
      clientId: client._id,
      domain: 'test-example.com',
      status: 'active'
    });

    // Crear usuario de test
    user = await UserAccount.create({
      clientId: client._id,
      email: 'user@test.com',
      password: 'hashedpassword',
      role: 'admin',
      firstName: 'Test',
      lastName: 'User',
      status: 'active'
    });

    // Mock del token (en un test real se generaría)
    authToken = 'mock-jwt-token';
  });

  afterEach(async () => {
    // Limpiar después de cada test
    await CookieAnalysisResult.deleteMany({});
    await Domain.deleteMany({});
    await Client.deleteMany({});
    await UserAccount.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Complete Analysis Flow', () => {
    test('should complete full analysis lifecycle', async () => {
      // 1. Iniciar análisis
      const startResponse = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${domain._id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scanType: 'full',
          includeSubdomains: true,
          maxUrls: 50,
          depth: 3,
          priority: 'normal'
        });

      expect(startResponse.status).toBe(201);
      expect(startResponse.body.data).toHaveProperty('analysisId');
      expect(startResponse.body.data).toHaveProperty('scanId');

      const analysisId = startResponse.body.data.analysisId;

      // Verificar que el análisis se creó en la base de datos
      const analysis = await CookieAnalysisResult.findById(analysisId);
      expect(analysis).toBeTruthy();
      expect(analysis.status).toBe('pending');
      expect(analysis.domainId.toString()).toBe(domain._id.toString());

      // 2. Verificar estado inicial
      const statusResponse = await request(app)
        .get(`/api/v1/advanced-analysis/analysis/${analysisId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.analysis.status).toBe('pending');

      // 3. Simular progreso del análisis
      analysis.status = 'running';
      analysis.progress = {
        percentage: 50,
        currentPhase: 'analysis',
        currentStep: 'Analyzing cookies',
        urlsAnalyzed: 25,
        urlsTotal: 50,
        startTime: new Date()
      };
      await analysis.save();

      // Verificar progreso
      const progressResponse = await request(app)
        .get(`/api/v1/advanced-analysis/analysis/${analysisId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(progressResponse.status).toBe(200);
      expect(progressResponse.body.data.analysis.status).toBe('running');
      expect(progressResponse.body.data.analysis.progress.percentage).toBe(50);

      // 4. Simular finalización del análisis
      analysis.status = 'completed';
      analysis.progress.percentage = 100;
      analysis.progress.endTime = new Date();
      analysis.cookies = [
        {
          name: '_ga',
          domain: 'test-example.com',
          category: 'analytics',
          isFirstParty: true,
          secure: true,
          httpOnly: false,
          provider: { name: 'Google Analytics' }
        },
        {
          name: '_fbp',
          domain: '.facebook.com',
          category: 'advertising',
          isFirstParty: false,
          secure: true,
          httpOnly: false,
          provider: { name: 'Facebook' }
        }
      ];
      analysis.statistics = {
        totalCookies: 2,
        firstPartyCookies: 1,
        thirdPartyCookies: 1,
        complianceScore: { overall: 75 }
      };
      await analysis.save();

      // 5. Obtener resultados completos
      const resultsResponse = await request(app)
        .get(`/api/v1/advanced-analysis/analysis/${analysisId}/results`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ includeDetails: 'true' });

      expect(resultsResponse.status).toBe(200);
      expect(resultsResponse.body.data.summary.totalCookies).toBe(2);
      expect(resultsResponse.body.data.detailed.cookies).toHaveLength(2);

      // 6. Verificar que aparece en el historial
      const historyResponse = await request(app)
        .get(`/api/v1/advanced-analysis/domain/${domain._id}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.analyses).toHaveLength(1);
      expect(historyResponse.body.data.analyses[0].status).toBe('completed');
    });

    test('should handle analysis cancellation', async () => {
      // 1. Iniciar análisis
      const startResponse = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${domain._id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scanType: 'full' });

      const analysisId = startResponse.body.data.analysisId;

      // 2. Simular análisis en progreso
      const analysis = await CookieAnalysisResult.findById(analysisId);
      analysis.status = 'running';
      await analysis.save();

      // 3. Cancelar análisis
      const cancelResponse = await request(app)
        .post(`/api/v1/advanced-analysis/analysis/${analysisId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(cancelResponse.status).toBe(200);

      // 4. Verificar estado cancelado
      const statusResponse = await request(app)
        .get(`/api/v1/advanced-analysis/analysis/${analysisId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.body.data.analysis.status).toBe('cancelled');
    });

    test('should prevent multiple concurrent analyses', async () => {
      // 1. Crear primer análisis
      const analysis1 = await CookieAnalysisResult.create({
        domainId: domain._id,
        domain: domain.domain,
        status: 'running',
        analysisConfig: { scanType: 'full' }
      });

      // 2. Intentar crear segundo análisis
      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${domain._id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scanType: 'full' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already in progress');
    });
  });

  describe('Scheduling Integration', () => {
    test('should schedule and manage automatic analyses', async () => {
      const scheduleConfig = {
        schedule: {
          frequency: 'weekly',
          time: '02:00',
          daysOfWeek: [1] // Lunes
        },
        analysisConfig: {
          scanType: 'full',
          includeSubdomains: true
        },
        enabled: true
      };

      // 1. Programar análisis
      const scheduleResponse = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${domain._id}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleConfig);

      expect(scheduleResponse.status).toBe(200);

      // 2. Verificar que se guardó la configuración
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.analysisSchedule.enabled).toBe(true);
      expect(updatedDomain.analysisSchedule.frequency).toBe('weekly');
      expect(updatedDomain.analysisSchedule.daysOfWeek).toContain(1);
    });
  });

  describe('Comparison Features', () => {
    test('should compare two completed analyses', async () => {
      // 1. Crear dos análisis completados
      const analysis1 = await CookieAnalysisResult.create({
        domainId: domain._id,
        domain: domain.domain,
        status: 'completed',
        cookies: [
          { name: 'cookie1', domain: domain.domain, category: 'analytics' }
        ],
        statistics: { totalCookies: 1 },
        updatedAt: new Date('2023-01-01')
      });

      const analysis2 = await CookieAnalysisResult.create({
        domainId: domain._id,
        domain: domain.domain,
        status: 'completed',
        cookies: [
          { name: 'cookie1', domain: domain.domain, category: 'analytics' },
          { name: 'cookie2', domain: domain.domain, category: 'advertising' }
        ],
        statistics: { totalCookies: 2 },
        updatedAt: new Date('2023-01-02')
      });

      // 2. Comparar análisis
      const compareResponse = await request(app)
        .get(`/api/v1/advanced-analysis/compare/${analysis1._id}/${analysis2._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(compareResponse.status).toBe(200);
      expect(compareResponse.body.data.comparison.summary.cookiesDifference).toBe(1);
    });
  });

  describe('Trends Analysis', () => {
    test('should generate cookie trends', async () => {
      // 1. Crear múltiples análisis históricos
      const dates = [
        new Date('2023-01-01'),
        new Date('2023-01-02'),
        new Date('2023-01-03')
      ];

      for (let i = 0; i < dates.length; i++) {
        await CookieAnalysisResult.create({
          domainId: domain._id,
          domain: domain.domain,
          status: 'completed',
          statistics: {
            totalCookies: 10 + i,
            firstPartyCookies: 7 + i,
            thirdPartyCookies: 3
          },
          progress: { endTime: dates[i] },
          updatedAt: dates[i]
        });
      }

      // 2. Obtener tendencias
      const trendsResponse = await request(app)
        .get(`/api/v1/advanced-analysis/domain/${domain._id}/trends`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ days: 30 });

      expect(trendsResponse.status).toBe(200);
      expect(trendsResponse.body.data.trends).toHaveLength(3);
      expect(trendsResponse.body.data.trends[0].totalCookies).toBe(10);
      expect(trendsResponse.body.data.trends[2].totalCookies).toBe(12);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid analysis IDs gracefully', async () => {
      const invalidId = '507f1f77bcf86cd799439999';
      
      const response = await request(app)
        .get(`/api/v1/advanced-analysis/analysis/${invalidId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    test('should handle malformed requests', async () => {
      const response = await request(app)
        .post(`/api/v1/advanced-analysis/domain/${domain._id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scanType: 'invalid_type',
          maxUrls: 'not_a_number'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple simultaneous requests', async () => {
      const requests = [];
      
      // Crear múltiples análisis en diferentes dominios
      for (let i = 0; i < 3; i++) {
        const testDomain = await Domain.create({
          clientId: client._id,
          domain: `test-${i}.example.com`,
          status: 'active'
        });

        requests.push(
          request(app)
            .post(`/api/v1/advanced-analysis/domain/${testDomain._id}/start`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ scanType: 'quick' })
        );
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });
});