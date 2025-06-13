// extension/e2e/utils/mock-server.js
const express = require('express');
const bodyParser = require('body-parser');
const mockServerConfig = require('../config/mock-server.config');
const testConfig = require('../config/test.config');

const app = express();
app.use(bodyParser.json());

const { port, baseUrl, responses } = mockServerConfig;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`[Mock Server] ${req.method} ${req.url}`);
  next();
});

// Authentication Endpoints
app.post(`${baseUrl}/auth/login`, (req, res) => {
  const { email, password } = req.body;
  if (email === testConfig.testUser.email && password === testConfig.testUser.password) {
    return res.json(responses.authSuccess({ email: testConfig.testUser.email }));
  }
  return res.status(401).json(responses.error('Invalid credentials'));
});

app.get(`${baseUrl}/users/me`, (req, res) => {
  // Simulate token validation (very basic)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === 'mock-jwt-token') { // Assume this token is valid
      return res.json(responses.userProfile({ email: testConfig.testUser.email }));
    }
  }
  return res.status(401).json(responses.error('Unauthorized: Token is missing or invalid'));
});

// Placeholder for AI Endpoints (as per issue #153)
app.post(`${baseUrl}/ai/summarize`, (req, res) => {
  // const { content } = req.body;
  // Basic validation
  if (!req.body.content) {
    return res.status(400).json(responses.error('Missing content for summarization.'));
  }
  return res.json(responses.success({ summary: 'This is a mock summary of the provided content.' }));
});

app.post(`${baseUrl}/ai/extract-keypoints`, (req, res) => {
  if (!req.body.content) {
    return res.status(400).json(responses.error('Missing content for keypoint extraction.'));
  }
  return res.json(responses.success({ keypoints: ['Mock Keypoint 1', 'Mock Keypoint 2'] }));
});

app.post(`${baseUrl}/library/save`, (req, res) => {
    if (!req.body.url || !req.body.content) {
        return res.status(400).json(responses.error('Missing URL or content for saving to library.'));
    }
    console.log(`[Mock Server] Saving to library: ${req.body.url}`);
    return res.json(responses.success({ message: 'Content saved to library successfully (mocked).' , id: `mock-lib-id-${Date.now()}`}));
});


let server;
let isServerRunning = false;

const start = () => {
  return new Promise((resolve, reject) => {
    if (isServerRunning && server) {
      console.log(`Mock API server is already running on port ${port}`);
      return resolve();
    }
    
    server = app.listen(port, () => {
      isServerRunning = true;
      console.log(`Mock API server listening on port ${port}`);
      resolve();
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use, assuming mock server is already running`);
        isServerRunning = true;
        resolve();
      } else {
        reject(err);
      }
    });
  });
};

const stop = () => {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err) => {
        isServerRunning = false;
        if (err) {
          console.error('Error stopping mock server:', err);
          return reject(err);
        }
        console.log('Mock API server stopped.');
        resolve();
      });
    } else {
      resolve(); // No server to stop
    }
  });
};

// Allow running server directly for testing
if (require.main === module) {
    start().then(() => {
        console.log(`Mock server started directly. Access at http://localhost:${port}${baseUrl}`);
    });
    process.on('SIGINT', async () => {
        console.log('Stopping mock server...');
        await stop();
        process.exit(0);
    });
}

module.exports = { start, stop, app }; // Export app for potential supertest usage if needed later
