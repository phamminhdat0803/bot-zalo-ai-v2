require("dotenv").config();
const { logger } = require("./config/logger");
const { env } = require("./config/env");
const { initZalo, getZaloApi, getBotOwnId, isZaloReady } = require("./modules/zalo/zalo.client");
const { startZaloListener } = require("./modules/zalo/zalo.listener");
const { configureFromEnv } = require("./modules/conversation/conversation.service");

let shuttingDown = false;

function setupSignalHandlers() {
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[Bootstrap] received ${signal}, shutting down...`);
    // TODO: stop listener if implemented
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    logger.error("[Bootstrap] unhandledRejection", reason?.message || reason);
  });
  process.on("uncaughtException", (err) => {
    logger.error("[Bootstrap] uncaughtException", err?.message || err);
    process.exit(1);
  });
}

async function bootstrap() {
  setupSignalHandlers();
  configureFromEnv();
  logger.info('[BOOT_ID]', {
    pid: process.pid,
    cwd: process.cwd(),
    main: require.main?.filename,
    file: __filename,
    startedAt: new Date().toISOString()
  });
  logger.info("[Bootstrap] starting Zalo AI Bot V2 (Phase 2A)");
  logger.info("[Bootstrap] ZALO_LOGIN_MODE=", process.env.ZALO_LOGIN_MODE || "qr");

  try {
    const api = await initZalo();
    if (!api) {
      logger.error("[Bootstrap] initZalo failed - api is null");
      process.exit(1);
    }
    logger.info("[Bootstrap] Zalo client ready, ownId=", getBotOwnId());

    if ((process.env.ZALO_AUTO_START_LISTENER ?? "true") !== "false") {
      await startZaloListener();
      logger.info("[Bootstrap] listener started");
    } else {
      logger.info("[Bootstrap] listener not started (ZALO_AUTO_START_LISTENER=false)");
    }

    logger.info("[Bootstrap] app ready");
  } catch (e) {
    logger.error("[Bootstrap] fatal error", e.message);
    process.exit(1);
  }
}

bootstrap().catch((e) => {
  logger.error("[Bootstrap] bootstrap catch", e.message);
  process.exit(1);
});
