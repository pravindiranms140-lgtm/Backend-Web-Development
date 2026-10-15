/**
 * Standard HTTP response utilities ensuring uniform API response envelopes.
 *
 * Success envelope:
 *   - Single item / Mutation: { data: <item> }
 *   - Collection / List:       { data: [<items>], meta: { ... } }
 *
 * Error envelope:
 *   - All errors:              { error: { message: "<msg>", code: "<code>" } }
 *   - 500 internal errors are sanitized to never leak stack traces or internal DB details.
 */

function sendList(res, data, meta) {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data && 'meta' in data) {
    return res.status(200).json(data);
  }
  return res.status(200).json({ data, meta });
}

function sendCreated(res, data) {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data && Object.keys(data).length === 1) {
    return res.status(201).json(data);
  }
  return res.status(201).json({ data });
}

function sendOk(res, data) {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data && Object.keys(data).length === 1) {
    return res.status(200).json(data);
  }
  return res.status(200).json({ data });
}

function sendError(res, status, payload = {}) {
  let message;
  let code;

  if (typeof payload === 'string') {
    message = payload;
  } else if (payload && typeof payload === 'object') {
    message = payload.message || payload.error;
    code = payload.code;
  }

  // Sanitize 500 internal server errors to avoid leaking implementation/database details or stack traces
  if (status >= 500) {
    message = 'Internal server error';
    code = code || 'INTERNAL_SERVER_ERROR';
  } else if (!message) {
    message = status === 404 ? 'Resource not found' : 'Request failed';
  }

  if (!code) {
    code = status === 404 ? 'NOT_FOUND' : 'ERROR';
  }

  return res.status(status).json({
    error: {
      message,
      code
    }
  });
}

function sendNotFound(res, message = 'Resource not found') {
  return sendError(res, 404, { message, code: 'NOT_FOUND' });
}

function sendInternalError(res) {
  return sendError(res, 500, { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
}

module.exports = {
  sendList,
  sendCreated,
  sendOk,
  sendError,
  sendNotFound,
  sendInternalError
};
