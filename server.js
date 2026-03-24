import { createServer } from 'http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import serverEntry from './dist/server/server.js';
import { tryServeClientAsset } from './server/static-files.js';

const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, 'dist/client');

const server = createServer(async (req, res) => {
  try {
    // Convert Node.js request to Web Request
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/merit-badges') {
      res.writeHead(308, { Location: '/merit-badges/' });
      res.end();
      return;
    }

    if (
      await tryServeClientAsset({
        clientDir,
        urlPath: url.pathname,
        method: req.method || 'GET',
        res,
      })
    ) {
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
