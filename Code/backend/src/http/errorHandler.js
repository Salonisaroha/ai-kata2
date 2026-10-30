const { AppError } = require('../errors');
const { BODY_LIMIT } = require('./bodyLimit');

function body(code, message, extra = {}) {
  const error = { code, message };
  if (extra.tradeIndex !== undefined) error.trade_index = extra.tradeIndex;
  if (extra.field !== undefined) error.field = extra.field;
  return { error };
}

function notFoundHandler(req, res) {
  res.status(404).json(body('NOT_FOUND', 'Route not found.'));
}

function errorHandler(logger) {
  // Express identifies error middleware by its 4-argument signature.
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (err instanceof AppError) {
      return res.status(err.status).json(body(err.code, err.message, err));
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json(body('INVALID_JSON', 'Request body is not valid JSON.'));
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json(body('PAYLOAD_TOO_LARGE', `Request body exceeds ${BODY_LIMIT}.`));
    }
    // Other body-parser failures (unsupported encoding/charset, aborted body, ...) are client errors.
    if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500 && err.expose) {
      const code = err.status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'BAD_REQUEST';
      const message = err.status === 415 ? 'Unsupported content encoding or charset.' : 'Bad request.';
      return res.status(err.status).json(body(code, message));
    }
    logger.error('unhandled_error', { name: err.name, message: err.message, stack: err.stack });
    return res.status(500).json(body('INTERNAL_ERROR', 'Internal server error.'));
  };
}

module.exports = { errorHandler, notFoundHandler };
