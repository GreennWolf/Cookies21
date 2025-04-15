// controllers/AuthController.js
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const UserAccount = require('../models/UserAccount');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

class AuthController {
  // Registro de cliente
  register = catchAsync(async (req, res, next) => {
    const { name, email, password, company, subscription = 'basic' } = req.body;

    // Validar que se hayan enviado los campos requeridos
    if (!name || !email || !password || !company) {
      return next(
        new AppError('Missing required fields: name, email, password and company are required', 400)
      );
    }

    // Validar el formato de email (expresión regular sencilla)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Invalid email format', 400));
    }

    // Verificar si el email ya existe
    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return next(new AppError('Email already in use', 409));
    }

    // Crear cliente
    const client = await Client.create({
      name,
      email,
      password,
      company,
      subscription: {
        plan: subscription,
        startDate: new Date()
      }
    });

    // Generar API Key inicial
    const apiKey = await client.generateApiKey({
      name: 'Default Key',
      permissions: ['read', 'write']
    });

    // Crear usuario administrador
    const adminUser = await UserAccount.create({
      clientId: client._id,
      email,
      password,
      name,
      role: 'admin',
      status: 'active'
    });

    // Generar tokens
    const tokens = this._createTokens(client._id);

    return res.status(201).json({
      status: 'success',
      data: {
        client: {
          id: client._id,
          name: client.name,
          email: client.email,
          apiKey: apiKey.key
        },
        tokens
      }
    });
  });

  // Login
  login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Verificar si se proporcionó email y password
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Buscar cliente o usuario con el campo password incluido
    const client = await Client.findOne({ email }).select('+password');
    const userAccount = await UserAccount.findOne({ email }).select('+password');

    const user = userAccount;
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Verificar password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Verificar estado de la cuenta
    if (user.status !== 'active') {
      return next(new AppError('Account is not active', 401));
    }

    // Si es un UserAccount, obtener el cliente asociado
    const clientId = client ? client._id : userAccount.clientId;

    console.log(user._id)

    // Generar tokens
    const tokens = this._createTokens(clientId, user._id);

    // Actualizar último login para UserAccount
    if (userAccount) {
      userAccount.accessControl.lastLogin = new Date();
      await userAccount.save();
    }

    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: userAccount ? userAccount.role : 'client'
        },
        tokens
      }
    });
  });

  // Refresh Token
  refreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('No refresh token provided', 400));
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const { clientId, userId } = decoded;

    // Verificar si el cliente aún existe y está activo
    const client = await Client.findById(clientId);
    if (!client || client.status !== 'active') {
      return next(new AppError('Client no longer active', 401));
    }

    // Si se proporcionó userId, verificar el UserAccount
    if (userId) {
      const userAccount = await UserAccount.findById(userId);
      if (!userAccount || userAccount.status !== 'active') {
        return next(new AppError('User account no longer active', 401));
      }
    }

    // Generar nuevos tokens
    const tokens = this._createTokens(clientId, userId);

    return res.status(200).json({
      status: 'success',
      data: { tokens }
    });
  });

  // Logout
  logout = catchAsync(async (req, res) => {
    // Aquí puedes implementar lógica adicional como:
    // - Agregar el token a una lista negra
    // - Limpiar sesiones del usuario
    // - Actualizar último logout

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  });

  // Cambiar contraseña
  changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const { userId, userType } = req;

    const UserModel = userType === 'client' ? Client : UserAccount;
    const user = await UserModel.findById(userId).select('+password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Verificar password actual
    const isPasswordValid = await user.verifyPassword(currentPassword);
    if (!isPasswordValid) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // Actualizar password
    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  });

  // Solicitud de reset de contraseña
  forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    // Buscar usuario
    const client = await Client.findOne({ email });
    const userAccount = await UserAccount.findOne({ email });
    
    const user = client || userAccount;
    if (!user) {
      return next(new AppError('No user found with that email', 404));
    }

    // Generar token de reset
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      // Aquí implementarías el envío del email, por ejemplo:
      // await sendPasswordResetEmail(email, resetToken);

      return res.status(200).json({
        status: 'success',
        message: 'Reset token sent to email'
      });
    } catch (error) {
      // Si hay error, limpiar el token y expiración
      user.security.passwordResetToken = undefined;
      user.security.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new AppError('Error sending email. Please try again later.', 500));
    }
  });

  // Reset de contraseña
  resetPassword = catchAsync(async (req, res, next) => {
    const { token, newPassword } = req.body;

    // Buscar usuario con token válido
    const client = await Client.findOne({
      'security.passwordResetToken': token,
      'security.passwordResetExpires': { $gt: Date.now() }
    });

    const userAccount = await UserAccount.findOne({
      'security.passwordResetToken': token,
      'security.passwordResetExpires': { $gt: Date.now() }
    });

    const user = client || userAccount;
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }

    // Actualizar password y limpiar tokens
    user.password = newPassword;
    user.security.passwordResetToken = undefined;
    user.security.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });
  });

  // Verificar estado de sesión
  checkSession = catchAsync(async (req, res) => {
    // Esta función asume que el middleware 'protect' ya verificó el token
    const { clientId, userId, userType } = req;

    const UserModel = userType === 'client' ? Client : UserAccount;
    const user = await UserModel.findById(userId);

    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: userType === 'client' ? 'client' : user.role
        }
      }
    });
  });

  // Método privado para crear tokens
  _createTokens(clientId, userId = null) {
    // Access Token
    const accessToken = jwt.sign(
      { clientId, userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // Refresh Token
    const refreshToken = jwt.sign(
      { clientId, userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthController();
