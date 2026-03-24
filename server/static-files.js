import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const CONTENT_TYPES = {
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

export async function tryServeClientAsset({ clientDir, urlPath, method, res }) {
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

    const extension = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', CONTENT_TYPES[extension] || 'application/octet-stream');
    res.setHeader(
      'Cache-Control',
      extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    );

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
