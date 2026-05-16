import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { globalRateLimitMiddleware } from './middlewares/rate-limit.middleware';
import { adminRoutes } from './routes/admin.routes';
import { storageRoutes } from './routes/storage.routes';
import { errorHandlerMiddleware } from './middlewares/error-handler.middleware';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(globalRateLimitMiddleware);

  app.use('/public', express.static(path.resolve(__dirname, '..', 'public'), {
    index: false,
    extensions: false
  }));

  app.get('/health', (_req, res) => {
    res.json({ success: true, status: 'ok' });
  });

  app.get('/docs', (_req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'views', 'docs.html'));
  });

  app.use('/admin', adminRoutes);
  app.use('/api/files', storageRoutes);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: 'Rota não encontrada.'
    });
  });

  app.use(errorHandlerMiddleware);

  return app;
}