/**
 * CORS Test Script
 * 
 * This script tests CORS configuration by making requests from different origins.
 * Run this after starting your backend server.
 * 
 * Usage: node test-cors.js
 */

const http = require('http');

const API_URL = 'http://localhost:3000';
const API_BASE = '/api/v1';

// Test origins
const testOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://example.com', // Should fail unless added to CORS_ORIGIN
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testCORS(origin) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `${API_BASE}/auth/login`,
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    };

    const req = http.request(options, (res) => {
      const allowOrigin = res.headers['access-control-allow-origin'];
      const allowCredentials = res.headers['access-control-allow-credentials'];
      const allowMethods = res.headers['access-control-allow-methods'];
      const allowHeaders = res.headers['access-control-allow-headers'];

      const result = {
        origin,
        status: res.statusCode,
        allowed: allowOrigin === origin || allowOrigin === '*',
        headers: {
          allowOrigin,
          allowCredentials,
          allowMethods,
          allowHeaders,
        },
      };

      resolve(result);
    });

    req.on('error', (error) => {
      resolve({
        origin,
        status: 'ERROR',
        allowed: false,
        error: error.message,
      });
    });

    req.end();
  });
}

async function testActualRequest() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'test123',
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `${API_BASE}/auth/login`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Origin': 'http://localhost:3000',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          corsHeader: res.headers['access-control-allow-origin'],
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      resolve({ error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  log('cyan', '\n🧪 CORS Configuration Test\n');
  log('blue', '━'.repeat(60));
  
  log('yellow', '\n📡 Testing Preflight (OPTIONS) Requests...\n');
  
  for (const origin of testOrigins) {
    const result = await testCORS(origin);
    
    if (result.error) {
      log('red', `❌ ${origin}`);
      log('red', `   Error: ${result.error}`);
    } else if (result.allowed) {
      log('green', `✅ ${origin}`);
      log('green', `   Status: ${result.status}`);
      log('green', `   Allow-Origin: ${result.headers.allowOrigin}`);
      log('green', `   Allow-Credentials: ${result.headers.allowCredentials}`);
    } else {
      log('red', `❌ ${origin} (Blocked)`);
      log('red', `   Status: ${result.status}`);
      log('red', `   Allow-Origin: ${result.headers.allowOrigin || 'Not set'}`);
    }
    console.log('');
  }
  
  log('blue', '━'.repeat(60));
  log('yellow', '\n📮 Testing Actual POST Request...\n');
  
  const actualResult = await testActualRequest();
  if (actualResult.error) {
    log('red', `❌ Error: ${actualResult.error}`);
  } else {
    log('green', `✅ Request completed`);
    log('green', `   Status: ${actualResult.status}`);
    log('green', `   CORS Header: ${actualResult.corsHeader}`);
    if (actualResult.status === 401 || actualResult.status === 404) {
      log('yellow', '   Note: 401/404 is expected (testing CORS, not auth)');
    }
  }
  
  log('blue', '\n' + '━'.repeat(60));
  log('cyan', '\n✨ Test Complete!\n');
  
  log('yellow', '💡 Tips:');
  log('reset', '  • All configured origins should show ✅');
  log('reset', '  • Blocked origins will show ❌');
  log('reset', '  • Add origins to CORS_ORIGIN in .env if needed');
  log('reset', '  • Restart backend after changing .env\n');
}

// Check if server is running first
const healthCheck = http.get(`${API_URL}${API_BASE}/auth/login`, () => {
  runTests();
}).on('error', (error) => {
  log('red', '\n❌ Cannot connect to backend server!');
  log('yellow', '\nPlease ensure the backend is running:');
  log('cyan', '  npm run start:dev\n');
  log('yellow', `Expected server at: ${API_URL}${API_BASE}`);
  log('yellow', `Error: ${error.message}\n`);
});
