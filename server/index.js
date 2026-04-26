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
const attractionImagesDir = path.join(projectRoot, 'tourist_attraction_images');
const curatedSpotsPath = path.join(datasetDir, '精選景點_one_hot.csv');

const datasetFiles = {
  scenic: 'Scenic_Spot_C_f.csv',
  hotel: '臺北市一般旅館名冊.csv',
  hostel: '臺北市民宿名冊.csv',
  busStops: '8_站牌.csv',
  touristService: '臺北市旅遊服務中心服務據點資訊1140919.csv',
};

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/tourist_attraction_images', express.static(attractionImagesDir));

let scenicRecordsPromise;
let attractionImageIndexPromise;
let curatedRowsPromise;

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}_]+/gu, '');
}

function encodeRelativePath(relativePath) {
  return relativePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function isValidUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toTaiwanNameVariants(value) {
  const base = cleanText(value);
  if (!base) return [];

  const variants = new Set([base]);
  variants.add(base.replace(/台/g, '臺'));
  variants.add(base.replace(/臺/g, '台'));
  variants.add(base.replace(/[()（）]/g, ''));
  return Array.from(variants);
}

async function readAllCsvRecords(fileName) {
  return readCsvRecords(fileName, Number.MAX_SAFE_INTEGER);
}

async function loadScenicRecords() {
  if (!scenicRecordsPromise) {
    scenicRecordsPromise = readAllCsvRecords(datasetFiles.scenic);
  }

  return scenicRecordsPromise;
}

async function loadCuratedRows() {
  if (!curatedRowsPromise) {
    curatedRowsPromise = (async () => {
      const content = await fs.readFile(curatedSpotsPath, 'utf8');
      const lines = content.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return [];

      const headers = parseCsvLine(lines[0]);
      return lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        return record;
      });
    })();
  }

  return curatedRowsPromise;
}

async function buildAttractionImageIndex() {
  const imageIndex = new Map();

  async function walk(directoryPath) {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))) {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
        continue;
      }

      const relativePath = path.relative(attractionImagesDir, entryPath);
      const fileName = path.basename(entry.name, extension);
      const folderNames = [];
      let currentDir = path.dirname(entryPath);
      while (currentDir.startsWith(attractionImagesDir) && currentDir !== attractionImagesDir) {
        folderNames.push(path.basename(currentDir));
        currentDir = path.dirname(currentDir);
      }

      for (const candidate of [fileName, ...folderNames]) {
        const normalizedCandidate = normalizeKey(candidate);
        if (normalizedCandidate && !imageIndex.has(normalizedCandidate)) {
          imageIndex.set(normalizedCandidate, relativePath);
        }
      }
    }
  }

  await walk(attractionImagesDir);
  return imageIndex;
}

async function loadAttractionImageIndex() {
  if (!attractionImageIndexPromise) {
    attractionImageIndexPromise = buildAttractionImageIndex();
  }

  return attractionImageIndexPromise;
}

function resolveSpotImageUrl(name, imageIndex) {
  for (const variant of toTaiwanNameVariants(name)) {
    const imagePath = imageIndex.get(normalizeKey(variant));
    if (imagePath) {
      return `/tourist_attraction_images/${encodeRelativePath(imagePath)}`;
    }
  }
  return '';
}

function resolveSpotLatitude(row) {
  const value = Number(row.Py || row.lat || row.latitude);
  return Number.isFinite(value) ? value : null;
}

function resolveSpotLongitude(row) {
  const value = Number(row.Px || row.lng || row.longitude);
  return Number.isFinite(value) ? value : null;
}

function extractCuratedTags(curatedRow) {
  const tagMapping = {
    室內: '室內',
    戶外: '戶外',
    親子友善: '親子友善',
    無障礙: '無障礙',
    文化歷史: '歷史建築',
    自然生態: '自然景觀',
    藝術展覽: '文創園區',
    宗教信仰: '宗教',
    購物娛樂: '購物',
    博物館: '博物館',
    溫泉: '溫泉',
    免費入場: '免費',
    夜間開放: '夜間',
    表演藝術: '表演藝術',
  };

  return Object.entries(tagMapping)
    .filter(([column]) => Number(curatedRow[column]) === 1)
    .map(([, tag]) => tag);
}

function pickSpotCategory(curatedTags, scenicRow) {
  const preferred = ['夜市', '博物館', '文創園區', '歷史建築', '自然景觀', '購物', '宗教', '溫泉'];
  const tagHit = preferred.find((tag) => curatedTags.includes(tag));
  if (tagHit) return tagHit;

  return cleanText(scenicRow?.CAT1 || scenicRow?.CAT2 || scenicRow?.Class1 || 'Travel') || 'Travel';
}

function buildScenicLookup(rows) {
  const lookup = new Map();

  rows.forEach((row) => {
    const candidateNames = [row.stitle, row.Name, row.name, row.名稱]
      .map((value) => cleanText(value))
      .filter(Boolean);

    candidateNames.forEach((name) => {
      toTaiwanNameVariants(name).forEach((variant) => {
        const key = normalizeKey(variant);
        if (key && !lookup.has(key)) {
          lookup.set(key, row);
        }
      });
    });
  });

  return lookup;
}

function buildCuratedSpotRecord(curatedRow, index, scenicLookup, imageIndex) {
  const name = cleanText(curatedRow['景點名稱']);
  if (!name) return null;

  const imageUrl = resolveSpotImageUrl(name, imageIndex);
  if (!imageUrl) return null;

  const scenicRow = scenicLookup.get(normalizeKey(name));
  const curatedTags = extractCuratedTags(curatedRow);

  return {
    id: scenicRow?.Id || `curated-${index + 1}`,
    name,
    category: pickSpotCategory(curatedTags, scenicRow),
    location: cleanText(scenicRow?.Add || scenicRow?.address || scenicRow?.地址 || `${scenicRow?.Region || '臺北市'}${scenicRow?.Town || ''}` || '臺北市') || '臺北市',
    description: cleanText(scenicRow?.Description || scenicRow?.Toldescribe || scenicRow?.xbody || name),
    image_url: imageUrl,
    lat: resolveSpotLatitude(scenicRow || {}),
    lng: resolveSpotLongitude(scenicRow || {}),
    tags: curatedTags,
  };
}

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
    const [scenicRows, curatedRows, imageIndex] = await Promise.all([
      loadScenicRecords(),
      loadCuratedRows(),
      loadAttractionImageIndex(),
    ]);

    const scenicLookup = buildScenicLookup(scenicRows);

    const normalized = curatedRows
      .map((row, index) => buildCuratedSpotRecord(row, index, scenicLookup, imageIndex))
      .filter(Boolean)
      .slice(0, limit);

    res.json({ spots: normalized });
  } catch (error) {
    res.status(500).json({ error: `Failed to parse curated spots: ${error.message}` });
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

app.get('/api/user/:username/points', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/user/${req.params.username}/points`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/user/add_points', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/user/add_points`, {
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

app.post('/api/user/spend_points', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/user/spend_points`, {
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

// ─── OSRM route proxy (avoids browser CORS restrictions) ────────────────────
app.get('/api/route', async (req, res) => {
  const { from_lat, from_lng, to_lat, to_lng, profile = 'driving' } = req.query;
  if (!from_lat || !from_lng || !to_lat || !to_lng) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const osrmUrl =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${from_lng},${from_lat};${to_lng},${to_lat}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return res.status(502).json({ error: 'OSRM error' });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    clearTimeout(timer);
    res.status(502).json({ error: error.message });
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

app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch(`${pythonBackendUrl}/models`);
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

app.post('/api/book', async (req, res) => {
  const { cart, details } = req.body;
  // Simulate network latency for \"booking\"
  await new Promise(resolve => setTimeout(resolve, 2000));
  res.json({
    success: true,
    message: 'Booking confirmed!',
    confirmationId: `TV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    summary: {
      items: cart?.length || 0,
      status: 'Confirmed',
      transport: 'Taxi & MRT Vouchers included',
      hotel: details?.hotel || 'Selected Legal Hotel'
    }
  });
});


app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
  console.log(`Python backend target: ${pythonBackendUrl}`);
});