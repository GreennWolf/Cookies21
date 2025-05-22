// tests/integration/banner/banner-customization.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const BannerTemplate = require('../../../models/BannerTemplate');
const Domain = require('../../../models/Domain');
const { generateHTML, generateCSS } = require('../../../services/bannerGenerator.service');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Banner Customization Integration Tests', () => {
  let client;
  let token;
  let domain;
  let baseTemplate;

  beforeEach(async () => {
    // Configuración inicial
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;
    domain = await global.createTestDomain(client._id);

    // Crear template base para pruebas
    baseTemplate = await global.createTestBannerTemplate(client._id, {
      name: 'Base Template',
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
          content: { text: { en: 'Privacy Settings' } }
        },
        {
          type: 'button',
          id: 'accept-all',
          action: { type: 'accept_all' },
          content: { text: { en: 'Accept All' } }
        },
        {
          type: 'button',
          id: 'reject-all',
          action: { type: 'reject_all' },
          content: { text: { en: 'Reject All' } }
        }
      ]
    });
  });

  describe('Personalización de Componentes', () => {
    test('debería modificar estilos de componentes existentes', async () => {
      const updates = {
        components: baseTemplate.components.map(comp => {
          if (comp.id === 'accept-all') {
            return {
              ...comp,
              style: {
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                padding: '10px 20px',
                borderRadius: '4px'
              }
            };
          }
          return comp;
        })
      };

      const response = await request(app)
        .patch(`/api/v1/templates/${baseTemplate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(response.status).toBe(200);
      const acceptButton = response.body.data.template.components
        .find(c => c.id === 'accept-all');
      expect(acceptButton.style).toMatchObject({
        backgroundColor: '#4CAF50',
        color: '#FFFFFF'
      });
    });

    test('debería agregar nuevos componentes manteniendo los requeridos', async () => {
      const updates = {
        components: [
          ...baseTemplate.components,
          {
            type: 'text',
            id: 'description',
            content: {
              text: { en: 'Please select your privacy preferences' }
            },
            style: {
              fontSize: '14px',
              margin: '10px 0'
            }
          }
        ]
      };

      const response = await request(app)
        .patch(`/api/v1/templates/${baseTemplate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.data.template.components).toHaveLength(4);
      expect(response.body.data.template.components)
        .toContainEqual(expect.objectContaining({
          id: 'description',
          type: 'text'
        }));
    });
  });

  describe('Personalización de Tema', () => {
    test('debería actualizar tema global del banner', async () => {
      const updates = {
        theme: {
          colors: {
            primary: '#2196F3',
            secondary: '#FFC107',
            background: '#FFFFFF',
            text: '#000000'
          },
          fonts: {
            primary: 'Roboto, sans-serif',
            secondary: 'Arial, sans-serif'
          },
          spacing: {
            unit: 8
          }
        }
      };

      const response = await request(app)
        .patch(`/api/v1/templates/${baseTemplate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.data.template.theme).toMatchObject(updates.theme);
    });

    test('debería aplicar tema específico para móvil', async () => {
      const updates = {
        components: baseTemplate.components.map(comp => ({
          ...comp,
          responsive: {
            mobile: {
              style: {
                fontSize: '14px',
                padding: '8px'
              }
            }
          }
        }))
      };

      const response = await request(app)
        .patch(`/api/v1/templates/${baseTemplate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.data.template.components[0].responsive.mobile)
        .toBeTruthy();
    });
  });

  describe('Personalización por Idioma', () => {
    test('debería gestionar contenido multiidioma', async () => {
      const updates = {
        components: baseTemplate.components.map(comp => ({
          ...comp,
          content: {
            text: {
              en: 'Privacy Settings',
              es: 'Configuración de Privacidad',
              fr: 'Paramètres de Confidentialité'
            }
          }
        }))
      };

      const response = await request(app)
        .patch(`/api/v1/templates/${baseTemplate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(response.status).toBe(200);
      const titleComponent = response.body.data.template.components
        .find(c => c.id === 'title');
      expect(titleComponent.content.text).toHaveProperty('es');
      expect(titleComponent.content.text).toHaveProperty('fr');
    });
  });

  describe('Animaciones y Transiciones', () => {
    test('debería configurar animaciones del banner', async () => {
      const updates = {
        settings: {
          animation: {
            type: 'fade',
            duration: 300,
            timing: 'ease-in-out'
          }
        }
      };

      const response = await request(app)
        .patch(`/api/v1/templates/${baseTemplate._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.data.template.settings.animation)
        .toMatchObject(updates.settings.animation);
    });
  });

  describe('Generación de Código', () => {
    test('debería generar HTML y CSS válidos', async () => {
      const previewResponse = await request(app)
        .post('/api/v1/templates/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({
          config: baseTemplate
        });

      expect(previewResponse.status).toBe(200);
      expect(previewResponse.body.data.preview).toMatchObject({
        html: expect.any(String),
        css: expect.any(String)
      });

      // Verificar que el HTML contiene los componentes necesarios
      const { html } = previewResponse.body.data.preview;
      expect(html).toContain('accept-all');
      expect(html).toContain('reject-all');
    });
  });
});