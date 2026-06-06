const { isPasswordValid, sendJson } = require('./_utils');

module.exports = async function handler(request, response) {
  try {
    if (request.method !== 'POST') {
      response.setHeader('allow', 'POST');
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    if (!isPasswordValid(password)) {
      sendJson(response, 401, { error: 'Invalid CMS password' });
      return;
    }

    sendJson(response, 200, {
      authenticated: true,
      authRequired: Boolean(process.env.CMS_ADMIN_TOKEN),
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Server error' });
  }
};
