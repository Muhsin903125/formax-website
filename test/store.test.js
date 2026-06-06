const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

// Use a throwaway data dir (no Blob token → local-file mode) before requiring the store.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'formax-store-'));
process.env.CMS_DATA_DIR = TMP;
delete process.env.BLOB_READ_WRITE_TOKEN;

const test = require('node:test');
const assert = require('node:assert');
const store = require('../lib/store');

test('storageKind is file when no Blob token is configured', () => {
  assert.equal(store.storageKind(), 'file');
});

test('getContent seeds from the committed JSON seed and normalizes', async () => {
  const c = await store.getContent();
  assert.equal(c.site.name, 'Formax Builders');
  assert.ok(c.services.length >= 1);
  assert.ok(c.projects.length >= 1);
});

test('saveContent persists to the data dir and reads back', async () => {
  const c = await store.getContent();
  c.site.name = 'Changed Co';
  await store.saveContent(c);
  assert.ok(fs.existsSync(path.join(TMP, 'site-content.json')));
  const again = await store.getContent();
  assert.equal(again.site.name, 'Changed Co');
});

test('contact submissions: insert / list / markRead / delete', async () => {
  const { id } = await store.insertSubmission({ name: 'A', email: 'a@b.com', message: 'hi' });
  let list = await store.listSubmissions();
  assert.equal(list.find((s) => s.id === id).isRead, false);

  await store.markSubmissionRead(id, true);
  list = await store.listSubmissions();
  assert.equal(list.find((s) => s.id === id).isRead, true);

  await store.deleteSubmission(id);
  list = await store.listSubmissions();
  assert.ok(!list.find((s) => s.id === id));
});
