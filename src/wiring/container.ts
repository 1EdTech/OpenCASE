import { loadConfig, AppConfig } from '../infrastructure/config/Config';
import { logger } from '../infrastructure/logging/Logger';
import { JwtVerifier } from '../infrastructure/auth/JwtVerifier';
import { FileFrameworkStore } from '../infrastructure/persistence/file/FileFrameworkStore';
import { FileCFPackageRepository } from '../infrastructure/persistence/file/FileCFPackageRepository';
import { CreateFramework } from '../application/case/commands/CreateFramework';
import { GetCFPackage } from '../application/case/queries/GetCFPackage';
import { FrameworksController } from '../interfaces/http/http-admin/controllers/FrameworksController';
import { CFPackagesControllerV1p1 } from '../interfaces/http/http-public/v1p1/controllers/CFPackagesController';

export interface Container {
  config: AppConfig;
  logger: typeof logger;
  jwtVerifier: JwtVerifier;
  store: FileFrameworkStore;
  controllers: {
    v1p1: {
      cfPackages: CFPackagesControllerV1p1;
    };
    admin: {
      frameworks: FrameworksController;
    };
  };
}

export async function buildContainer(): Promise<Container> {
  const config = loadConfig();

  const jwtVerifier = new JwtVerifier({
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    publicKey: config.jwtPublicKey
  });

  const store = new FileFrameworkStore({ baseDataDir: config.caseDataDir });
  await store.loadAll();

  const pkgRepo = new FileCFPackageRepository(store);

  const createFramework = new CreateFramework(pkgRepo);
  const getCFPackage = new GetCFPackage(pkgRepo);

  const frameworksController = new FrameworksController(createFramework);
  const cfPackagesControllerV1p1 = new CFPackagesControllerV1p1(getCFPackage);

  return {
    config,
    logger,
    jwtVerifier,
    store,
    controllers: {
      v1p1: {
        cfPackages: cfPackagesControllerV1p1
      },
      admin: {
        frameworks: frameworksController
      }
    }
  };
}

