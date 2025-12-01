import { Express } from 'express';
import { CFPackagesControllerV1p1 } from './controllers/CFPackagesController';

export interface PublicV1p1Deps {
  cfPackagesController: CFPackagesControllerV1p1;
}

export function registerV1p1Routes(app: Express, deps: PublicV1p1Deps) {
  app.get(
    '/ims/case/v1p1/CFPackages/:id',
    deps.cfPackagesController.getById
  );

  // TODO: add CFDocuments, CFItems, CFAssociations, CFRubrics, discovery, etc.
}

