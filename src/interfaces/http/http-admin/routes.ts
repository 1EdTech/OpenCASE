import { Express } from 'express';
import { FrameworksController } from './controllers/FrameworksController';

export interface AdminDeps {
  frameworksController: FrameworksController;
}

export function registerAdminRoutes(app: Express, deps: AdminDeps) {
  app.post(
    '/admin/tenants/:tenantId/frameworks',
    deps.frameworksController.create
  );
}

