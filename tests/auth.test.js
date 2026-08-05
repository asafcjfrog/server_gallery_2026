const express = require('express');
const { signAccessToken, signServiceToken, requireAccessToken, requireServiceToken } = require('../src/auth');

function buildTestApp() {
  const app = express();
  app.get('/api/me', requireAccessToken, (req, res) => res.send({ auth: req.auth }));
  app.post('/internal/sync', requireServiceToken, (req, res) => res.send({ auth: req.auth }));
  return app;
}

function withServer(app, run) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const base = `http://localhost:${server.address().port}`;
      try {
        await run(base);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

test('user access tokens (RS256) verify successfully', async () => {
  await withServer(buildTestApp(), async (base) => {
    const token = signAccessToken({ userId: 42 });
    const res = await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auth.userId).toBe(42);
  });
});

test('internal service tokens (HS256, shared-key) verify successfully', async () => {
  await withServer(buildTestApp(), async (base) => {
    const token = signServiceToken({ service: 'billing' });
    const res = await fetch(`${base}/internal/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auth.service).toBe('billing');
  });
});
