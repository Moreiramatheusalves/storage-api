import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const globalRateLimitMiddleware = rateLimit({
  windowMs: env.globalRateLimitWindowMs,
  max: env.globalRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas requisições a partir deste IP. Tente novamente depois.'
  }
});

export const loginRateLimitMiddleware = rateLimit({
  windowMs: env.loginRateLimitWindowMs,
  max: env.loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Aguarde antes de tentar novamente.'
  }
});
