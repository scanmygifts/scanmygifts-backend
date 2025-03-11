import express from 'express';
import { z } from 'zod';
import twilio from 'twilio';
import asyncHandler from 'express-async-handler';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Validation schemas
const sendCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(15)
});

const verifyCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  code: z.string().length(6)
});

// Initialize Twilio client
const initTwilioClient = () => {
  if (
    process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    return twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return null;
};

// Send verification code
router.post('/send', asyncHandler(async (req, res) => {
  const { phoneNumber } = sendCodeSchema.parse(req.body);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  try {
    // Store verification code in Supabase
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert([{
        phone_number: phoneNumber,
        code: verificationCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expiration
      }]);

    if (dbError) throw dbError;

    if (isDevelopment) {
      // In development, return the code directly
      return res.json({ 
        success: true, 
        code: verificationCode,
        mode: 'development'
      });
    }

    // In production, send SMS via Twilio
    const twilioClient = initTwilioClient();
    if (!twilioClient) {
      throw new Error('Twilio not configured');
    }

    await twilioClient.messages.create({
      body: `Your ScanMyGifts verification code is: ${verificationCode}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Failed to send verification code',
      details: isDevelopment ? error.message : undefined
    });
  }
}));

// Verify code
router.post('/verify', asyncHandler(async (req, res) => {
  const { phoneNumber, code } = verifyCodeSchema.parse(req.body);
  
  try {
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification code' 
      });
    }

    // Delete the used code
    await supabase
      .from('verification_codes')
      .delete()
      .eq('phone_number', phoneNumber)
      .eq('code', code);

    res.json({ success: true });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

export { router as verificationRouter };
