import { createServer } from 'http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import serverEntry from './dist/server/server.js';

const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, 'dist/client');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveStaticFile(urlPath, method, res) {
  if (method !== 'GET' && method !== 'HEAD') {
    return false;
  }

  const decodedPath = decodeURIComponent(urlPath);
  const relativePath = decodedPath.replace(/^\/+/, '');
  if (!relativePath) {
    return false;
  }

  const filePath = path.normalize(path.join(clientDir, relativePath));
  if (!filePath.startsWith(clientDir)) {
    return false;
  }

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return false;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', path.extname(filePath).toLowerCase() === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable');

    if (method === 'HEAD') {
      res.end();
      return true;
    }

    const fileBuffer = await readFile(filePath);
    res.end(fileBuffer);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  try {
    // Convert Node.js request to Web Request
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (await serveStaticFile(url.pathname, req.method || 'GET', res)) {
      return;
    }

    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
    });

    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks).toString();
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body,
    });

    // Call the TanStack Start handler
    const response = await serverEntry.fetch(request);

    // Convert Web Response to Node.js response
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
