# ScanMyGifts Backend API

Backend service for the ScanMyGifts application, handling SMS verification and image analysis.

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:5173,https://scanmygifts.netlify.app

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number

# OpenAI
OPENAI_API_KEY=your_openai_api_key
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