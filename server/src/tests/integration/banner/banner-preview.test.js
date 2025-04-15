// tests/integration/banner/banner-preview.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const BannerTemplate = require('../../../models/BannerTemplate');
const Domain = require('../../../models/Domain');
const { generateHTML, generateCSS } = require('../../../services/bannerGenerator.service');
const { validateBannerConfig } = require('../../../utils/bannerValidator');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Banner Preview Integration Tests', () => {
  let client;
  let token;
  let domain;
  let baseTemplate;

  beforeEach(async () => {
    // Configuración inicial
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;
    
    // Crear dominio de prueba
    domain = await global.createTestDomain(client._id);

    // Crear template base para pruebas
    baseTemplate = await global.createTestBannerTemplate(client._id, {
      name: 'Preview Test Template',
      type: 'custom',
      status: 'active',
      layout: {
        type: 'modal',
        position: 'center'
      },
      components: [
        {
          type: 'text',
          id: 'title',
          content: { text: { en: 'Privacy Settings' } },
          style: {
            fontSize: '24px',
            fontWeight: 'bold'
          }
        },
        {
          type: 'text',
          id: 'description',
          content: { text: { en: 'Please accept or customize your cookie preferences.' } },
          style: {
            fontSize: '16px',
            margin: '10px 0'
          }
        },
        {
          type: 'button',
          id: 'accept-all',
          action: { type: 'accept_all' },
          content: { text: { en: 'Accept All' } },
          style: {
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 20px'
          }
        }
      ],
      theme: {
        colors: {
          primary: '#4CAF50',
          background: '#FFFFFF',
          text: '#000000'
        },
        fonts: {
          primary: 'Arial, sans-serif'
        }
      }
    });
  });

  describe('Previsualización Básica', () => {
    test('debería generar previsualización con configuración por defecto', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${baseTemplate._id}/preview`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        preview: {
          html: expect.any(String),
          css: expect.any(String),
          config: expect.any(Object)
        }
      });

      // Verificar contenido HTML
      expect(response.body.data.preview.html).toContain('Privacy Settings');
      expect(response.body.data.preview.html).toContain('accept-all');

      // Verificar estilos CSS
      expect(response.body.data.preview.css).toContain('#4CAF50');
      expect(response.body.data.preview.css).toContain('Arial, sans-serif');
    });

    test('debería generar previsualización con configuración específica del dominio', async () => {
      // Actualizar configuración del dominio
      await Domain.findByIdAndUpdate(domain._id, {
        settings: {
          design: {
            theme: 'dark',
            colors: {
              background: '#1a1a1a',
              text: '#FFFFFF'
            }
          }
        }
      });

      const response = await request(app)
        .get(`/api/v1/templates/${baseTemplate._id}/preview`)
        .query({ domainId: domain._id })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.preview.config.domain.design).toMatchObject({
        theme: 'dark',
        colors: {
          background: '#1a1a1a',
          text: '#FFFFFF'
        }
      });

      expect(response.body.data.preview.css).toContain('#1a1a1a');
    });
  });

  describe('Previsualización con Variantes', () => {
    test('debería previsualizar diferentes idiomas', async () => {
      // Actualizar template con traducciones
      const updatedTemplate = await BannerTemplate.findByIdAndUpdate(
        baseTemplate._id,
        {
          'components.$[].content.text': {
            en: 'Privacy Settings',
            es: 'Configuración de Privacidad',
            fr: 'Paramètres de Confidentialité'
          }
        },
        { new: true }
      );

      const response = await request(app)
        .get(`/api/v1/templates/${updatedTemplate._id}/preview`)
        .query({ language: 'es' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.preview.html).toContain('Configuración de Privacidad');
    });

    test('debería previsualizar diferentes dispositivos', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${baseTemplate._id}/preview`)
        .query({ 
          device: 'mobile',
          viewport: { width: 375, height: 667 }
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.preview.css).toContain('@media');
      expect(response.body.data.preview.config.responsive).toBeTruthy();
    });
  });

  describe('Validación de Configuración', () => {
    test('debería validar configuración inválida', async () => {
      const invalidConfig = {
        layout: {
          type: 'invalid',
          position: 'center'
        },
        components: []
      };

      const response = await request(app)
        .post('/api/v1/templates/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({ config: invalidConfig });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('Invalid banner configuration')
      });
    });

    test('debería validar componentes requeridos', async () => {
      const configWithoutRequired = {
        ...baseTemplate.toObject(),
        components: [
          {
            type: 'text',
            id: 'title',
            content: { text: { en: 'Title' } }
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/templates/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({ config: configWithoutRequired });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Required action');
    });
  });

  describe('Pruebas de Renderizado', () => {
    test('debería generar HTML y CSS válidos con estilos anidados', async () => {
      const complexTemplate = await global.createTestBannerTemplate(client._id, {
        ...baseTemplate.toObject(),
        components: [
          ...baseTemplate.components,
          {
            type: 'container',
            id: 'preferences-section',
            style: {
              padding: '20px',
              backgroundColor: '#f5f5f5'
            },
            children: [
              {
                type: 'text',
                id: 'preferences-title',
                content: { text: { en: 'Customize Preferences' } },
                style: {
                  fontSize: '18px',
                  fontWeight: 'bold'
                }
              }
            ]
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v1/templates/${complexTemplate._id}/preview`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.preview.html).toContain('preferences-section');
      expect(response.body.data.preview.html).toContain('Customize Preferences');
      expect(response.body.data.preview.css).toContain('#f5f5f5');
    });

    test('debería aplicar animaciones y transiciones', async () => {
      const animatedTemplate = await BannerTemplate.findByIdAndUpdate(
        baseTemplate._id,
        {
          settings: {
            animation: {
              type: 'fade',
              duration: 300,
              timing: 'ease-in-out'
            }
          }
        },
        { new: true }
      );

      const response = await request(app)
        .get(`/api/v1/templates/${animatedTemplate._id}/preview`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.preview.css).toContain('animation');
      expect(response.body.data.preview.css).toContain('300ms');
      expect(response.body.data.preview.css).toContain('ease-in-out');
    });
  });
});