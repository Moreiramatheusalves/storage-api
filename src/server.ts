import { env } from './config/env';
import { createApp } from './app';
import { BootstrapService } from './services/bootstrap.service';

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT_EXCEPTION]', error);
});

async function bootstrap(): Promise<void> {
  const bootstrapService = new BootstrapService();

  await bootstrapService.initialize();
  bootstrapService.logRuntimePaths();

  const app = createApp();

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Storage API running on http://0.0.0.0:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});