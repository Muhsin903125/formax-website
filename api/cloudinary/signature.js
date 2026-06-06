const { cloudinaryConfig, createCloudinarySignature, isAuthorized, sendJson } = require('../_utils');

module.exports = function handler(request, response) {
  try {
    if (request.method !== 'POST') {
      response.setHeader('allow', 'POST');
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    if (!isAuthorized(request)) {
      sendJson(response, 401, { error: 'Invalid CMS token' });
      return;
    }

    const cloudinary = cloudinaryConfig();
    if (!cloudinary.cloudName || !cloudinary.apiKey || !cloudinary.apiSecret) {
      sendJson(response, 503, { error: 'Cloudinary environment variables are not configured' });
      return;
    }

    const timestamp = Number(request.body?.timestamp) || Math.floor(Date.now() / 1000);
    const folder =
      typeof request.body?.folder === 'string' && request.body.folder ? request.body.folder : cloudinary.folder;
    const params = { folder, timestamp };

    sendJson(response, 200, {
      ...params,
      apiKey: cloudinary.apiKey,
      cloudName: cloudinary.cloudName,
      signature: createCloudinarySignature(params, cloudinary.apiSecret),
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Server error' });
  }
};
