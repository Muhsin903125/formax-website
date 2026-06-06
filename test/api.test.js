const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

process.env.CMS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'formax-api-'));
process.env.CMS_ADMIN_TOKEN = 'test-token';
delete process.env.BLOB_READ_WRITE_TOKEN;

const test = require('node:test');
const assert = require('node:assert');
const { createCmsServer } = require('../cms-server');

let server;
let base;

test.before(async () => {
  server = createCmsServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { if (server) server.close(); });

const json = (extra = {}) => ({ headers: { 'content-type': 'application/json', ...extra.headers }, ...extra });

test('GET /api/content returns seeded content', async () => {
  const res = await fetch(`${base}/api/content`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.storage, 'file');
  assert.equal(body.content.site.name, 'Formax Builders');
});

test('POST /api/session rejects wrong password and accepts the right one', async () => {
  let res = await fetch(`${base}/api/session`, json({ method: 'POST', body: JSON.stringify({ password: 'nope' }) }));
  assert.equal(res.status, 401);
  res = await fetch(`${base}/api/session`, json({ method: 'POST', body: JSON.stringify({ password: 'test-token' }) }));
  assert.equal(res.status, 200);
});

test('PUT /api/content requires auth and saves with a bearer token', async () => {
  let res = await fetch(`${base}/api/content`, json({ method: 'PUT', body: JSON.stringify({}) }));
  assert.equal(res.status, 401);

  const current = (await (await fetch(`${base}/api/content`)).json()).content;
  current.site.tagline = 'Tested Tagline';
  res = await fetch(`${base}/api/content`, json({ method: 'PUT', headers: { authorization: 'Bearer test-token' }, body: JSON.stringify(current) }));
  assert.equal(res.status, 200);

  const after = (await (await fetch(`${base}/api/content`)).json()).content;
  assert.equal(after.site.tagline, 'Tested Tagline');
});

test('POST /api/contact stores a lead; submissions are auth-gated', async () => {
  let res = await fetch(`${base}/api/contact`, json({ method: 'POST', body: JSON.stringify({ name: 'Lead', email: 'l@x.com', message: 'hello there' }) }));
  assert.equal(res.status, 201);

  res = await fetch(`${base}/api/submissions`);
  assert.equal(res.status, 401);

  res = await fetch(`${base}/api/submissions`, { headers: { authorization: 'Bearer test-token' } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.submissions.some((s) => s.email === 'l@x.com'));
});

test('POST /api/contact validates required fields', async () => {
  const res = await fetch(`${base}/api/contact`, json({ method: 'POST', body: JSON.stringify({ name: '', email: 'bad', message: '' }) }));
  assert.equal(res.status, 400);
});
