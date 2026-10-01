const multer = require('multer');

// Centralized error handler - keeps controllers free of try/catch boilerplate
// when paired with the asyncHandler wrapper.
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `Duplicate value for ${field}.` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error.' });
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
