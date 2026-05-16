import { Router } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { env } from '../config/env';
import { applicationTokenAuthMiddleware } from '../middlewares/app-token-auth.middleware';
import { asyncHandler } from '../utils/async-handler';
import { StorageController } from '../controllers/storage.controller';

const router = Router();
const storageController = new StorageController();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, env.tmpDir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `upload-${Date.now()}-${randomUUID()}.tmp`);
    }
  }),
  limits: {
    fileSize: env.maxUploadSize
  }
});

router.post(
  '/upload',
  applicationTokenAuthMiddleware,
  upload.single('file'),
  asyncHandler(storageController.upload.bind(storageController))
);

router.get(
  '/',
  applicationTokenAuthMiddleware,
  asyncHandler(storageController.list.bind(storageController))
);

router.get(
  '/read',
  applicationTokenAuthMiddleware,
  asyncHandler(storageController.read.bind(storageController))
);

router.delete(
  '/',
  applicationTokenAuthMiddleware,
  asyncHandler(storageController.remove.bind(storageController))
);

export { router as storageRoutes };
