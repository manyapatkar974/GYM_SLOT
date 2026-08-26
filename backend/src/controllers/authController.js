const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Handles user registration.
 * Route: POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await AuthService.registerUser(name, email, password);
  return ApiResponse.created(res, 'User registered successfully', result);
});

/**
 * Handles user login.
 * Route: POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.loginUser(email, password);
  return ApiResponse.success(res, 'Login successful', result);
});

module.exports = {
  register,
  login,
};
