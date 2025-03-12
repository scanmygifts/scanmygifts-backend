import express from 'express';
import asyncHandler from 'express-async-handler';

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ success: true, message: "Verification route is working!" });
});

router.get('/', asyncHandler(async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    openai: Boolean(process.env.OPENAI_API_KEY)
  });
}));

export { router as healthRouter };
