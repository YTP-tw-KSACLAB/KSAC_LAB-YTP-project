const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'hackathon-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/message', (_req, res) => {
  res.json({
    message: 'Backend connected. You are ready to build your hackathon features.',
  });
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});