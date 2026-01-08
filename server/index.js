import https from "https";
import fs from "fs";
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load SSL certs
const key = fs.readFileSync('./ssl/key.pem');
const cert = fs.readFileSync('./ssl/cert.pem');

const PORT = 5002;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Test route
app.get("/", (req, res) => {
  res.send("Secure backend is working!");
});

// OTP endpoint
app.post("/api/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with expiration (5 minutes)
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // In production, integrate with Twilio, AWS SNS, or similar SMS service
    // For now, we'll return the OTP (remove this in production!)
    console.log(`OTP for ${phone}: ${otp}`);
    
    // Example Twilio integration (uncomment and configure):
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: `Your PrintsNCuts verification code is: ${otp}`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // });

    res.json({ 
      success: true, 
      message: "OTP sent successfully",
      // Remove this in production - only for demo
      otp: otp 
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Verify OTP endpoint
app.post("/api/verify-otp", (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: "Phone number and OTP are required" });
    }

    const stored = otpStore.get(phone);
    
    if (!stored) {
      return res.status(400).json({ error: "OTP not found or expired" });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ error: "OTP expired" });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // OTP verified successfully
    otpStore.delete(phone);
    res.json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// Start HTTPS server
https.createServer({ key, cert }, app).listen(PORT, () => {
  console.log(`🚀 HTTPS Server running at https://localhost:${PORT}`);
});
