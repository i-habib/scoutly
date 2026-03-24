import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const hasBuildArtifacts = existsSync(fileURLToPath(new URL('../dist/server/server.js', import.meta.url)));
const port = 3100 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;

let serverProcess: ChildProcess | undefined;

describe.skipIf(!hasBuildArtifacts)('SSR server smoke tests', () => {
  beforeAll(async () => {
    serverProcess = spawn(process.execPath, ['server.js'], {
      cwd: rootDir,
      env: {
        ...process.env,
        PORT: String(port),
      },
      stdio: 'pipe',
    });

    await waitForServer(baseUrl);
  }, 30_000);

  afterAll(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
    }
  });

  it('serves the root route over SSR', async () => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type') || '').toContain('text/html');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('serves at least one compiled asset path from the rendered HTML', async () => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    const assetPath = extractAssetPath(html);

    expect(assetPath).toBeTruthy();

    const assetResponse = await fetch(`${baseUrl}${assetPath}`);
    expect(assetResponse.status).toBe(200);
    expect((assetResponse.headers.get('cache-control') || '').length).toBeGreaterThan(0);
  });
});

async function waitForServer(url: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`${url}/`, { method: 'HEAD' });
      if (response.status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(
    `Timed out waiting for server to become ready. Last error: ${String(lastError ?? 'unknown')}`,
  );
}

function extractAssetPath(html: string): string | null {
  const match = html.match(/(?:src|href)="(\/assets\/[^"]+)"/);
  return match ? match[1] : null;
}
