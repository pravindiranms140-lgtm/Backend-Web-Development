const authService = require('../services/authService');
const { serializeUser } = require('../utils/serializer');
const { validateRegisterInput, validateLoginInput } = require('../utils/validation');

async function register(req, res, next) {
  try {
    const validationError = validateRegisterInput(req.body);
    if (validationError) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: validationError,
        },
      });
    }

    const { name, email, password } = req.body;
    const user = await authService.register({ name, email, password });
    return res.status(201).json(serializeUser(user));
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        error: {
          code: error.code || 'EMAIL_ALREADY_EXISTS',
          message: error.message || 'Email is already registered',
        },
      });
    }
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const validationError = validateLoginInput(req.body);
    if (validationError) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: validationError,
        },
      });
    }

    const { email, password } = req.body;
    const user = await authService.login({ email, password });
    return res.status(200).json(serializeUser(user));
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }
    next(error);
  }
}

module.exports = {
  register,
  login,
};
