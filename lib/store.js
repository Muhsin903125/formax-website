const fsp = require('node:fs/promises');
const path = require('node:path');

const { normalizeContent, validateContent, defaultContent } = require('./content-store');

/**
 * Content store — mirrors the Bias Retail model: the whole CMS payload is a JSON
 * document persisted to Vercel Blob in production, with a local JSON file for
 * development and an in-memory fallback for serverless instances without Blob.
 * Contact-form submissions are a separate JSON list stored the same way.
 */
const ROOT = path.resolve(__dirname, '..');
const SEED_FILE = path.join(ROOT, 'data', 'site-content.json');
const DATA_DIR = process.env.CMS_DATA_DIR || path.join(ROOT, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'site-content.json');
const SUBS_FILE = path.join(DATA_DIR, 'submissions.json');

const CONTENT_BLOB = process.env.CMS_CONTENT_BLOB_PATH || 'cms/site-content.json';
const SUBS_PREFIX = process.env.CMS_SUBMISSIONS_BLOB_PREFIX || 'cms/leads';

let memoryContent = null;
let memorySubs = null;

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const storageKind = () => (hasBlob() ? 'vercel-blob' : 'file');

/* ---------------- Vercel Blob helpers ---------------- */
async function blobReadJson(pathnameOrPrefix, { exact = true } = {}) {
  const { list } = require('@vercel/blob');
  const { blobs } = await list({ prefix: pathnameOrPrefix });
  if (!blobs.length) return null;
  const hit = exact
    ? blobs.find((b) => b.pathname === pathnameOrPrefix)
    : blobs.slice().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  if (!hit) return null;
  const res = await fetch(hit.url, { cache: 'no-store' });
  return res.ok ? res.json() : null;
}

async function blobWriteContent(content) {
  const { put } = require('@vercel/blob');
  await put(CONTENT_BLOB, JSON.stringify(content, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60,
  });
}

// Leads use a random suffix (unguessable URL) and old copies are pruned.
async function blobWriteSubs(list) {
  const { put, del } = require('@vercel/blob');
  const { list: listBlobs } = require('@vercel/blob');
  const existing = (await listBlobs({ prefix: SUBS_PREFIX })).blobs;
  await put(`${SUBS_PREFIX}-${Date.now()}.json`, JSON.stringify(list), {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/json; charset=utf-8',
  });
  await Promise.all(existing.map((b) => del(b.url).catch(() => {})));
}

/* ---------------- File helpers ---------------- */
async function fileReadJson(file, fallbackFile) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch (error) {
    if (fallbackFile) {
      try { return JSON.parse(await fsp.readFile(fallbackFile, 'utf8')); } catch (_) { /* noop */ }
    }
    return null;
  }
}

async function fileWriteJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

/* ---------------- Content ---------------- */
async function getContent() {
  if (hasBlob()) {
    const blobContent = await blobReadJson(CONTENT_BLOB);
    if (blobContent) return normalizeContent(blobContent);
  }
  if (memoryContent) return normalizeContent(memoryContent);
  const fileContent = await fileReadJson(CONTENT_FILE, SEED_FILE);
  return normalizeContent(fileContent || defaultContent);
}

async function saveContent(content) {
  validateContent(content);
  const normalized = normalizeContent({ ...content, updatedAt: new Date().toISOString() });
  if (hasBlob()) {
    await blobWriteContent(normalized);
    return normalized;
  }
  try {
    await fileWriteJson(CONTENT_FILE, normalized);
  } catch (_) {
    memoryContent = normalized; // read-only filesystem (serverless without Blob)
  }
  return normalized;
}

/* ---------------- Submissions ---------------- */
async function readSubs() {
  if (hasBlob()) {
    const arr = await blobReadJson(SUBS_PREFIX, { exact: false });
    return Array.isArray(arr) ? arr : [];
  }
  if (memorySubs) return memorySubs;
  const arr = await fileReadJson(SUBS_FILE);
  return Array.isArray(arr) ? arr : [];
}

async function saveSubs(list) {
  if (hasBlob()) { await blobWriteSubs(list); return; }
  try { await fileWriteJson(SUBS_FILE, list); } catch (_) { memorySubs = list; }
}

async function insertSubmission(fields) {
  const list = await readSubs();
  const id = list.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1;
  const createdAt = new Date().toISOString();
  const row = {
    id,
    name: String(fields.name || '').slice(0, 200),
    email: String(fields.email || '').slice(0, 200),
    phone: String(fields.phone || '').slice(0, 80),
    subject: String(fields.subject || '').slice(0, 200),
    message: String(fields.message || '').slice(0, 5000),
    createdAt,
    isRead: false,
  };
  await saveSubs([row, ...list]);
  return { id, createdAt };
}

async function listSubmissions() {
  return (await readSubs()).slice().sort((a, b) => Number(b.id) - Number(a.id));
}

async function markSubmissionRead(id, isRead = true) {
  const list = await readSubs();
  await saveSubs(list.map((s) => (Number(s.id) === Number(id) ? { ...s, isRead } : s)));
}

async function deleteSubmission(id) {
  const list = await readSubs();
  await saveSubs(list.filter((s) => Number(s.id) !== Number(id)));
}

module.exports = {
  storageKind,
  getContent,
  saveContent,
  insertSubmission,
  listSubmissions,
  markSubmissionRead,
  deleteSubmission,
};
