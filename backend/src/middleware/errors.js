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
    // Some 5xx errors are operational (a misconfigured integration, an
    // upstream service failing) rather than bugs — those are marked with
    // expose:true by whoever threw them so admins can actually see and act
    // on the real reason, instead of always getting the generic fallback.
    const expose = err.expose !== undefined ? err.expose : status < 500;
    message = expose ? err.message : 'Something went wrong on our side. Please try again.';
  }
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: message });
}

function httpError(status, message, opts = {}) {
  const err = new Error(message);
  err.status = status;
  if (opts.expose !== undefined) err.expose = opts.expose;
  return err;
}

module.exports = { notFound, errorHandler, httpError, env };
