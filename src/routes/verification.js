import express from 'express';
import { z } from 'zod';

const router = express.Router();

// Development mode helper
const isDevelopment = process.env.NODE_ENV === 'development';

// Validation schemas
const sendCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(15)
});

const verifyCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  code: z.string().length(6)
});

// Lazy initialization of Twilio client
const getTwilioClient = () => {
  // Only import and initialize Twilio if we have valid credentials
  if (
    process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    try {
      const twilio = require('twilio');
      return twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error);
      return null;
    }
  }
  return null;
};

// Send verification code
router.post('/send', async (req, res) => {
  try {
    const { phoneNumber } = sendCodeSchema.parse(req.body);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    if (isDevelopment) {
      // Development mode: return code directly
      console.log('Development mode: Skipping SMS send');
      return res.json({ 
        success: true, 
        code: verificationCode,
        mode: 'development'
      });
    }

    // Production mode: attempt to send SMS
    const twilioClient = getTwilioClient();
    if (!twilioClient) {
      console.warn('Twilio not configured, falling back to development mode');
      return res.json({ 
        success: true, 
        code: verificationCode,
        mode: 'development-fallback'
      });
    }

    await twilioClient.messages.create({
      body: `Your ScanMyGifts verification code is: ${verificationCode}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      console.error('SMS error:', error);
      res.status(500).json({ 
        error: 'Failed to send verification code',
        details: isDevelopment ? error.message : undefined
      });
    }
  }
});

// Verify code
router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber, code } = verifyCodeSchema.parse(req.body);
    
    if (isDevelopment || !getTwilioClient()) {
      // In development or without Twilio, accept any valid format code
      if (code.length === 6 && /^\d+$/.test(code)) {
        return res.json({ success: true });
      }
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // In production, verify against stored code
    // TODO: Implement proper code verification storage and checking
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ 
        error: 'Verification failed',
        details: isDevelopment ? error.message : undefined
      });
    }
  }
});

// Health check endpoint that includes Twilio status
router.get('/health', (req, res) => {
  const twilioConfigured = Boolean(getTwilioClient());
  
  res.json({
    status: 'ok',
    twilioConfigured,
    mode: isDevelopment ? 'development' : 'production'
  });
});

export { router as verificationRouter };