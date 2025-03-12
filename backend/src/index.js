import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
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
const port = process.env.PORT || 8080; // ✅ Use Render’s dynamic port or default to 8080
const isDevelopment = process.env.NODE_ENV === 'development';

// **Fix: Trust Proxy for Express Rate Limit & Render**
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
const allowedOrigins = [
  "http://localhost:4001", // ✅ Allow local development frontend
  "https://your-frontend-site.netlify.app" // ✅ Replace with your actual deployed frontend URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed from this origin: " + origin));
    }
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
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

// **Import Routes**
import verificationRouter from "./routes/verification.js";
import healthRouter from "./routes/health.js";
import imageRouter from "./routes/image.js";

// **Use Routes**
app.use("/api/verification", verificationRouter);
app.use("/api/health", healthRouter);
app.use("/api/image", imageRouter);

// Root Route to Confirm Server is Running
app.get("/", (req, res) => {
  res.send("✅ Backend is running on Render.");
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

// **Start Server on Render’s Provided Port**
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🛠️ Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 API Endpoints:`)
  console.log(`   - GET  /api/health`);
  console.log(`   - POST /api/image`);
  console.log(`   - POST /api/verification`);
});
