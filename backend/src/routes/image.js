import express from 'express';
import { z } from 'zod';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Development mode helper
const isDevelopment = process.env.NODE_ENV === 'development';

// Validation schema
const analyzeSchema = z.object({
  image: z.string().min(1)
});

// Analyze image
router.post('/analyze', async (req, res) => {
  try {
    const { image } = analyzeSchema.parse(req.body);
    
    if (isDevelopment) {
      // In development, return mock response
      return res.json({ 
        description: 'A rectangular red gift box with silver ribbon',
        mode: 'development'
      });
    }

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      console.error('OpenAI error:', error);
      res.status(500).json({ 
        error: 'Failed to analyze image',
        details: isDevelopment ? error.message : undefined
      });
    }
  }
});

export { router as imageRouter };
