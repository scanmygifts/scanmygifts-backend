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
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid?.startsWith('AC') || !authToken || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('Twilio credentials not properly configured');
    return null;
  }
  
  return twilio(accountSid, authToken);
};

// Send verification code
router.post('/send', asyncHandler(async (req, res) => {
  const { phoneNumber } = sendCodeSchema.parse(req.body);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  try {
    // Delete any existing verification codes for this phone number
    await supabase
      .from('verification_codes')
      .delete()
      .eq('phone_number', phoneNumber);

    // Store verification code in Supabase
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert([{
        phone_number: phoneNumber,
        code: verificationCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expiration
      }]);

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to store verification code' 
      });
    }

    // In development, return the code directly
    if (isDevelopment) {
      console.log(`Development mode - Verification code for ${phoneNumber}: ${verificationCode}`);
      return res.json({ 
        success: true, 
        code: verificationCode,
        mode: 'development'
      });
    }

    // In production, send SMS via Twilio
    const twilioClient = initTwilioClient();
    if (!twilioClient) {
      return res.status(503).json({ 
        success: false, 
        error: 'SMS service not available' 
      });
    }

    try {
      await twilioClient.messages.create({
        body: `Your ScanMyGifts verification code is: ${verificationCode}`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER
      });

      res.json({ success: true });
    } catch (twilioError) {
      console.error('Twilio error:', twilioError);
      res.status(400).json({ 
        success: false, 
        error: twilioError.message || 'Failed to send SMS'
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false,
      error: isDevelopment ? error.message : 'Failed to send verification code'
    });
  }
}));

// Verify code
router.post('/verify', asyncHandler(async (req, res) => {
  const { phoneNumber, code } = verifyCodeSchema.parse(req.body);
  
  try {
    // Check for valid verification code
    const { data: verificationData, error: verificationError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (verificationError) {
      console.error('Verification query error:', verificationError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to verify code' 
      });
    }

    if (!verificationData) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired verification code' 
      });
    }

    // Delete the used code
    await supabase
      .from('verification_codes')
      .delete()
      .eq('phone_number', phoneNumber)
      .eq('code', code);

    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (userError) {
      console.error('User query error:', userError);
    }

    res.json({ 
      success: true,
      user: userData || null
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Verification failed'
    });
  }
}));

export { router as verificationRouter };
