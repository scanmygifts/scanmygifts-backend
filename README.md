# ScanMyGifts

A web application that allows users to send and receive gifts with personalized messages through an innovative scanning system.

## Features

- Gift scanning with image recognition
- SMS verification for secure access
- Voice and video message recording
- Real-time gift matching
- Secure payment processing

## Tech Stack

- React with TypeScript
- Tailwind CSS for styling
- Supabase for database and authentication
- Vite for development and building

## Development

### Environment Setup

1. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Update the environment variables in `.env`:
   - Get your Supabase credentials from your Supabase project dashboard
   - For the backend API URL:
     1. Go to your Render dashboard
     2. Select your deployed backend service
     3. Copy the URL from the "URL" field (e.g., `https://your-app-name.onrender.com`)
     4. Add `/api` at the end of the URL
     5. Paste it as the value for `VITE_API_URL`

### Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## License

MIT
