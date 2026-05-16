import { Router, Request, Response } from 'express';
import path from 'path';
import { AdminAuthController } from '../controllers/admin-auth.controller';
import { ApplicationTokenController } from '../controllers/application-token.controller';
import { HistoryController } from '../controllers/history.controller';
import { adminAuthMiddleware } from '../middlewares/admin-auth.middleware';
import { AdminStorageController } from '../controllers/admin-storage.controller';
import { loginRateLimitMiddleware } from '../middlewares/rate-limit.middleware';
import { AdminDiagnosticsController } from '../controllers/admin-diagnostics.controller';

const router = Router();
const adminAuthController = new AdminAuthController();
const applicationTokenController = new ApplicationTokenController();
const historyController = new HistoryController();
const adminStorageController = new AdminStorageController();
const adminDiagnosticsController = new AdminDiagnosticsController();

function sendAdminPage(fileName: string) {
  return (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, '..', '..', 'views', 'admin', fileName));
  };
}

router.get('/', sendAdminPage('index.html'));
router.get('/dashboard', adminAuthMiddleware, sendAdminPage('dashboard.html'));
router.get('/applications-ui', adminAuthMiddleware, sendAdminPage('applications.html'));
router.get('/history-ui', adminAuthMiddleware, sendAdminPage('history.html'));
router.get('/storage', adminAuthMiddleware, sendAdminPage('storage.html'));
router.get('/diagnostics-ui', adminAuthMiddleware, sendAdminPage('diagnostics.html'));

router.post('/login', loginRateLimitMiddleware, (req, res) => {
  void adminAuthController.login(req, res);
});

router.post('/logout', adminAuthMiddleware, (req, res) => {
  adminAuthController.logout(req, res);
});

router.get('/applications', adminAuthMiddleware, (req, res) => {
  void applicationTokenController.list(req, res);
});

router.post('/applications', adminAuthMiddleware, (req, res) => {
  void applicationTokenController.create(req, res);
});

router.post('/applications/:id/rotate-token', adminAuthMiddleware, (req, res) => {
  void applicationTokenController.rotateToken(req, res);
});

router.patch('/applications/:id/active', adminAuthMiddleware, (req, res) => {
  void applicationTokenController.setActive(req, res);
});

router.get('/history', adminAuthMiddleware, (req, res) => {
  void historyController.list(req, res);
});

router.get('/diagnostics', adminAuthMiddleware, adminDiagnosticsController.show);

router.get('/storage/list', adminAuthMiddleware, adminStorageController.list);
router.get('/storage/read', adminAuthMiddleware, adminStorageController.read);
router.delete('/storage', adminAuthMiddleware, adminStorageController.delete);

export { router as adminRoutes };