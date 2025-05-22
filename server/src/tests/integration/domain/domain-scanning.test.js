// tests/integration/domain/domain-scanning.test.js

const request = require('supertest');
const app = require('../../testApp');
const Domain = require('../../../models/Domain');
const CookieScan = require('../../../models/CookieScan');
const Cookie = require('../../../models/Cookie');
const { scanDomain } = require('../../../services/scanner.service');
const { detectCookieProvider } = require('../../../services/provider.service');
const { cookieFixtures } = require('../../fixtures/cookies');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

jest.mock('../../../services/scanner.service');
jest.mock('../../../services/provider.service');

describe('Domain Scanning Flow', () => {
  let client;
  let adminToken;
  let domain;

  beforeEach(async () => {
    ({ client, token: adminToken } = await global.createAuthenticatedClient());
    domain = await global.createTestDomain(client._id);
  });

  describe('Scan Initiation', () => {
    test('debería iniciar un escaneo exitosamente', async () => {
      // Arrange
      const scanConfig = {
        type: 'full',
        priority: 'normal'
      };

      // Act
      const response = await request(app)
        .post(`/api/v1/scans/domain/${domain._id}/scan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(scanConfig);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          scan: expect.objectContaining({
            domainId: domain._id.toString(),
            status: 'pending',
            scanConfig: expect.objectContaining(scanConfig)
          })
        }
      });

      // Verificar creación del escaneo
      const scan = await CookieScan.findOne({ domainId: domain._id });
      expect(scan).toBeTruthy();
      expect(scan.metadata.scanType).toBe('manual');
    });

    test('debería prevenir escaneos simultáneos', async () => {
      // Arrange
      await CookieScan.create({
        domainId: domain._id,
        status: 'in_progress',
        scanConfig: { type: 'full' }
      });

      // Act
      const response = await request(app)
        .post(`/api/v1/scans/domain/${domain._id}/scan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'full' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('A scan is already in progress for this domain');
    });

    test('debería validar configuración de escaneo', async () => {
      // Arrange
      const invalidConfigs = [
        { type: 'invalid_type' },
        { type: 'full', priority: 'invalid_priority' },
        { type: 'quick', maxUrls: 'invalid_number' }
      ];

      // Act & Assert
      for (const config of invalidConfigs) {
        const response = await request(app)
          .post(`/api/v1/scans/domain/${domain._id}/scan`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(config);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Scan Monitoring', () => {
    let scan;

    beforeEach(async () => {
      scan = await CookieScan.create({
        domainId: domain._id,
        status: 'in_progress',
        scanConfig: { type: 'full' },
        progress: {
          urlsScanned: 5,
          urlsTotal: 10
        }
      });
    });

    test('debería obtener estado del escaneo', async () => {
      // Act
      const response = await request(app)
        .get(`/api/v1/scans/${scan._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.scan).toEqual(
        expect.objectContaining({
          status: 'in_progress',
          progress: expect.objectContaining({
            urlsScanned: 5,
            urlsTotal: 10
          })
        })
      );
    });

    test('debería obtener historial de escaneos', async () => {
      // Arrange
      await CookieScan.create({
        domainId: domain._id,
        status: 'completed',
        scanConfig: { type: 'quick' },
        findings: {
          cookies: [cookieFixtures.analyticsCookie]
        }
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/scans/domain/${domain._id}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.scans).toHaveLength(2);
      expect(response.body.data.pagination).toBeTruthy();
    });

    test('debería permitir cancelar escaneo en progreso', async () => {
      // Act
      const response = await request(app)
        .post(`/api/v1/scans/${scan._id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      
      const cancelledScan = await CookieScan.findById(scan._id);
      expect(cancelledScan.status).toBe('cancelled');
    });
  });

  describe('Scan Results', () => {
    let completedScan;

    beforeEach(async () => {
      // Simular resultados de escaneo
      const scanResults = {
        findings: {
          cookies: [
            cookieFixtures.analyticsCookie,
            cookieFixtures.marketingCookie
          ],
          scripts: [
            {
              url: 'https://analytics.google.com/analytics.js',
              type: 'analytics'
            }
          ],
          changes: {
            newCookies: [cookieFixtures.analyticsCookie],
            modifiedCookies: [],
            removedCookies: []
          }
        },
        stats: {
          totalCookies: 2,
          byCategory: {
            analytics: 1,
            marketing: 1
          }
        }
      };

      scanDomain.mockResolvedValue(scanResults);
      detectCookieProvider.mockResolvedValue('Google Analytics');

      completedScan = await CookieScan.create({
        domainId: domain._id,
        status: 'completed',
        scanConfig: { type: 'full' },
        findings: scanResults.findings,
        stats: scanResults.stats
      });
    });

    test('debería obtener resultados del escaneo', async () => {
      // Act
      const response = await request(app)
        .get(`/api/v1/scans/${completedScan._id}/results`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        scan: expect.objectContaining({
          findings: expect.objectContaining({
            cookies: expect.any(Array),
            scripts: expect.any(Array),
            changes: expect.any(Object)
          }),
          stats: expect.any(Object)
        }),
        changes: expect.any(Object)
      });
    });

    test('debería aplicar cambios detectados', async () => {
      // Act
      const response = await request(app)
        .post(`/api/v1/scans/${completedScan._id}/apply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          changes: [
            {
              type: 'add',
              cookie: cookieFixtures.analyticsCookie
            }
          ]
        });

      // Assert
      expect(response.status).toBe(200);

      // Verificar que la cookie fue creada
      const cookie = await Cookie.findOne({
        domainId: domain._id,
        name: cookieFixtures.analyticsCookie.name
      });
      expect(cookie).toBeTruthy();
    });

    test('debería exportar resultados del escaneo', async () => {
      // Act
      const response = await request(app)
        .post(`/api/v1/scans/${completedScan._id}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'json' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        config: expect.any(Object),
        format: 'json'
      });

      // Verificar formato CSV
      const csvResponse = await request(app)
        .post(`/api/v1/scans/${completedScan._id}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ format: 'csv' });

      expect(csvResponse.status).toBe(200);
      expect(csvResponse.headers['content-type']).toBe('text/csv');
    });
  });

  describe('Scan Scheduling', () => {
    test('debería programar escaneo automático', async () => {
      // Arrange
      const schedule = {
        enabled: true,
        interval: 24,
        startTime: '00:00',
        daysOfWeek: ['monday', 'wednesday', 'friday']
      };

      // Act
      const response = await request(app)
        .post(`/api/v1/scans/domain/${domain._id}/schedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ schedule });

      // Assert
      expect(response.status).toBe(200);

      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.settings.scanning).toEqual(
        expect.objectContaining(schedule)
      );
    });

    test('debería validar configuración de programación', async () => {
      // Arrange
      const invalidSchedules = [
        { enabled: true, interval: 'invalid' },
        { enabled: true, startTime: 'invalid' },
        { enabled: true, daysOfWeek: ['invalid_day'] }
      ];

      // Act & Assert
      for (const schedule of invalidSchedules) {
        const response = await request(app)
          .post(`/api/v1/scans/domain/${domain._id}/schedule`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ schedule });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});