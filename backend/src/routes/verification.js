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

      // ✅ Step 2: Check if User Already Exists
      const { data: existingUser, error: userFetchError } = await supabase
        .from("users")
        .select("id")
        .eq("phone_number", phoneNumber)
        .maybeSingle();

      if (userFetchError) {
        console.error("❌ Error checking existing user:", userFetchError);
        return res.status(500).json({ success: false, error: "Database error while checking user" });
      }

      if (!existingUser) {
        // ✅ Step 3: Insert New User if Not Exists
        const { error: insertError } = await supabase.from("users").insert([
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

      // ✅ Step 4: NOW delete the OTP record **after** successful user verification
      const { error: otpDeleteError } = await supabase.from("verification_codes").delete().eq("phone_number", phoneNumber);

      if (otpDeleteError) {
        console.error("❌ Error deleting OTP:", otpDeleteError);
        return res.status(500).json({ success: false, error: "Failed to delete OTP" });
      }

      console.log("✅ OTP deleted successfully for:", phoneNumber);

      res.json({ success: true });
    } catch (error) {
      console.error("❌ Verification error:", error);
      res.status(500).json({ success: false, error: "Verification failed" });
    }
  })
);

// ✅ Update User First Name (Assumes User Already Exists)
router.post("/update-user", asyncHandler(async (req, res) => {
  const { phoneNumber, firstName } = req.body;
  console.log("📥 Received update request:", { phoneNumber, firstName });

  try {
    // ✅ Check if user already has a first_name
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("first_name")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Error fetching user:", fetchError);
      return res.status(500).json({ success: false, error: "Database error while checking user" });
    }

    console.log("🔎 User lookup result:", existingUser);

    const isNewUser = !existingUser?.first_name;
    
    console.log(`📌 ${isNewUser ? "New user - setting first name" : "Returning user - updating first name"}`);

    // ✅ Update first name
    const { error } = await supabase
      .from("users")
      .update({ first_name: firstName })
      .eq("phone_number", phoneNumber);

    if (error) {
      console.error("❌ Update Error:", error);
      return res.status(500).json({ success: false, error: "Failed to update user profile" });
    }

    console.log("✅ First name updated successfully:", firstName);

    res.json({ success: true, newUser: isNewUser });

  } catch (error) {
    console.error("❌ User Update Error:", error);
    res.status(500).json({ success: false, error: "User update failed" });
    }
  })
);
export default router;
