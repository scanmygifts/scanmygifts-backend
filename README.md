# ScanMyGifts Backend API

Backend service for the ScanMyGifts application, handling SMS verification and image analysis.

## Tech Stack

- Node.js with Express
- OpenAI for image analysis
- Twilio for SMS verification
- Supabase for database

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:5173

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

### Health Check
- GET `/api/health` - Check API status

### Image Analysis
- POST `/api/image/analyze` - Analyze gift image

### Phone Verification
- POST `/api/verification/send` - Send verification code
- POST `/api/verification/verify` - Verify code

## Deployment

This project is configured for deployment on Render using `render.yaml`. Required environment variables should be set in the Render dashboard.
