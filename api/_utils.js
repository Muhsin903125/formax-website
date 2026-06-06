const { createCloudinarySignature, resolveCloudinaryConfig } = require('../lib/content-store');
const store = require('../lib/store');

function sendJson(response, status, payload) {
  response.status(status).setHeader('cache-control', 'no-store');
  response.json(payload);
}

function isAuthorized(request) {
  if (!process.env.CMS_ADMIN_TOKEN) return true;
  return request.headers.authorization === `Bearer ${process.env.CMS_ADMIN_TOKEN}`;
}

function isPasswordValid(password) {
  if (!process.env.CMS_ADMIN_TOKEN) return true;
  return password === process.env.CMS_ADMIN_TOKEN;
}

function cloudinaryConfig() {
  return resolveCloudinaryConfig();
}

module.exports = {
  sendJson,
  isAuthorized,
  isPasswordValid,
  cloudinaryConfig,
  createCloudinarySignature,
  // storage (Vercel Blob / local file / memory)
  storageKind: store.storageKind,
  readContent: store.getContent,
  writeContent: store.saveContent,
  insertSubmission: store.insertSubmission,
  listSubmissions: store.listSubmissions,
  markSubmissionRead: store.markSubmissionRead,
  deleteSubmission: store.deleteSubmission,
};
