const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('node:fs/promises');
const path = require('node:path');

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5001;
const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

const projectRoot = path.resolve(__dirname, '..');
const datasetDir = path.join(projectRoot, 'dataset');

const datasetFiles = {
  scenic: 'Scenic_Spot_C_f.csv',
  hotel: '臺北市一般旅館名冊.csv',
  hostel: '臺北市民宿名冊.csv',
  busStops: '8_站牌.csv',
  touristService: '臺北市旅遊服務中心服務據點資訊1140919.csv',
};

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function parseCsvLine(line) {
  const columns = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      columns.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  columns.push(current.trim());
  return columns;
}

async function readCsvRecords(fileName, limit = 10) {
  const filePath = path.join(datasetDir, fileName);
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1, limit + 1).map((line) => {
    const values = parseCsvLine(line);
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    return record;
  });
}

async function getFileLineCount(fileName) {
  const filePath = path.join(datasetDir, fileName);
  const content = await fs.readFile(filePath, 'utf8');
  const rows = content.split(/\r?\n/).filter(Boolean);
  return Math.max(rows.length - 1, 0);
}

async function fetchPythonHealth() {
  try {
    const response = await fetch(`${pythonBackendUrl}/health`);
    if (!response.ok) {
      throw new Error(`Python health check failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return {
      status: 'unavailable',
      service: 'python-ai-backend',
      reason: error.message,
    };
  }
}

app.get('/api/health', async (_req, res) => {
  const python = await fetchPythonHealth();

  res.json({
    status: 'ok',
    service: 'taipei-vibe-api-gateway',
    timestamp: new Date().toISOString(),
    python,
  });
});

app.get('/api/datasets/overview', async (_req, res) => {
  try {
    const [scenicCount, hotelCount, hostelCount, busStopCount, serviceCenterCount] = await Promise.all([
      getFileLineCount(datasetFiles.scenic),
      getFileLineCount(datasetFiles.hotel),
      getFileLineCount(datasetFiles.hostel),
      getFileLineCount(datasetFiles.busStops),
      getFileLineCount(datasetFiles.touristService),
    ]);

    res.json({
      scenicCount,
      hotelCount,
      hostelCount,
      busStopCount,
      serviceCenterCount,
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to read datasets: ${error.message}` });
  }
});

app.get('/api/spots', async (req, res) => {
  const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 8));

  try {
    const rows = await readCsvRecords(datasetFiles.scenic, limit);
    const normalized = rows.map((row, index) => ({
      id: index + 1,
      name: row.stitle || row.name || row.名稱 || 'Unknown Spot',
      category: row.CAT1 || row.CAT2 || row.類別 || 'Travel',
      location: row.address || row.地址 || row.district || 'Taipei',
      description: row.xbody || row.description || row.簡介 || 'No description available.',
    }));

    res.json({ spots: normalized });
  } catch (error) {
    res.status(500).json({ error: `Failed to parse scenic spots: ${error.message}` });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/posts`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/plan', async (req, res) => {
  const payload = req.body || {};

  try {
    const response = await fetch(`${pythonBackendUrl}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Python planner failed: ${response.status} ${errorText}`);
    }

    const plannerResult = await response.json();
    res.json(plannerResult);
  } catch (error) {
    res.status(502).json({
      error: error.message,
      fallback: {
        title: 'Taipei Vibe quick fallback',
        summary: 'Python backend unavailable. This is a temporary local route.',
        steps: [
          {
            time: '10:00',
            activity: 'Taipei 101 area walk',
            transport: 'MRT',
            note: 'Start with iconic landmarks.',
          },
          {
            time: '13:00',
            activity: 'Lunch near Xinyi',
            transport: 'Walk',
            note: 'Choose highly rated local restaurants.',
          },
          {
            time: '16:00',
            activity: 'Indoor museum backup',
            transport: 'Bus',
            note: 'Switch here for rain conditions.',
          },
        ],
        safety: ['Verify legal accommodation list before checkout.'],
      },
    });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/api/check-hotel', async (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const [hotels, hostels] = await Promise.all([
      readCsvRecords(datasetFiles.hotel, 1000),
      readCsvRecords(datasetFiles.hostel, 1000)
    ]);
    
    // Combine both arrays
    const allAccommodations = [...hotels, ...hostels];
    
    // Fuzzy search for matching name or URL placeholder
    // The columns might be '旅宿名稱', '名稱', etc. 
    // We will just do a JSON stringify check for simplicity
    const match = allAccommodations.find(acc => {
      const values = Object.values(acc).join(' ').toLowerCase();
      return values.includes(query);
    });

    if (match) {
      // Find name field heuristically
      const name = match['旅館名稱'] || match['民宿名稱'] || match['名稱'] || match.name || 'Unknown Accommodation';
      return res.json({
        legal: true,
        message: `✅ Found legal registration for: ${name}`,
        details: match
      });
    }

    // If not found, return illegal and 3 random recommendations
    const recommendations = [];
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * hotels.length);
      const acc = hotels[randomIndex];
      const name = acc['旅館名稱'] || acc['民宿名稱'] || acc['名稱'] || acc.name || 'Legal Hotel';
      recommendations.push(name);
    }

    return res.json({
      legal: false,
      message: `⚠️ WARNING: "${query}" was not found in the legal accommodation registry. It may be unregistered or illegal.`,
      recommendations
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to check accommodation: ${error.message}` });
  }
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
  console.log(`Python backend target: ${pythonBackendUrl}`);
});