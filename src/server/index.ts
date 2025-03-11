import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static('dist'));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handle all other routes by serving the index.html
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
