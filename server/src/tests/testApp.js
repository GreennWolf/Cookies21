// src/tests/testApp.js

const app = require('../app');
const Client = require('../models/Client');
const jwt = require('jsonwebtoken');

if (process.env.NODE_ENV === 'test') {
  // Mock de la ruta de login para pruebas
  app.post('/api/v1/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const client = await Client.findOne({ email });
      
      if (!client) {
        return res.status(401).json({
          status: 'error',
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials'
          }
        });
      }

      // Generar token de prueba
      const token = jwt.sign(
        { userId: client._id, clientId: client._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            email: client.email,
            role: 'client'
          },
          tokens: {
            accessToken: token,
            refreshToken: token
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error during login'
        }
      });
    }
  });
}

module.exports = app;