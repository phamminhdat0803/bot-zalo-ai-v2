const fs = require("fs");
const { logger } = require("../../config/logger");

let api = null;
let ownId = null;

function setLoginResult(loginResult) {
  api = loginResult?.api || loginResult;
  ownId = loginResult?.uid || api?.ownId || api?.getOwnId?.() || null;
  return api;
}

async function initZalo() {
  if (api) return api;

  const mode = process.env.ZALO_LOGIN_MODE || "qr";
  logger.info("[ZaloClient] login mode:", mode);

  if (mode === "qr") {
    const { Zalo } = await import("zca-js");
    const zalo = new Zalo({ selfListen: false, checkUpdate: true });
    try {
      const res = await zalo.loginQR((qrData) => {
        logger.info("[ZaloClient] QR code generated. Scan with Zalo app.");
      });
      setLoginResult(res);
      logger.info("[ZaloClient] QR login success");
      return api;
    } catch (e) {
      logger.error("[ZaloClient] QR login failed", e.message);
      return null;
    }
  }

  if (mode === "cookie") {
    const cookiePath = process.env.ZALO_COOKIE_PATH || "./data/zalo/cookies.json";
    const imei = process.env.ZALO_IMEI || "";
    const userAgent = process.env.ZALO_USER_AGENT || "";

    if (!fs.existsSync(cookiePath)) {
      logger.error("[ZaloClient] cookie file not found:", cookiePath);
      throw new Error("Cookie file not found");
    }
    let cookies;
    try {
      cookies = JSON.parse(fs.readFileSync(cookiePath, "utf8"));
    } catch (e) {
      logger.error("[ZaloClient] cookie JSON parse failed");
      throw new Error("Invalid cookie JSON");
    }
    if (!Array.isArray(cookies)) {
      logger.error("[ZaloClient] cookies must be array");
      throw new Error("Cookies not array");
    }
    if (!imei) {
      logger.error("[ZaloClient] ZALO_IMEI missing");
      throw new Error("ZALO_IMEI required");
    }
    if (!userAgent) {
      logger.error("[ZaloClient] ZALO_USER_AGENT missing");
      throw new Error("ZALO_USER_AGENT required");
    }

    try {
      const { Zalo } = await import("zca-js");
      const zalo = new Zalo({ selfListen: false, checkUpdate: true });
      const res = await zalo.login({ cookie: cookies, imei, userAgent });
      setLoginResult(res);
      logger.info("[ZaloClient] cookie login success");
      return api;
    } catch (e) {
      logger.error("[ZaloClient] cookie login failed", e.message);
      return null;
    }
  }

  logger.error("[ZaloClient] unknown ZALO_LOGIN_MODE");
  return null;
}

function setZaloApi(zaloApi, botOwnId = null) {
  api = zaloApi;
  if (botOwnId) ownId = botOwnId;
  return api;
}

function getZaloApi() {
  if (!api) throw new Error("Zalo API not initialized");
  return api;
}

function getBotOwnId() {
  return ownId;
}

function isZaloReady() {
  return !!api;
}

module.exports = { initZalo, setZaloApi, getZaloApi, getBotOwnId, isZaloReady };