import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import imageRouter from './routes/image';
import verificationRouter from './routes/verification';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the dist directory
app.use(express.static('dist'));

// API routes
app.use('/api/image', imageRouter);
app.use('/api/verification', verificationRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handle all other routes by serving the index.html
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
