import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import { createClient } from "@supabase/supabase-js";

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Validate Supabase Credentials
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY.");
    process.exit(1); // Stop the server from starting
}

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
const port = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply Rate Limiting to All Routes
app.use(limiter);

// Middleware
app.use(morgan(isDevelopment ? 'dev' : 'combined'));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Verify Route Files Exist Before Using
const checkRouteFile = (path) => fs.existsSync(path);

// Load Routes Only If They Exist
if (checkRouteFile('./routes/image.js')) {
    const { imageRouter } = await import('./routes/image.js');
    app.use('/api/image', imageRouter);
}
if (checkRouteFile('./routes/health.js')) {
    const { healthRouter } = await import('./routes/health.js');
    app.use('/api/health', healthRouter);
}
if (checkRouteFile('./routes/verification.js')) {
    const { verificationRouter } = await import('./routes/verification.js');
    app.use('/api/verification', verificationRouter);
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof SyntaxError) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON payload',
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
  });
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🛠️ Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 API Endpoints:`)
  console.log(`   - GET  /api/health`);
  console.log(`   - POST /api/image`);
  console.log(`   - POST /api/verification`);
});
