const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const pkg = require('../../package.json');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cookie Management Platform API',
      version: pkg.version,
      description: 'API documentation for the Cookie Management Platform',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      contact: {
        name: 'API Support',
        email: 'support@example.com',
        url: 'https://www.example.com/support'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            code: {
              type: 'string',
              example: 'VALIDATION_ERROR'
            },
            message: {
              type: 'string',
              example: 'Invalid input data'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Field X is required', 'Field Y must be a number']
            }
          }
        }
      },
      parameters: {
        page: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1,
            minimum: 1
          },
          description: 'Page number for pagination'
        },
        limit: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 10,
            minimum: 1,
            maximum: 100
          },
          description: 'Number of items per page'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  apis: [
    path.join(__dirname, '../routes/v1/**/*.js'),
    path.join(__dirname, '../docs/**/*.yaml')
  ],
  // Personalización del UI de Swagger
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha'
  }
};

// Middleware para exponer la documentación
const swaggerSpec = swaggerJsdoc(options);

// Configuraciones de seguridad para el UI
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CMP API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: options.swaggerOptions
};

module.exports = {
  swaggerSpec,
  swaggerUiOptions
};