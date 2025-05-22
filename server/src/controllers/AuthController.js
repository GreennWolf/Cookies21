// controllers/AuthController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Client = require('../models/Client');
const UserAccount = require('../models/UserAccount');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

class AuthController {
  // Registro de cliente
  register = catchAsync(async (req, res, next) => {
    const { name, email, password, company, subscription = 'basic' } = req.body;
    console.log(`📝 Intento de registro para: ${email}`);

    // Validar que se hayan enviado los campos requeridos
    if (!name || !email || !password || !company) {
      console.log('❌ Faltan campos requeridos en el registro');
      return next(
        new AppError('Missing required fields: name, email, password and company are required', 400)
      );
    }

    // Validar el formato de email (expresión regular sencilla)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Formato de email inválido');
      return next(new AppError('Invalid email format', 400));
    }

    // Verificar si el email ya existe
    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      console.log('❌ Email ya en uso');
      return next(new AppError('Email already in use', 409));
    }

    // Crear cliente
    console.log('📝 Creando cliente...');
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
    console.log(`✅ Cliente creado con ID: ${client._id}`);

    // Generar API Key inicial
    console.log('📝 Generando API Key inicial...');
    const apiKey = await client.generateApiKey({
      name: 'Default Key',
      permissions: ['read', 'write']
    });
    console.log(`✅ API Key generada: ${apiKey.key.substring(0, 10)}...`);

    // Crear usuario administrador
    console.log('📝 Creando usuario admin...');
    const adminUser = await UserAccount.create({
      clientId: client._id,
      email,
      password,
      name,
      role: 'admin',
      status: 'active'
    });
    console.log(`✅ Usuario admin creado con ID: ${adminUser._id}`);

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
    console.log(`\n\n🔐 ======== NUEVO INTENTO DE LOGIN ======== 🔐`);
    console.log(`🔍 Intento de login para: ${email}`);
    console.log(`🔍 Contraseña proporcionada (longitud): ${password ? password.length : 0} caracteres`);

    // Verificar si se proporcionó email y password
    if (!email || !password) {
      console.log('❌ Email o password no proporcionados');
      return next(new AppError('Please provide email and password', 400));
    }

    // Buscar cliente o usuario con el campo password incluido
    console.log(`🔍 Buscando cliente con email: ${email}`);
    const client = await Client.findOne({ email }).select('+password');
    
    console.log(`🔍 Buscando usuario con email: ${email}`);
    const userAccount = await UserAccount.findOne({ email }).select('+password');
    
    console.log(`🔍 Cliente encontrado: ${client ? 'SÍ' : 'NO'}`);
    console.log(`🔍 Usuario encontrado: ${userAccount ? 'SÍ' : 'NO'}`);
    
    if (userAccount) {
      // Muestra información del usuario pero oculta la contraseña completa
      const userInfo = { ...userAccount.toObject() };
      if (userInfo.password) {
        userInfo.password = `${userInfo.password.substring(0, 10)}... (${userInfo.password.length} caracteres)`;
      }
      console.log(`🔍 Información del usuario:`, JSON.stringify(userInfo, null, 2));
      
      console.log(`🔍 Rol del usuario: ${userAccount.role}`);
      console.log(`🔍 Estado del usuario: ${userAccount.status}`);
      console.log(`🔍 Tiene clientId: ${userAccount.clientId ? 'SÍ' : 'NO'}`);
      
      // Verificar métodos disponibles en el modelo UserAccount
      console.log(`🔍 Método verifyPassword disponible: ${typeof userAccount.verifyPassword === 'function' ? 'SÍ' : 'NO'}`);
      
      // Inspeccionar el hash de la contraseña almacenada
      if (userAccount.password) {
        console.log(`🔍 Contraseña almacenada (hash): ${userAccount.password.substring(0, 10)}...`);
        console.log(`🔍 Longitud del hash: ${userAccount.password.length} caracteres`);
        console.log(`🔍 ¿Parece un hash bcrypt? ${userAccount.password.startsWith('$2') ? 'SÍ' : 'NO'}`);
      } else {
        console.log(`❌ No hay contraseña almacenada para este usuario`);
      }
    }

    const user = userAccount;
    if (!user) {
      console.log('❌ No se encontró ningún usuario con este email');
      return next(new AppError('Invalid credentials', 401));
    }

    // Verificar password
    try {
      console.log('🔍 Verificando contraseña...');
      console.log(`🔍 Contraseña proporcionada: ${password}`);
      console.log(`🔍 Contraseña almacenada (parcial): ${user.password.substring(0, 10)}...`);
      
      // Hacemos una verificación manual con bcrypt para diagnosticar
      console.log('🔍 Intentando verificación manual con bcrypt...');
      try {
        const manualCompare = await bcrypt.compare(password, user.password);
        console.log(`🔍 Resultado de comparación manual: ${manualCompare ? 'ÉXITO' : 'FALLO'}`);
      } catch (bcryptError) {
        console.log(`❌ Error en comparación manual de bcrypt: ${bcryptError.message}`);
      }
      
      // Ahora hacemos la verificación con el método del modelo
      console.log('🔍 Intentando verificación a través del método del modelo...');
      const isPasswordValid = await user.verifyPassword(password);
      console.log(`🔍 Contraseña válida (método del modelo): ${isPasswordValid ? 'SÍ' : 'NO'}`);
      
      if (!isPasswordValid) {
        console.log('❌ Contraseña incorrecta');
        return next(new AppError('Invalid credentials', 401));
      }
    } catch (error) {
      console.log(`❌ Error al verificar contraseña: ${error.message}`);
      console.log(error.stack);
      return next(new AppError('Error verifying credentials', 500));
    }

    // Verificar estado de la cuenta
    if (user.status !== 'active') {
      console.log(`❌ Cuenta no activa: ${user.status}`);
      return next(new AppError('Account is not active', 401));
    }

    // MANEJO ESPECIAL PARA ROLE OWNER
    let clientId = null;
    console.log(`🔍 Verificando rol para clientId: ${userAccount.role}`);
    
    // Si NO es owner, obtener el clientId
    if (userAccount && userAccount.role !== 'owner') {
      clientId = client ? client._id : userAccount.clientId;
      console.log(`🔍 ClientId asignado: ${clientId}`);
      
      // Verificar que el cliente exista y esté activo
      if (clientId) {
        const associatedClient = await Client.findById(clientId);
        if (!associatedClient || associatedClient.status !== 'active') {
          console.log('❌ Cliente inactivo o no existente');
          return next(new AppError('Client account is not active', 403));
        }
      }
    } else {
      console.log('✅ Usuario owner detectado, no se requiere clientId');
    }

    console.log(`🔍 Generando tokens para userId=${user._id}, clientId=${clientId}`);
    
    // Generar tokens
    const tokens = this._createTokens(clientId, user._id);

    // Actualizar último login para UserAccount
    try {
      if (!userAccount.accessControl) {
        console.log('⚠️ accessControl no existía, inicializando...');
        userAccount.accessControl = {};
      }
      
      userAccount.accessControl.lastLogin = new Date();
      // También reseteamos intentos fallidos
      userAccount.accessControl.failedAttempts = 0;
      userAccount.accessControl.lockUntil = undefined;
      
      await userAccount.save();
      console.log('✅ Último login actualizado correctamente');
    } catch (error) {
      console.log(`⚠️ Error al actualizar último login: ${error.message}`);
      console.log(error.stack);
      // No bloqueamos el login si esto falla
    }

    console.log('✅ Login exitoso');
    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          clientId: user.clientId,
          role: userAccount ? userAccount.role : 'client'
        },
        tokens
      }
    });
  });

  // Refresh Token
  refreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;
    console.log(`🔄 Solicitud de refresh token recibida`);

    if (!refreshToken) {
      console.log('❌ No se proporcionó refresh token');
      return next(new AppError('No refresh token provided', 400));
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      console.log(`🔍 Token decodificado:`, decoded);
    } catch (error) {
      console.log(`❌ Error al verificar refresh token: ${error.message}`);
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    const { clientId, userId } = decoded;
    console.log(`🔍 Refresh token: clientId=${clientId}, userId=${userId}`);

    // Si hay userId, verificamos primero el usuario
    if (userId) {
      const userAccount = await UserAccount.findById(userId);
      
      if (!userAccount) {
        console.log('❌ Usuario no encontrado');
        return next(new AppError('User no longer exists', 401));
      }
      
      if (userAccount.status !== 'active') {
        console.log(`❌ Usuario no activo: ${userAccount.status}`);
        return next(new AppError('User account is no longer active', 401));
      }
      
      console.log(`🔍 Rol del usuario: ${userAccount.role}`);
      
      // Si es owner, no necesitamos verificar el cliente
      if (userAccount.role === 'owner') {
        console.log('✅ Usuario owner detectado en refresh token');
        // Generar nuevos tokens sin clientId para owners
        const tokens = this._createTokens(null, userId);
        return res.status(200).json({
          status: 'success',
          data: { tokens }
        });
      }
    }

    // Verificar si el cliente aún existe y está activo (para no-owners)
    if (clientId) {
      const client = await Client.findById(clientId);
      if (!client || client.status !== 'active') {
        console.log('❌ Cliente no activo o no existente');
        return next(new AppError('Client no longer active', 401));
      }
    }

    // Generar nuevos tokens
    console.log('✅ Generando nuevos tokens');
    const tokens = this._createTokens(clientId, userId);

    return res.status(200).json({
      status: 'success',
      data: { tokens }
    });
  });

  // Logout
  logout = catchAsync(async (req, res) => {
    console.log(`🚪 Logout de usuario: ${req.userId}`);
    
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
    
    console.log(`🔑 Solicitud de cambio de contraseña para userId=${userId}, userType=${userType}`);

    const UserModel = userType === 'client' ? Client : UserAccount;
    const user = await UserModel.findById(userId).select('+password');

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return next(new AppError('User not found', 404));
    }

    // Verificar password actual
    console.log('🔍 Verificando contraseña actual...');
    const isPasswordValid = await user.verifyPassword(currentPassword);
    console.log(`🔍 Contraseña actual válida: ${isPasswordValid ? 'SÍ' : 'NO'}`);
    
    if (!isPasswordValid) {
      console.log('❌ Contraseña actual incorrecta');
      return next(new AppError('Current password is incorrect', 401));
    }

    // Actualizar password
    console.log('🔍 Actualizando contraseña...');
    user.password = newPassword;
    await user.save();
    console.log('✅ Contraseña actualizada correctamente');

    return res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  });

  // Solicitud de reset de contraseña
  forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    console.log(`🔑 Solicitud de recuperación de contraseña para: ${email}`);

    // Buscar usuario
    const client = await Client.findOne({ email });
    const userAccount = await UserAccount.findOne({ email });
    
    const user = client || userAccount;
    if (!user) {
      console.log('❌ No se encontró ningún usuario con este email');
      return next(new AppError('No user found with that email', 404));
    }

    console.log(`✅ Usuario encontrado: ${user._id}`);

    // Asegurarnos de que el campo security exista
    if (!user.security) {
      console.log('⚠️ Campo security no existía, inicializando...');
      user.security = {};
    }

    // Generar token de reset
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    console.log(`✅ Token de reset generado: ${resetToken.substring(0, 10)}...`);

    try {
      // Aquí implementarías el envío del email, por ejemplo:
      // await sendPasswordResetEmail(email, resetToken);
      console.log('✅ Token de reset listo para enviar por email');

      return res.status(200).json({
        status: 'success',
        message: 'Reset token sent to email'
      });
    } catch (error) {
      // Si hay error, limpiar el token y expiración
      console.log(`❌ Error al enviar email: ${error.message}`);
      user.security.passwordResetToken = undefined;
      user.security.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new AppError('Error sending email. Please try again later.', 500));
    }
  });

  // Reset de contraseña
  resetPassword = catchAsync(async (req, res, next) => {
    const { token, newPassword } = req.body;
    console.log(`🔑 Solicitud de reset de contraseña con token: ${token ? token.substring(0, 10) : 'no token'}...`);

    // Buscar usuario con token válido
    const client = await Client.findOne({
      'security.passwordResetToken': token,
      'security.passwordResetExpires': { $gt: Date.now() }
    });

    const userAccount = await UserAccount.findOne({
      'security.passwordResetToken': token,
      'security.passwordResetExpires': { $gt: Date.now() }
    });

    console.log(`🔍 Cliente encontrado con token: ${client ? 'SÍ' : 'NO'}`);
    console.log(`🔍 Usuario encontrado con token: ${userAccount ? 'SÍ' : 'NO'}`);

    const user = client || userAccount;
    if (!user) {
      console.log('❌ Token inválido o expirado');
      return next(new AppError('Token is invalid or has expired', 400));
    }

    // Asegurarnos de que el campo security exista
    if (!user.security) {
      console.log('⚠️ Campo security no existía, inicializando...');
      user.security = {};
    }

    // Actualizar password y limpiar tokens
    console.log('🔍 Actualizando contraseña...');
    user.password = newPassword;
    user.security.passwordResetToken = undefined;
    user.security.passwordResetExpires = undefined;
    await user.save();
    console.log('✅ Contraseña reseteada correctamente');

    return res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });
  });

  // Verificar estado de sesión
  checkSession = catchAsync(async (req, res, next) => {
    // Esta función asume que el middleware 'protect' ya verificó el token
    const { clientId, userId, userType } = req;
    console.log(`🔍 Verificando sesión: userId=${userId}, clientId=${clientId}, userType=${userType}`);

    // Si no hay userId, significa que el usuario está autenticado como cliente
    if (!userId) {
      console.log('🔍 Sesión de cliente, buscando información...');
      const client = await Client.findById(clientId);
      
      if (!client) {
        console.log('❌ Cliente no encontrado');
        return next(new AppError('Client not found', 404));
      }
      
      console.log('✅ Información de cliente obtenida');
      return res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: client._id,
            name: client.name,
            email: client.email,
            role: 'client'
          }
        }
      });
    }

    // Si hay userId, es un UserAccount
    console.log('🔍 Sesión de usuario, buscando información...');
    const user = await UserAccount.findById(userId);
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return next(new AppError('User not found', 404));
    }

    console.log('✅ Información de usuario obtenida');
    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          clientId: user.role !== 'owner' ? user.clientId : null
        }
      }
    });
  });

  // Método para crear hash bcrypt manualmente (para depuración)
  async _createPasswordHash(password) {
    try {
      console.log(`🔍 Generando hash para contraseña: ${password}`);
      const salt = await bcrypt.genSalt(12);
      console.log(`🔍 Salt generado: ${salt}`);
      const hash = await bcrypt.hash(password, salt);
      console.log(`🔍 Hash generado: ${hash}`);
      return hash;
    } catch (error) {
      console.log(`❌ Error al generar hash: ${error.message}`);
      throw error;
    }
  }

  // Método para comparar contraseñas manualmente (para depuración)
  async _comparePasswords(plainPassword, hashedPassword) {
    try {
      console.log(`🔍 Comparando contraseñas manualmente`);
      console.log(`🔍 Contraseña plana: ${plainPassword}`);
      console.log(`🔍 Contraseña hasheada: ${hashedPassword.substring(0, 10)}...`);
      const result = await bcrypt.compare(plainPassword, hashedPassword);
      console.log(`🔍 Resultado de comparación: ${result ? 'ÉXITO' : 'FALLO'}`);
      return result;
    } catch (error) {
      console.log(`❌ Error al comparar contraseñas: ${error.message}`);
      throw error;
    }
  }

  // Método privado para crear tokens
  _createTokens(clientId, userId = null) {
    // Preparar payload
    const payload = { userId };
    
    // Solo incluir clientId si existe (para no-owners)
    if (clientId) {
      payload.clientId = clientId;
    }
    
    console.log(`🔍 Creando tokens con payload:`, payload);

    // Access Token
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // Refresh Token
    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
  }
}

// Método para hashear una contraseña directamente (para uso en scripts)
AuthController.hashPassword = async (password) => {
  console.log(`💡 Generando hash para contraseña: ${password}`);
  try {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    console.log(`💡 Hash generado: ${hash}`);
    return hash;
  } catch (error) {
    console.log(`❌ Error al generar hash: ${error.message}`);
    throw error;
  }
};

module.exports = new AuthController();