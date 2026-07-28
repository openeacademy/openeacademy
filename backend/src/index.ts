import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { getRedisClient } from './config/redis';
import prisma from './config/database';

// Route imports
import authRoutes from './routes/v1/auth';
import examRoutes from './routes/v1/exams';
import subjectRoutes from './routes/v1/subjects';
import pdfRoutes from './routes/v1/pdfs';
import quizRoutes from './routes/v1/quizzes';
import subscriptionRoutes from './routes/v1/subscriptions';
import adminRoutes from './routes/v1/admin';
import notificationRoutes from './routes/v1/notifications';
import userRoutes from './routes/v1/user';
import fileRoutes from './routes/v1/files';

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: config.env === 'production' ? undefined : false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.cors.origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  skip: (req) => {
    // Exclude admin operations or local development throttling
    return req.path.includes('/admin') || req.originalUrl.includes('/admin');
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
});

app.use('/api/', limiter);
app.use('/api/v1/auth/', authLimiter);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (config.env !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
}

// ─── Swagger API Docs ─────────────────────────────────────────────────────────

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Open E Academy API',
      version: '1.0.0',
      description: 'Production API for Open E Academy — Competitive Examination Learning Platform',
      contact: { name: 'Open E Academy Dev Team', email: 'dev@openacademy.in' },
    },
    servers: [
      { url: `http://localhost:${config.port}`, description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/v1/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background-color: #2563EB; }',
  customSiteTitle: 'Open E Academy API Docs',
}));

app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0', env: config.env });
  } catch {
    res.status(503).json({ status: 'degraded', timestamp: new Date().toISOString() });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────

const API = `/api/${config.apiVersion}`;

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/exams`, examRoutes);
app.use(`${API}/subjects`, subjectRoutes);
app.use(`${API}/pdfs`, pdfRoutes);
app.use(`${API}/quizzes`, quizRoutes);
app.use(`${API}/subscriptions`, subscriptionRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/user`, userRoutes);
app.use(`${API}/files`, fileRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Server Startup ───────────────────────────────────────────────────────────

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');

    getRedisClient(); // Initialize (non-blocking)

    app.listen(config.port, '0.0.0.0', () => {
      logger.info(`🚀 Open E Academy API running on http://127.0.0.1:${config.port}`);
      logger.info(`📚 API Docs: http://127.0.0.1:${config.port}/api/docs`);
      logger.info(`🌿 Environment: ${config.env}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

export default app;
