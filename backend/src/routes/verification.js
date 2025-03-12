import express from "express";
import { z } from "zod";
import twilio from "twilio";
import asyncHandler from "express-async-handler";
import { supabase } from "../lib/supabase.js";

const router = express.Router();

// Validation schemas
const sendCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
});

const verifyCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  code: z.string().length(6),
  firstName: z.string().optional(),
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
    const isDevelopment = process.env.NODE_ENV === "development";

    try {
      // ✅ Store new verification code in Supabase
      const { error: dbError } = await supabase.from("verification_codes").upsert([
        {
          phone_number: phoneNumber,
          otp_code: verificationCode,
          expires_at: expiresAt,
        },
      ], { onConflict: "phone_number" });

      if (dbError) {
        console.error("Database error:", dbError);
        return res.status(500).json({
          success: false,
          error: "Failed to store verification code",
        });
      }

      // ✅ In development, return the code directly
      if (isDevelopment) {
        console.log(`Development mode - Verification code for ${phoneNumber}: ${verificationCode}`);
        return res.json({
          success: true,
          code: verificationCode,
          mode: "development",
        });
      }

      // ✅ In production, send SMS via Twilio
      const twilioClient = initTwilioClient();
      if (!twilioClient) {
        return res.status(503).json({
          success: false,
          error: "SMS service not available",
        });
      }

      try {
        await twilioClient.messages.create({
          body: `Your ScanMyGifts verification code is: ${verificationCode}`,
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
        });

        res.json({ success: true });
      } catch (twilioError) {
        console.error("Twilio error:", twilioError);
        res.status(400).json({
          success: false,
          error: twilioError.message || "Failed to send SMS",
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({
        success: false,
        error: isDevelopment ? error.message : "Failed to send verification code",
      });
    }
  })
);

// **✅ Verify OTP and Create/Update User**
router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const { phoneNumber, code, firstName } = verifyCodeSchema.parse(req.body);

    try {
      // ✅ Step 1: Check for valid OTP
      const { data: verificationData, error: verificationError } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("phone_number", phoneNumber)
        .eq("otp_code", code)
        .gte("expires_at", new Date().toISOString()) // ✅ Ensure OTP is not expired
        .maybeSingle();

      if (verificationError) {
        console.error("Verification query error:", verificationError);
        return res.status(500).json({
          success: false,
          error: "Failed to verify code",
        });
      }

      if (!verificationData) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired verification code",
        });
      }

      // ✅ Step 2: Delete OTP after successful verification
      await supabase
        .from("verification_codes")
        .delete()
        .eq("phone_number", phoneNumber)
        .eq("otp_code", code);

      // ✅ Step 3: Upsert user record only if firstName is provided
      if (firstName) {
        const { error: upsertError } = await supabase.from("users").upsert([
          {
            phone_number: phoneNumber,
            first_name: firstName,
            phone_verified: true,
          },
        ], { onConflict: "phone_number" });

        if (upsertError) {
          console.error("User upsert error:", upsertError);
          return res.status(500).json({
            success: false,
            error: "Failed to create/update user",
          });
        }
      }

      // ✅ Return success response
      res.json({ success: true });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === "development" ? error.message : "Verification failed",
      });
    }
  })
);

export default router;
