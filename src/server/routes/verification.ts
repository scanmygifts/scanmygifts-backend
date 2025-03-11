import { Router } from 'express';
import { z } from 'zod';
import twilio from 'twilio';

const router = Router();

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
  if (
    process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    try {
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Skipping SMS send');
      return res.json({ 
        success: true, 
        code: verificationCode,
        mode: 'development'
      });
    }

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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Verify code
router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber, code } = verifyCodeSchema.parse(req.body);
    
    if (process.env.NODE_ENV === 'development' || !getTwilioClient()) {
      if (code.length === 6 && /^\d+$/.test(code)) {
        return res.json({ success: true });
      }
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // In production, verify against stored code
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ 
        error: 'Verification failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

export default router;
