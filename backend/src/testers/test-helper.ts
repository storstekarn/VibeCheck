import http from 'node:http';
import { chromium, type Browser, type Page } from 'playwright';

export interface TestServer {
  baseUrl: string;
  server: http.Server;
}

/**
 * Start a local HTTP server with custom route handlers.
 */
export async function startTestServer(
  routes: Record<string, { status?: number; headers?: Record<string, string>; body: string | Buffer }>
): Promise<TestServer> {
  const server = http.createServer((req, res) => {
    const route = routes[req.url || '/'];
    if (route) {
      res.statusCode = route.status ?? 200;
      if (route.headers) {
        for (const [key, value] of Object.entries(route.headers)) {
          res.setHeader(key, value);
        }
      }
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'text/html');
      }
      res.end(route.body);
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end('<html><body>Not Found</body></html>');
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  return {
    baseUrl: `http://localhost:${port}`,
    server,
  };
}

export async function stopTestServer(ts: TestServer): Promise<void> {
  await new Promise<void>((resolve) => {
    ts.server.close(() => resolve());
  });
}

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}
