const UserAccount = require('../models/UserAccount');
const Client = require('../models/Client');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { sendInvitationEmail } = require('../services/email.service');

class UserAccountController {
  // Crear/Invitar nuevo usuario
  createUser = catchAsync(async (req, res) => {
    const {
      email,
      name,
      role,
      permissions,
      allowedDomains
    } = req.body;
    const { clientId } = req;

    // Verificar si el cliente puede crear más usuarios
    const canInvite = await UserAccount.validateInvitation(
      clientId,
      role,
      req.userId
    );

    if (!canInvite.canInvite) {
      throw new AppError('User limit reached for your subscription', 400);
    }

    // Verificar si el email ya existe
    const existingUser = await UserAccount.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    // Generar contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);

    // Crear usuario
    const user = await UserAccount.create({
      clientId,
      email,
      name,
      password: tempPassword,
      role,
      status: 'pending',
      customPermissions: {
        enabled: !!permissions,
        permissions
      },
      accessControl: {
        allowedDomains
      }
    });

    // Enviar email de invitación
    await sendInvitationEmail(email, {
      name,
      tempPassword,
      inviter: req.user.name
    });

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  });

  // Obtener usuarios del cliente
  getUsers = catchAsync(async (req, res) => {
    const { clientId } = req;
    const { status, role, search } = req.query;

    const query = { clientId };

    if (status) query.status = status;
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await UserAccount.find(query)
      .select('-password -security')
      .sort('name');

    res.status(200).json({
      status: 'success',
      data: { users }
    });
  });

  // Obtener usuario específico
  getUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;

    const user = await UserAccount.findOne({
      _id: id,
      clientId
    }).select('-password -security');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  });

  // Actualizar usuario
  updateUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req;
    const updates = req.body;

    // Campos no actualizables
    delete updates.password;
    delete updates.email;
    delete updates.clientId;
    delete updates.status;

    // Verificar si el usuario existe
    const user = await UserAccount.findOne({ _id: id, clientId });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verificar permisos para actualizar roles
    if (updates.role && req.user.role !== 'admin') {
      throw new AppError('Only admins can update roles', 403);
    }

    // Actualizar usuario
    const updatedUser = await UserAccount.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -security');

    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  });

  // Activar/Desactivar usuario
  toggleUserStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { clientId } = req;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const user = await UserAccount.findOneAndUpdate(
      { _id: id, clientId },
      { status },
      { new: true }
    ).select('-password -security');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  });

  // Actualizar permisos de usuario
  updatePermissions = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { permissions } = req.body;
    const { clientId } = req;

    const user = await UserAccount.findOne({ _id: id, clientId });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Validar que los permisos sean válidos para el rol
    const validPermissions = user.validatePermissionsForRole(permissions);
    if (!validPermissions.isValid) {
      throw new AppError(`Invalid permissions: ${validPermissions.errors.join(', ')}`, 400);
    }

    user.customPermissions = {
      enabled: true,
      permissions
    };

    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          permissions: user.customPermissions
        }
      }
    });
  });

  // Actualizar preferencias de usuario
  updatePreferences = catchAsync(async (req, res) => {
    const { userId } = req;
    const { preferences } = req.body;

    const user = await UserAccount.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true }
    ).select('preferences');

    res.status(200).json({
      status: 'success',
      data: { preferences: user.preferences }
    });
  });

  // Configurar MFA
  setupMFA = catchAsync(async (req, res) => {
    const { userId } = req;
    const user = await UserAccount.findById(userId);

    const mfaDetails = await user.setupMFA();

    res.status(200).json({
      status: 'success',
      data: {
        secret: mfaDetails.secret,
        recoveryKeys: mfaDetails.recoveryKeys
      }
    });
  });

  // Verificar MFA
  verifyMFA = catchAsync(async (req, res) => {
    const { userId } = req;
    const { token } = req.body;

    const user = await UserAccount.findById(userId);
    const isValid = await user.verifyMFAToken(token);

    if (!isValid) {
      throw new AppError('Invalid MFA token', 400);
    }

    res.status(200).json({
      status: 'success',
      message: 'MFA verified successfully'
    });
  });
}

module.exports = new UserAccountController();