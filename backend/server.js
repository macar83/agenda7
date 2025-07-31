const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const listRoutes = require('./routes/lists');
const taskRoutes = require('./routes/tasks');
const settingsRoutes = require('./routes/settings');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware di sicurezza
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.rss2json.com", "https://apis.google.com"]
    }
  }
}));

// Rate limiting generale - più permissivo
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 200, // 200 richieste per IP ogni 15 minuti (era 100)
  message: {
    error: 'Troppe richieste da questo IP, riprova tra 15 minuti.'
  }
});
app.use('/api/', limiter);

// 🔧 FIX: Rate limiting specifico per login/register (rigorozo)
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Solo 10 tentativi di login ogni 15 minuti
  skipSuccessfulRequests: true,
  message: {
    error: 'Troppi tentativi di login, riprova tra 15 minuti.'
  }
});

// 🔧 FIX: Rate limiting più permissivo per verify token
const authVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 verifiche token ogni 15 minuti
  message: {
    error: 'Troppe verifiche token, riprova tra qualche minuto.'
  }
});

// 🔧 FIX: Applica rate limiting specifico per endpoint diversi
app.use('/api/auth/login', authLoginLimiter);
app.use('/api/auth/register', authLoginLimiter);
app.use('/api/auth/verify', authVerifyLimiter);

// Middleware generali
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);

// Middleware per gestire rotte non trovate
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint non trovato',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware per gestire errori globali
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  // Non esporre dettagli errori in produzione
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Errore interno del server',
    stack: isDevelopment ? err.stack : undefined
  });
});

// Inizializza database e avvia server
const startServer = async () => {
  try {
    console.log('🔧 Initializing database...');
    await initDatabase();
    console.log('✅ Database initialized');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Database connection established`);
      console.log(`🌐 API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();