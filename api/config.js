const { cloudinaryConfig, sendJson, storageKind } = require('./_utils');

module.exports = function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('allow', 'GET');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const cloudinary = cloudinaryConfig();
  sendJson(response, 200, {
    authRequired: Boolean(process.env.CMS_ADMIN_TOKEN),
    storage: storageKind(),
    cloudinary: {
      enabled: Boolean(cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret),
      cloudName: cloudinary.cloudName,
      apiKey: cloudinary.apiKey,
      folder: cloudinary.folder,
      uploadUrl: cloudinary.cloudName
        ? `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`
        : '',
    },
  });
};
