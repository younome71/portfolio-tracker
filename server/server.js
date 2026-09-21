if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { updateStockPrices } = require('./services/stockService');
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const userRoutes = require('./routes/user');
const errorHandler = require('./middlewares/error');
const { requestIdMiddleware, sendError, sendSuccess } = require('./utils/apiResponse');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

app.set('trust proxy', 1);

app.use(requestIdMiddleware);
app.use(helmet());
app.use(
  cors({
    origin: [clientUrl, 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many auth attempts, please try again later',
      details: {},
    },
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  if (!dbReady) {
    return res.status(503).json({ status: 'not_ready', db: false });
  }
  return res.status(200).json({ status: 'ready', db: true });
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'Portfolio Tracker API',
    health: '/health',
    ready: '/ready',
  });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/user', userRoutes);

app.post('/api/admin/manual-update', async (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.header('X-Admin-Key') !== adminKey) {
    return sendError(res, 403, 'FORBIDDEN', 'Admin key required');
  }

  try {
    // Respond immediately; job runs with in-process mutex
    updateStockPrices({ force: true }).catch((err) =>
      logger.error(`Manual update failed: ${err.message}`)
    );
    return sendSuccess(res, { accepted: true }, 202);
  } catch (error) {
    logger.error(`Manual stock update error: ${error.message}`);
    return sendError(res, 500, 'UPDATE_FAILED', 'Failed to start stock price update');
  }
});

app.use((req, res) => {
  return sendError(res, 404, 'NOT_FOUND', 'Route not found');
});

app.use(errorHandler);

async function start() {
  if (!process.env.MONGODB_URI) {
    logger.error('MONGODB_URI is not set');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('Connected to MongoDB');

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // Hourly price updates (mutex inside updateStockPrices)
  cron.schedule('0 * * * *', () => {
    logger.info('Running scheduled stock price update...');
    updateStockPrices().catch((err) =>
      logger.error(`Scheduled update failed: ${err.message}`)
    );
  });

  // Initial update after boot (non-blocking)
  updateStockPrices().catch((err) =>
    logger.error(`Initial stock price update failed: ${err.message}`)
  );

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      try {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
        process.exit(0);
      } catch (err) {
        logger.error(`Shutdown error: ${err.message}`);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
