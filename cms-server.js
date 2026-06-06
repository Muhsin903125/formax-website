const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

// Map /api/<path> to the serverless handler module that Vercel would invoke.
const API_ROUTES = {
  '/api/content': './api/content.js',
  '/api/session': './api/session.js',
  '/api/config': './api/config.js',
  '/api/contact': './api/contact.js',
  '/api/submissions': './api/submissions.js',
  '/api/cloudinary/signature': './api/cloudinary/signature.js',
};

async function loadDotEnv(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
      const [key, ...rest] = trimmed.split('=');
      if (process.env[key]) return;
      process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
    });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function readJsonBody(request, maxBytes = 6_000_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new Error('Request body is too large'));
        request.destroy();
      }
    });
    request.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });
    request.on('error', reject);
  });
}

// Adapt Node's res to the Vercel-style res.status().json() the handlers expect.
function decorateResponse(response) {
  response.status = (code) => {
    response.statusCode = code;
    return response;
  };
  response.json = (payload) => {
    if (!response.headersSent) {
      response.setHeader('content-type', 'application/json; charset=utf-8');
    }
    response.end(JSON.stringify(payload));
  };
  return response;
}

async function serveStatic(request, response, rootDir, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    decorateResponse(response).status(405).json({ error: 'Method not allowed' });
    return;
  }

  let safePathname = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  let requestedPath = path.resolve(rootDir, safePathname);
  const resolvedRoot = path.resolve(rootDir);

  if (!requestedPath.startsWith(`${resolvedRoot}${path.sep}`) && requestedPath !== resolvedRoot) {
    decorateResponse(response).status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    let stat = await fs.stat(requestedPath).catch(() => null);
    // Vercel cleanUrls: /about -> about.html
    if (!stat && !path.extname(requestedPath)) {
      const htmlPath = `${requestedPath}.html`;
      if (await fs.stat(htmlPath).catch(() => null)) {
        requestedPath = htmlPath;
        stat = await fs.stat(requestedPath);
      }
    }
    if (!stat) throw Object.assign(new Error('Not found'), { code: 'ENOENT' });

    const filePath = stat.isDirectory() ? path.join(requestedPath, 'index.html') : requestedPath;
    const file = await fs.readFile(filePath);
    response.writeHead(200, {
      'content-type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': filePath.endsWith('.html') ? 'no-store' : 'public, max-age=60',
    });
    response.end(request.method === 'HEAD' ? undefined : file);
  } catch (error) {
    if (error.code === 'ENOENT') {
      decorateResponse(response).status(404).json({ error: 'Not found' });
      return;
    }
    decorateResponse(response).status(500).json({ error: 'Unable to serve file' });
  }
}

function createCmsServer(options = {}) {
  const rootDir = options.rootDir || __dirname;

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const handlerPath = API_ROUTES[url.pathname];

    try {
      if (handlerPath) {
        const handler = require(handlerPath);
        request.query = Object.fromEntries(url.searchParams.entries());
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          request.body = await readJsonBody(request);
        }
        await handler(request, decorateResponse(response));
        return;
      }
      await serveStatic(request, response, rootDir, url.pathname);
    } catch (error) {
      decorateResponse(response).status(500).json({ error: error.message || 'Server error' });
    }
  });
}

async function start() {
  await loadDotEnv(path.join(__dirname, '.env'));
  const port = Number(process.env.PORT) || 8000;
  const host = process.env.HOST || '127.0.0.1';
  const server = createCmsServer();

  server.listen(port, host, () => {
    const origin = `http://${host}:${port}`;
    console.log(`Formax Builders site: ${origin}/`);
    console.log(`Formax Builders CMS:  ${origin}/cms.html`);
    if (!process.env.CMS_ADMIN_TOKEN) {
      console.log('CMS_ADMIN_TOKEN is not set — CMS saves are open on this server.');
    }
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createCmsServer, loadDotEnv };
