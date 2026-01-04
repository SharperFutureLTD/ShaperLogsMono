import { serve } from '@hono/node-server';
import { app } from './server/app';
import { initializeFileProcessors } from './utils/file-processors/registry';
import 'dotenv/config';

const port = parseInt(process.env.PORT || '3001');

console.log('🚀 Starting Sharper-Logs API Server...');
console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${port}`);

// Initialize file processors
initializeFileProcessors();

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`✅ Server is running on http://localhost:${info.port}`);
  console.log(`📚 API Documentation: http://localhost:${info.port}/api/docs`);
  console.log(`📄 OpenAPI Spec: http://localhost:${info.port}/api/openapi.json`);
});
