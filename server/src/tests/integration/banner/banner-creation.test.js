// tests/integration/banner/banner-creation.test.js

const mongoose = require('mongoose');
const app = require('../../testApp');
const BannerTemplate = require('../../../models/BannerTemplate');
const Domain = require('../../../models/Domain');
const { validateBannerConfig } = require('../../../utils/bannerValidator');
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Banner Creation Integration Tests', () => {
  let client;
  let token;
  let domain;

  beforeEach(async () => {
    // Configuración inicial
    const { client: testClient, token: authToken } = await global.createAuthenticatedClient();
    client = testClient;
    token = authToken;
    domain = await global.createTestDomain(client._id);
  });

  describe('Creación de Template de Banner', () => {
    test('debería crear un nuevo template de banner completo', async () => {
      const templateData = {
        name: 'Test Banner Template',
        type: 'custom',
        layout: {
          type: 'modal',
          position: 'center'
        },
        components: [
          {
            type: 'text',
            id: 'title',
            content: {
              text: {
                en: 'Privacy Settings'
              }
            },
            style: {
              fontSize: '24px',
              fontWeight: 'bold'
            }
          },
          {
            type: 'button',
            id: 'accept-all',
            action: {
              type: 'accept_all'
            },
            content: {
              text: {
                en: 'Accept All'
              }
            },
            style: {
              backgroundColor: '#4CAF50',
              color: '#FFFFFF'
            }
          },
          {
            type: 'button',
            id: 'reject-all',
            action: {
              type: 'reject_all'
            },
            content: {
              text: {
                en: 'Reject All'
              }
            }
          },
          {
            type: 'button',
            id: 'preferences',
            action: {
              type: 'show_preferences'
            },
            content: {
              text: {
                en: 'Customize'
              }
            }
          }
        ],
        theme: {
          colors: {
            primary: '#4CAF50',
            secondary: '#2196F3',
            background: '#FFFFFF',
            text: '#000000'
          },
          fonts: {
            primary: 'Arial, sans-serif'
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${token}`)
        .send(templateData);

      expect(response.status).toBe(201);
      expect(response.body.data.template).toMatchObject({
        name: templateData.name,
        type: 'custom',
        layout: expect.any(Object),
        components: expect.any(Array),
        theme: expect.any(Object)
      });

      // Verificar que todos los componentes requeridos están presentes
      const actions = response.body.data.template.components
        .map(comp => comp.action?.type)
        .filter(Boolean);

      expect(actions).toContain('accept_all');
      expect(actions).toContain('reject_all');
      expect(actions).toContain('show_preferences');
    });

    test('debería validar componentes requeridos', async () => {
      const invalidTemplate = {
        name: 'Invalid Template',
        type: 'custom',
        layout: {
          type: 'modal',
          position: 'center'
        },
        components: [
          {
            type: 'text',
            id: 'title',
            content: {
              text: {
                en: 'Privacy Settings'
              }
            }
          }
          // Faltan botones de acción requeridos
        ]
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidTemplate);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing required components');
    });
  });

  describe('Clonación de Templates', () => {
    let sourceTemplate;

    beforeEach(async () => {
      sourceTemplate = await global.createTestBannerTemplate(client._id);
    });

    test('debería clonar y personalizar un template existente', async () => {
      const customizations = {
        name: 'Cloned Template',
        components: [
          {
            id: 'accept-all',
            style: {
              backgroundColor: '#FF0000',
              color: '#FFFFFF'
            }
          }
        ]
      };

      const response = await request(app)
        .post(`/api/v1/templates/${sourceTemplate._id}/clone`)
        .set('Authorization', `Bearer ${token}`)
        .send(customizations);

      expect(response.status).toBe(201);
      expect(response.body.data.template).toMatchObject({
        name: customizations.name,
        type: 'custom',
        clientId: client._id.toString()
      });

      // Verificar que se aplicaron las personalizaciones
      const acceptButton = response.body.data.template.components
        .find(comp => comp.id === 'accept-all');
      expect(acceptButton.style).toMatchObject({
        backgroundColor: '#FF0000',
        color: '#FFFFFF'
      });
    });
  });

  describe('Integración con Dominio', () => {
    let template;

    beforeEach(async () => {
      template = await global.createTestBannerTemplate(client._id);
    });

    test('debería asignar template a dominio', async () => {
      const bannerConfig = {
        templateId: template._id,
        settings: {
          position: 'bottom',
          theme: 'dark'
        }
      };

      const response = await request(app)
        .patch(`/api/v1/domains/${domain._id}/banner`)
        .set('Authorization', `Bearer ${token}`)
        .send({ bannerConfig });

      expect(response.status).toBe(200);
      expect(response.body.data.bannerConfig).toMatchObject({
        templateId: template._id.toString(),
        settings: expect.any(Object)
      });

      // Verificar que el dominio se actualizó correctamente
      const updatedDomain = await Domain.findById(domain._id);
      expect(updatedDomain.bannerConfig).toBeTruthy();
    });
  });

  describe('Validación y Sanitización', () => {
    test('debería sanitizar estilos CSS inseguros', async () => {
      const templateWithUnsafeStyles = {
        name: 'Test Template',
        type: 'custom',
        components: [
          {
            type: 'text',
            id: 'title',
            style: {
              'javascript:alert(1)': 'value', // Estilo malicioso
              'expression(alert(1))': 'value', // Estilo malicioso
              'font-size': '16px' // Estilo válido
            }
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${token}`)
        .send(templateWithUnsafeStyles);

      expect(response.status).toBe(201);
      const styles = response.body.data.template.components[0].style;
      expect(styles).not.toHaveProperty('javascript:alert(1)');
      expect(styles).not.toHaveProperty('expression(alert(1))');
      expect(styles).toHaveProperty('font-size', '16px');
    });
  });
});