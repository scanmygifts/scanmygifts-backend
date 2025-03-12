import express from "express";
import { z } from "zod";
import twilio from "twilio";
import asyncHandler from "express-async-handler";
import { supabase } from "../lib/supabase.js";

const router = express.Router();

// Validation schema for sending verification code
const sendCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
});

// Initialize Twilio client
const initTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid?.startsWith("AC") || !authToken || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn("Twilio credentials not properly configured");
    return null;
  }

  return twilio(accountSid, authToken);
};

// **✅ Send Verification Code**
router.post(
  "/send",
  asyncHandler(async (req, res) => {
    const { phoneNumber } = sendCodeSchema.parse(req.body);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // OTP expires in 10 minutes
    const createdAt = new Date().toISOString();
    const isDevelopment = process.env.NODE_ENV === "development";

    try {
      // ✅ Store new verification code in Supabase
      const { error: dbError } = await supabase.from("verification_codes").upsert(
        [
          {
            phone_number: phoneNumber,
            otp_code: verificationCode,
            expires_at: expiresAt,
            created_at: createdAt,
          },
        ],
        { onConflict: "phone_number" }
      );

      if (dbError) {
        console.error("❌ Supabase Insert Error:", dbError);
        return res.status(500).json({ success: false, error: "Failed to store verification code", details: dbError.message });
      }

      if (isDevelopment) {
        console.log(`Development mode - Verification code for ${phoneNumber}: ${verificationCode}`);
        return res.json({ success: true, code: verificationCode, mode: "development" });
      }

      // ✅ In production, send SMS via Twilio
      const twilioClient = initTwilioClient();
      if (!twilioClient) {
        return res.status(503).json({ success: false, error: "SMS service not available" });
      }

      await twilioClient.messages.create({
        body: `Your ScanMyGifts verification code is: ${verificationCode}`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("❌ Verification Error:", error);
      res.status(500).json({ success: false, error: "Failed to send verification code", details: error.message });
    }
  })
);

export default router;
