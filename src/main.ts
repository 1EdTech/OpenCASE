import { buildContainer } from './wiring/container';
import { createServer } from './interfaces/http/server';

async function main() {
  const container = await buildContainer();
  const app = createServer(container);
  const port = container.config.httpPort;

  app.listen(port, () => {
    container.logger.info({ port }, 'CASE provider listening');
  });
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Fatal error on startup', err);
  process.exit(1);
});

