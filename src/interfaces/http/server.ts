import express from 'express';
import { makeAuthMiddleware } from './middleware/auth';
import { registerV1p1Routes } from './http-public/v1p1/routes';
import { registerAdminRoutes } from './http-admin/routes';
import { Container } from '../../wiring/container';

export function createServer(container: Container) {
  const app = express();

  app.use(express.json());

  const authMiddleware = makeAuthMiddleware(container.jwtVerifier);

  app.use('/ims/case', authMiddleware);
  app.use('/admin', authMiddleware);

  registerV1p1Routes(app, {
    cfPackagesController: container.controllers.v1p1.cfPackages
  });

  registerAdminRoutes(app, {
    frameworksController: container.controllers.admin.frameworks
  });

  // simple health endpoint
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}

