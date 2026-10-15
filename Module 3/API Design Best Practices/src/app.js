const express = require('express');
const postRoutes = require('./routes/postRoutes');
const { resetData } = require('./data/postStore');
const controller = require('./controllers/postController');
const http = require('./utils/http');

function createApp() {
  const app = express();
  app.use(express.json());

  // Resource-oriented public API routes
  app.use('/posts', postRoutes);

  // Safe internal failure route for testing/demo
  app.get('/explode', controller.explode);

  // 404 handler for unmatched routes (ensures old verb routes return structured 404)
  app.use((req, res) => {
    http.sendNotFound(res, 'Resource not found');
  });

  // Global error handler ensuring safe, structured responses without stack leaks
  app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    http.sendError(res, status, {
      message: status === 500 ? 'Internal server error' : (err.message || 'Internal server error'),
      code: status === 500 ? 'INTERNAL_SERVER_ERROR' : (err.code || 'ERROR')
    });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Starter API listening on port ${port}`);
  });
}

module.exports = {
  createApp,
  resetData
};
