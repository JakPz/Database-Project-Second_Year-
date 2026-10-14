'use strict';

function notFound(req, res, next) {
  const err = new Error('Page not found');
  err.status = 404;
  next(err);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);

  res.status(status);
  if (req.accepts(['html', 'json']) === 'json') {
    return res.json({ error: err.message });
  }
  res.render('error', {
    title: status === 404 ? 'Page not found' : 'Something went wrong',
    status,
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Unexpected server error.' : err.message,
    activePage: ''
  });
}

module.exports = { notFound, errorHandler };
