const { loadConfig } = require('./config');
const { buildApp } = require('./compositionRoot');

try {
  const config = loadConfig();
  const { app, logger } = buildApp(config);
  app.listen(config.port, () => logger.info('server_started', { port: config.port }));
} catch (err) {
  console.error(`Startup failed: ${err.message}`);
  process.exit(1);
}
