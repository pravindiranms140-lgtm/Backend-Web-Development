require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON payload',
      },
    });
  }

  if (error.statusCode && error.statusCode < 500) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code || 'BAD_REQUEST',
        message: error.message,
      },
    });
  }

  console.error(error.message);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
});

const port = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(port, () => console.log(`API listening on ${port}`));
}

module.exports = app;
