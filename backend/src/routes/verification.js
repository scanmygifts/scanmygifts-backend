// import { createClient } from "@supabase/supabase-js";
import express from "express";
import { z } from "zod";
import twilio from "twilio";
import asyncHandler from "express-async-handler";
import { supabase } from "../lib/supabase.js";

const router = express.Router();

// // Initialize supabase;
// const adminSupabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_KEY // ✅ Use the service role key
// );


// Validation schema for sending verification code
const sendCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
});

// Validation schema for verifying verification code
const verifyCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  code: z.string().length(6),
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
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // ⏳ 60s expiration

    try {
      // ✅ Delete existing OTPs for the phone number before inserting a new one
      await supabase.from("verification_codes").delete().eq("phone_number", phoneNumber);

      // ✅ Store new OTP in Supabase
      const { error: insertError } = await supabase.from("verification_codes").insert([
        {
          phone_number: phoneNumber,
          otp_code: verificationCode,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error("❌ Supabase Insert Error:", insertError);
        return res.status(500).json({ success: false, error: "Failed to store verification code" });
      }

      // ✅ Send OTP via Twilio
      const twilioClient = initTwilioClient();
      await twilioClient.messages.create({
        body: `Your OTP is: ${verificationCode}. Expires in 60s.`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      res.json({ success: true, message: "OTP sent successfully!" });
    } catch (error) {
      console.error("❌ Verification Error:", error);
      res.status(500).json({ success: false, error: "Failed to send OTP", details: error.message });
    }
  })
);

// **✅ Verify the Verification Code**
router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const { phoneNumber, code } = verifyCodeSchema.parse(req.body);

    try {
      console.log("📥 Received OTP verification request:", { phoneNumber, code });

      // ✅ Step 1: Retrieve OTP from `verification_codes` Table
      const { data: verificationData, error: verificationError } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("phone_number", phoneNumber)
        .eq("otp_code", code)
        .gte("expires_at", new Date().toISOString()) // ✅ Ensure OTP is still valid
        .maybeSingle();

      if (verificationError) {
        console.error("❌ Error fetching OTP:", verificationError);
        return res.status(500).json({ success: false, error: "Database error while verifying OTP" });
      }

      if (!verificationData) {
        return res.status(400).json({ success: false, error: "Invalid or expired OTP" });
      }

      console.log("✅ OTP matched successfully for:", phoneNumber);

      // ✅ Step 2: Delete OTP after successful verification
      await supabase.from("verification_codes").delete().eq("phone_number", phoneNumber);

      // ✅ Step 3: Check if User Already Exists
      const { data: existingUser, error: userFetchError } = await adminSupabase
        .from("users")
        .select("id")
        .eq("phone_number", phoneNumber)
        .maybeSingle();

      if (userFetchError) {
        console.error("❌ Error checking existing user:", userFetchError);
        return res.status(500).json({ success: false, error: "Database error while checking user" });
      }

      if (!existingUser) {
        // ✅ Step 4: Insert New User if Not Exists
        const { error: insertError } = await adminSupabase.from("users").insert([
          { phone_number: phoneNumber }
        ]);

        if (insertError) {
          console.error("❌ Insert Error:", insertError);
          return res.status(500).json({ success: false, error: "Failed to create user" });
        }

        console.log("✅ New user inserted:", phoneNumber);
      } else {
        console.log("✅ User already exists:", phoneNumber);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("❌ Verification error:", error);
      res.status(500).json({ success: false, error: "Verification failed" });
    }
  })
);

export default router;
