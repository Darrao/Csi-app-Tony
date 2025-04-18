export const config = {
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
    // prod
    MONGODB_URI: process.env.MONGODB_URI || 'fallback-uri',
    // local
    // MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/csi'
  };