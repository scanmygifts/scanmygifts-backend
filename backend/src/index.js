import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
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

// Function to Check If Route File Exists Before Using
const checkAndUseRoute = (routePath, routeImport, routeUrl) => {
    if (fs.existsSync(path.resolve(routePath))) {
        import(routeImport).then((module) => {
            app.use(routeUrl, module.default || module);
            console.log(`✅ Loaded route: ${routeUrl}`);
        }).catch((err) => {
            console.error(`❌ Failed to load route ${routeUrl}:`, err);
        });
    } else {
        console.warn(`⚠️ Route file missing: ${routePath} - Skipping ${routeUrl}`);
    }
};

// Load Routes
checkAndUseRoute('./routes/image.js', './routes/image.js', '/api/image');
checkAndUseRoute('./routes/health.js', './routes/health.js', '/api/health');
checkAndUseRoute('./routes/verification.js', './routes/verification.js', '/api/verification');

// Root Route to Confirm Server is Running
app.get('/', (req, res) => {
  res.send('✅ Backend is running.');
});

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
