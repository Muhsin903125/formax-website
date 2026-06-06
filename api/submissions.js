const {
  deleteSubmission,
  isAuthorized,
  listSubmissions,
  markSubmissionRead,
  sendJson,
} = require('./_utils');

module.exports = async function handler(request, response) {
  try {
    if (!isAuthorized(request)) {
      sendJson(response, 401, { error: 'Invalid CMS token' });
      return;
    }

    if (request.method === 'GET') {
      sendJson(response, 200, { submissions: await listSubmissions() });
      return;
    }

    if (request.method === 'PATCH') {
      const id = Number(request.body?.id);
      if (!id) {
        sendJson(response, 400, { error: 'A submission id is required' });
        return;
      }
      await markSubmissionRead(id, request.body?.isRead !== false);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === 'DELETE') {
      const id = Number(request.body?.id || (request.query && request.query.id));
      if (!id) {
        sendJson(response, 400, { error: 'A submission id is required' });
        return;
      }
      await deleteSubmission(id);
      sendJson(response, 200, { ok: true });
      return;
    }

    response.setHeader('allow', 'GET, PATCH, DELETE');
    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Server error' });
  }
};
