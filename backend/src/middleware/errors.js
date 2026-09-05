// Central error handling. Never leak stack traces or internals to clients.
const env = require('../config/env');

function notFound(req, res) {
  res.status(404).json({ error: 'Resource not found.' });
}

const MULTER_ERRORS = {
  LIMIT_FILE_SIZE: 'File is too large (max 2 MB).',
  LIMIT_FILE_COUNT: 'Too many files.',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message;
  if (err.code && MULTER_ERRORS[err.code]) {
    status = 400;
    message = MULTER_ERRORS[err.code];
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body.';
  } else {
    message = status < 500 ? err.message : 'Something went wrong on our side. Please try again.';
  }
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: message });
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { notFound, errorHandler, httpError, env };
