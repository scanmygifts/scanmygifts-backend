import express from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import asyncHandler from 'express-async-handler';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Validation schema
const analyzeSchema = z.object({
  image: z.string().min(1)
});

// Analyze image
router.post('/analyze', asyncHandler(async (req, res) => {
  const { image } = analyzeSchema.parse(req.body);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Describe this gift in a concise way, focusing on its shape, color, and type. Keep it under 10 words." 
          },
          {
            type: "image_url",
            image_url: {
              url: image,
              detail: "low"
            }
          }
        ],
      },
    ],
    max_tokens: 50
  });

  const description = response.choices[0]?.message?.content || 'Unable to analyze image';
  res.json({ description });
}));

export default router;
