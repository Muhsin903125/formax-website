const { isAuthorized, readContent, sendJson, storageKind, writeContent } = require('./_utils');

module.exports = async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      sendJson(response, 200, { content: await readContent(), storage: storageKind() });
      return;
    }

    if (request.method === 'PUT') {
      if (!isAuthorized(request)) {
        sendJson(response, 401, { error: 'Invalid CMS token' });
        return;
      }
      const content = await writeContent(request.body || {});
      sendJson(response, 200, {
        content,
        storage: storageKind(),
        ...(storageKind() !== 'vercel-blob' ? { warning: 'Saved locally. Configure Vercel Blob (BLOB_READ_WRITE_TOKEN) for durable persistence on Vercel.' } : {}),
      });
      return;
    }

    response.setHeader('allow', 'GET, PUT');
    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Server error' });
  }
};
