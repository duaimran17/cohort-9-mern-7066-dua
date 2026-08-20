const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');
const logger = require('./utils/logger');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url ? req.url.split('?')[0] : req.url,
      }),
    },
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  })
);

app.get('/', (req, res) => {
  logger.info('Root endpoint hit!');
  res.json({ message: 'Backend server is running successfully!' });
});

app.use('/api/auth', authRoutes);

app.use(errorHandler);

module.exports = app;