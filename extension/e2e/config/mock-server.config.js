// extension/e2e/config/mock-server.config.js
module.exports = {
  port: process.env.MOCK_API_PORT || 3001,
  baseUrl: '/api/v1', // Base path for all mock API routes
  // Define standard responses
  responses: {
    success: (data = {}) => ({ status: 'success', data }),
    error: (message = 'An error occurred', errors = []) => ({ status: 'error', message, errors }),
    authSuccess: (token = 'mock-jwt-token', user = {}) => ({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id || 'mock-user-id',
        email: user.email || 'test@example.com',
        full_name: user.full_name || 'Test User',
        // ... other user properties
      },
    }),
    userProfile: (user = {}) => ({
      id: user.id || 'mock-user-id',
      email: user.email || 'test@example.com',
      full_name: user.full_name || 'Test User',
      is_active: true,
      is_superuser: false,
      // ... other user properties
    }),
  }
};
