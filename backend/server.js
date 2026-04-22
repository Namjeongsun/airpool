'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const db = require('./db'); // side-effect: initializes schema
const { seedIfEmpty } = require('./seed');
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// Auto-seed on startup when DB is empty. Critical on platforms with ephemeral
// filesystems (Render free tier) where the DB gets wiped on each redeploy.
seedIfEmpty();

// Trust proxy for correct rate-limit IP detection behind platform load balancers.
app.set('trust proxy', IS_PROD ? 1 : 'loopback');

app.use(helmet());
app.use(express.json({ limit: '256kb' }));
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// Additional origins allowed via env var (comma-separated).
const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);                               // same-origin, curl
    if (origin === 'null') return cb(null, true);                     // file:// pages
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return cb(null, true);
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true);
    if (/^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin)) return cb(null, true);
    if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)) return cb(null, true);
    if (extraOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: 허용되지 않은 출처입니다'));
  },
  credentials: false,
}));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: '인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요' },
});

app.get('/', (req, res) => {
  res.json({
    ok: true,
    data: {
      name: 'airpool-backend',
      status: 'up',
      endpoints: ['/health', '/auth', '/rides'],
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, data: { status: 'up', time: Date.now() } });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/rides', rideRoutes);
app.use('/rides/:id/messages', messageRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: '요청하신 경로를 찾을 수 없습니다' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ ok: false, error: err.message });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: '잘못된 JSON 형식입니다' });
  }
  console.error('[error]', err);
  return res.status(500).json({ ok: false, error: '서버 오류가 발생했습니다' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[airpool] listening on port ${PORT}`);
});

function shutdown(signal) {
  console.log(`[airpool] received ${signal}, shutting down`);
  server.close(() => {
    try { db.close(); } catch {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
