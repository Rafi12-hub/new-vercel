// Server Configuration
module.exports = {
  development: {
    port: process.env.PORT || 5000,
    frontend_url: 'http://localhost:5173',
    backend_url: 'http://localhost:5000',
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
    socket_io: {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      }
    }
  },
  production: {
    port: process.env.PORT || 5000,
    frontend_url: process.env.FRONTEND_URL || 'https://rgmcse-compiler.vercel.app',
    backend_url: process.env.BACKEND_URL || 'https://rgmcse-compiler-api.vercel.app',
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'https://rgmcse-compiler.vercel.app',
        'https://rgmcse-compiler.com',
        'https://www.rgmcse-compiler.com'
      ],
      credentials: true,
    },
    socket_io: {
      cors: {
        origin: [
          process.env.FRONTEND_URL || 'https://rgmcse-compiler.vercel.app',
          'https://rgmcse-compiler.com',
          'https://www.rgmcse-compiler.com'
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    }
  },
  test: {
    port: 5001,
    frontend_url: 'http://localhost:5173',
    backend_url: 'http://localhost:5001',
    cors: {
      origin: '*',
      credentials: false,
    }
  }
};

const env = process.env.NODE_ENV || 'development';
module.exports.current = module.exports[env];
