const { getZaloApi, getBotOwnId } = require("./zalo.client");
const { handleZaloMessage } = require("./message.handler");
const { logger } = require("../../config/logger");

let listener = null;

async function startZaloListener(options = {}) {
  const api = options.api || getZaloApi();
  if (!api) throw new Error("Zalo API not ready");

  const botOwnId = options.botOwnId || getBotOwnId();

  logger.info("[Listener] starting...");

  try {
    listener = api.listener;
    listener.start();

    listener.on("message", async (msg) => {
      try {
        await handleZaloMessage(msg, botOwnId);
      } catch (e) {
        logger.error("[Listener] handler error (prevented crash)", e.message);
      }
    });

    logger.info("[Listener] started");
    return listener;
  } catch (e) {
    logger.error("[Listener] start failed", e.message);
    throw e;
  }
}

function stopZaloListener() {
  // TODO: implement stop when SDK supports
  logger.warn("[Listener] stop not implemented yet");
}

module.exports = { startZaloListener, stopZaloListener };