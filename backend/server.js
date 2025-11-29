const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDatabase, getOne } = require('./config/database');
// ... (imports)


const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth'); // Nuova rotta
const userRoutes = require('./routes/users');
const listRoutes = require('./routes/lists');
const taskRoutes = require('./routes/tasks');
const settingsRoutes = require('./routes/settings');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 5001;

// LOGGING RADICALE: Logga ogni richiesta appena arriva
app.use((req, res, next) => {
  console.log(`🔍 INCOMING: ${req.method} ${req.url}`);
  console.log('   Headers:', JSON.stringify(req.headers));
  next();
});

// Vercel è dietro un proxy, quindi dobbiamo fidarci del primo proxy per il rate limiting
app.set('trust proxy', 1);

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
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Production: Allow Vercel domains and configured FRONTEND_URL
    const allowedOrigin = process.env.FRONTEND_URL;
    if ((allowedOrigin && origin === allowedOrigin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Fallback: Log blocked origin but allow it for now to debug (remove in strict prod)
    console.log('⚠️ CORS: Allowing unknown origin:', origin);
    return callback(null, true);
  },
  credentials: true
}));

const session = require('express-session');
const cookieParser = require('cookie-parser');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Configurazione Sessione
app.use(session({
  secret: process.env.JWT_SECRET || 'super_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in prod (https)
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 giorni
  }
}));

// Health check
// Health check con verifica DB
app.get('/api/health', async (req, res) => {
  try {
    // Test connessione DB leggero
    const dbResult = await getOne('SELECT NOW()');

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
      db_time: dbResult.now
    });
  } catch (error) {
    console.error('❌ Health Check DB Error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: 'Database connection failed: ' + error.message
    });
  }
});

// Routes API
app.use('/api/auth/google', googleAuthRoutes); // Nuova rotta
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

    // Su Vercel/Production, evita di inizializzare il DB ad ogni avvio per performance e stabilità
    // Esegui solo se esplicitamente richiesto o in sviluppo
    if (process.env.NODE_ENV !== 'production' || process.env.INIT_DB === 'true') {
      await initDatabase();
      console.log('✅ Database initialized');
    } else {
      console.log('ℹ️ Skipping database initialization in production (set INIT_DB=true to run)');
    }

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