
let apm: any = null;

try {
  
  apm = require('elastic-apm-node');
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn('[APM] elastic-apm-node could not be loaded. Skipping APM:', message);
}

if (apm) {
  try {
    apm.start({
      serviceName: process.env.APM_SERVICE_NAME || 'nobiplay-backend',
      serverUrl: process.env.APM_SERVER_URL || '',
      environment: process.env.NODE_ENV || 'development',

      
      active: false,

      captureExceptions: true,
      captureHeaders: true,
      captureBody: 'all',
      logUncaughtExceptions: true,
    });

    console.log('[APM] Elastic APM initialized in safe mode.');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[APM] Failed to start APM:', message);
  }
}

export default apm;
