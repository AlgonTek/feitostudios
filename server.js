import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Enable Gzip/Deflate compression for all responses (HTML, CSS, JS, SVG, JSON)
// Reduces text payloads by ~75-80% for limited-data connections
app.use(compression({
  threshold: 0,
  level: 6,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Client Hints and Save-Data headers
app.use((req, res, next) => {
  res.set('Accept-CH', 'Save-Data, ECT, Downlink');
  res.set('Vary', 'Accept-Encoding, Save-Data');
  next();
});

// Special cache header for Service Worker (never cache sw.js aggressively)
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Serve static files with caching for limited-data environments
app.use(express.static(__dirname, {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      // Revalidate HTML so users get fresh content, but cache allows instant 304s
      res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=86400');
    } else if (filePath.match(/\.(jpg|jpeg|png|webp|svg|woff2?|ico)$/)) {
      // Immutable static assets: 30 days cache
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    } else if (filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Serve index.html on root path
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=86400');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`FEITO.DIGITAL optimized server running on http://${HOST}:${PORT}`);
});
