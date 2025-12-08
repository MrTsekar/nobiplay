import apm from 'elastic-apm-node';

// Initialize APM before anything else
apm.start({
  serviceName: process.env.APM_SERVICE_NAME || 'nobiplay-backend',
  serverUrl: process.env.APM_SERVER_URL || 'http://localhost:8200',
  environment: process.env.NODE_ENV || 'development',
  active: process.env.APM_ENABLED === 'true',
  captureExceptions: true,
  captureHeaders: true,
  captureBody: 'all',
  logUncaughtExceptions: true,
});

export default apm;
