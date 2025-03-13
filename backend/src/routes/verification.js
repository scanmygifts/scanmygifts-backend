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
router.post("/send", asyncHandler(async (req, res) => {
  const { phoneNumber } = sendCodeSchema.parse(req.body);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // ⏳ 60s expiration

  try {
    // ✅ Delete existing OTPs for the phone number before inserting a new one
    await supabase.from("verification_codes").delete().eq("phone_number", phoneNumber);

    // ✅ Store new OTP in Supabase
    const { error: insertError } = await supabase.from("verification_codes").insert([
      { phone_number: phoneNumber, otp_code: verificationCode, expires_at: expiresAt, created_at: new Date().toISOString() }
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
}));

export default router;
