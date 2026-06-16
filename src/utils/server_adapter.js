import http from 'http';

/**
 * A lightweight adapter to run a Web-standard fetch handler (Request => Response)
 * on top of a native Node.js HTTP server.
 */
export function serve({ fetch, port, hostname = '0.0.0.0' }, callback) {
  const server = http.createServer(async (req, res) => {
    try {
      // 1. Determine protocol and URL
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host || `${hostname}:${port}`;
      const url = new URL(req.url, `${protocol}://${host}`);

      // 2. Map headers
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const val of value) {
            headers.append(key, val);
          }
        } else {
          headers.set(key, value);
        }
      }

      // 3. Read body if applicable
      let body = null;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }

      // 4. Create Web standard Request
      const webReq = new Request(url.toString(), {
        method: req.method,
        headers,
        body
      });

      // 5. Invoke fetch handler
      const webRes = await fetch(webReq);

      // 6. Write response headers
      const resHeaders = {};
      webRes.headers.forEach((value, key) => {
        if (key === 'set-cookie') {
          if (!resHeaders[key]) resHeaders[key] = [];
          resHeaders[key].push(value);
        } else {
          resHeaders[key] = value;
        }
      });
      res.writeHead(webRes.status, resHeaders);

      // 7. Write response body
      if (webRes.body) {
        const reader = webRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (err) {
      console.error('Error in native server adapter:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end('Internal Server Error');
    }
  });

  server.listen(port, hostname, () => {
    if (callback) {
      callback({ port, hostname });
    }
  });

  return server;
}
