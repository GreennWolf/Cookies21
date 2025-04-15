// src/tests/unit/middleware/validateRequest.test.js
const { body } = require('express-validator');
const { validateRequest } = require('../../../middleware/validateRequest');
const AppError = require('../../../utils/appError');
const logger = require('../../../utils/logger');
const { describe, test, expect, beforeEach } = require('@jest/globals');

jest.mock('../../../utils/logger');

describe('Validate Request Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('Basic Validation', () => {
    test('debería validar request exitosamente', async () => {
      // Arrange
      const validations = [
        body('name')
          .trim()
          .notEmpty()
          .withMessage('name is required')
      ];

      req.body = { name: 'John Doe' };

      const middleware = validateRequest(validations);

      // Act
      await middleware(req, res, next);

      // Assert: Se espera que next() se llame sin argumentos en caso de éxito.
      expect(next).toHaveBeenCalledWith();
    });

    test('debería detectar campos requeridos faltantes', async () => {
      // Arrange
      const validations = [
        body('name')
          .trim()
          .notEmpty()
          .withMessage('name is required')
      ];

      const middleware = validateRequest(validations);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation error');
      expect(error.errors).toEqual([{ field: 'name', message: 'name is required' }]);
    });
  });

  describe('Advanced Validation', () => {
    test('debería validar longitud de string', async () => {
      // Arrange
      const validations = [
        body('password')
          .isLength({ min: 8, max: 20 })
          .withMessage('password must be between 8 and 20 characters')
      ];

      req.body = { password: 'short' };

      const middleware = validateRequest(validations);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation error');
      expect(error.errors).toEqual([{ field: 'password', message: 'password must be between 8 and 20 characters' }]);
    });

    test('debería validar formato de email', async () => {
      // Arrange
      const validations = [
        body('email')
          .isEmail()
          .withMessage('must be a valid email')
      ];

      req.body = { email: 'invalid-email' };

      const middleware = validateRequest(validations);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation error');
      expect(error.errors).toEqual([{ field: 'email', message: 'must be a valid email' }]);
    });
  });

  describe('Custom Validation', () => {
    test('debería validar dependencias entre campos', async () => {
      // Arrange
      const validations = [
        body('password')
          .notEmpty()
          .withMessage('Password is required'),
        body('confirmPassword')
          .notEmpty()
          .withMessage('Confirm password is required')
          .custom((value, { req }) => {
            if (value !== req.body.password) {
              throw new Error('Passwords do not match');
            }
            return true;
          })
      ];

      req.body = { password: 'password123', confirmPassword: 'password124' };

      const middleware = validateRequest(validations);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation error');
      expect(error.errors).toEqual([{ field: 'confirmPassword', message: 'Passwords do not match' }]);
    });
  });

  describe('Error Handling', () => {
    test('debería manejar múltiples errores', async () => {
      // Arrange
      const validations = [
        body('name')
          .notEmpty()
          .withMessage('name cannot be empty'),
        body('email')
          .isEmail()
          .withMessage('email must be a valid email address'),
        body('age')
          .isInt({ min: 18 })
          .withMessage('age must be greater than or equal to 18')
      ];

      req.body = { name: '', email: 'invalid', age: 16 };

      const middleware = validateRequest(validations);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation error');
      expect(error.errors).toEqual([
        { field: 'name', message: 'name cannot be empty' },
        { field: 'email', message: 'email must be a valid email address' },
        { field: 'age', message: 'age must be greater than or equal to 18' }
      ]);
    });
  });
});
