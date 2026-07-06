const { logger } = require("../../config/logger");
const {
  filterOutCurrentMessage,
  normalizeText,
  toReactionTarget,
} = require("./message-identity");
const { enrichReactParamsFromUserMessage } = require("./reaction-infer");

function wrapToTargets(msg, fallbackThread) {
  const { target, reason } = toReactionTarget(msg, fallbackThread);
  if (target) return { targets: [target], identityReason: null };
  return { targets: [], identityReason: reason };
}

function findFirstReactableInHistory(history, fallbackThread) {
  for (const m of history) {
    const { targets, identityReason } = wrapToTargets(m, fallbackThread);
    if (targets.length) return { targets, identityReason: null };
  }
  return { targets: [], identityReason: "no_previous_message_with_zalo_identity" };
}

function extractQuotedMessageId(message) {
  const q = message?.quote;
  if (!q || typeof q !== "object") return null;
  const candidates = [
    q.msgId,
    q.messageId,
    q.cliMsgId,
    q.globalMsgId,
    q.ownerId && q.cliMsgId ? q.cliMsgId : null,
  ].filter(Boolean);
  return candidates.length ? String(candidates[0]) : null;
}

function findByMessageId(history, id, fallbackThread) {
  if (!id) return { targets: [], identityReason: "missing_message_id", hit: null };
  const needle = String(id);
  const hit = history.find((m) => {
    const keys = [m.messageId, m.cliMsgId, m.msgId, m.zaloMessageId, m.zaloCliMsgId]
      .filter(Boolean)
      .map(String);
    return keys.includes(needle);
  });
  if (!hit) return { targets: [], identityReason: "target_not_found", hit: null };
  const { targets, identityReason } = wrapToTargets(hit, fallbackThread);
  return { targets, identityReason, hit };
}

function findByMatchText(history, params, fallbackThread) {
  const exact = params.matchText != null ? String(params.matchText) : "";
  const contains =
    params.matchTextContains != null
      ? String(params.matchTextContains)
      : params.target === "matched_text" && exact
        ? exact
        : "";

  const queryNorm = normalizeText(exact || contains);
  if (!queryNorm) return { targets: [], identityReason: "target_not_found" };

  let exactHit = null;
  let containsHit = null;
  let reverseContainsHit = null;

  for (const m of history) {
    const textNorm = normalizeText(m.text || "");
    if (!textNorm) continue;
    if (textNorm === queryNorm) {
      exactHit = m;
      break;
    }
    if (!containsHit && textNorm.includes(queryNorm)) {
      containsHit = m;
    }
    if (!reverseContainsHit && queryNorm.includes(textNorm) && textNorm.length >= 3) {
      reverseContainsHit = m;
    }
  }

  const chosen = exactHit || containsHit || reverseContainsHit;
  if (!chosen) return { targets: [], identityReason: "target_not_found" };
  return wrapToTargets(chosen, fallbackThread);
}

function wantsTextMatch(params) {
  return (
    params.matchText != null ||
    params.matchTextContains != null ||
    params.target === "matched_text"
  );
}

/**
 * @returns {{ targets: object[], reason: string|null, notifyUser: boolean, resolvePath: string }}
 */
function resolveReactionTargets(params, ctx) {
  const p = enrichReactParamsFromUserMessage(params || {}, ctx.message);
  const current = ctx.message;
  const fallbackThread = current
    ? { threadId: current.threadId, threadType: current.threadType }
    : null;

  const rawHistory = Array.isArray(ctx.previousMessages) ? ctx.previousMessages : [];
  const history = filterOutCurrentMessage(rawHistory, current);

  const quotedId = extractQuotedMessageId(current);
  if (quotedId) {
    const found = findByMessageId(history, quotedId, fallbackThread);
    if (found.targets.length) {
      return { targets: found.targets, reason: null, notifyUser: false, resolvePath: "quoted" };
    }
    if (found.hit) {
      return {
        targets: [],
        reason: found.identityReason || "target_found_but_missing_zalo_identity",
        notifyUser: true,
        resolvePath: "quoted",
      };
    }
  }

  if (p.targetMessageId) {
    const found = findByMessageId(history, p.targetMessageId, fallbackThread);
    if (found.targets.length) {
      return { targets: found.targets, reason: null, notifyUser: false, resolvePath: "targetMessageId" };
    }
    return {
      targets: [],
      reason: found.hit
        ? found.identityReason || "target_found_but_missing_zalo_identity"
        : "target_message_id_not_found",
      notifyUser: true,
      resolvePath: "targetMessageId",
    };
  }

  if (wantsTextMatch(p)) {
    const found = findByMatchText(history, p, fallbackThread);
    if (found.targets.length) {
      return { targets: found.targets, reason: null, notifyUser: false, resolvePath: "matchText" };
    }
    return {
      targets: [],
      reason:
        found.identityReason === "target_not_found"
          ? "match_text_not_found"
          : found.identityReason || "target_found_but_missing_zalo_identity",
      notifyUser: true,
      resolvePath: "matchText",
    };
  }

  const target = p.target;
  if (target === "previous") {
    const found = findFirstReactableInHistory(history, fallbackThread);
    return {
      targets: found.targets,
      reason: found.targets.length ? null : found.identityReason,
      notifyUser: false,
      resolvePath: "previous",
    };
  }

  if (["all_previous", "all", "previous_messages"].includes(target)) {
    const targets = [];
    for (const m of history) {
      const { targets: one } = wrapToTargets(m, fallbackThread);
      if (one.length) targets.push(one[0]);
    }
    return {
      targets,
      reason: targets.length ? null : "no_previous_messages",
      notifyUser: false,
      resolvePath: "all_previous",
    };
  }

  if (target === "current") {
    const { targets, identityReason } = wrapToTargets(current, fallbackThread);
    return {
      targets,
      reason: targets.length ? null : identityReason || "no_current_message",
      notifyUser: false,
      resolvePath: "current",
    };
  }

  const { targets, identityReason } = wrapToTargets(current, fallbackThread);
  return {
    targets,
    reason: targets.length ? null : identityReason || "no_target",
    notifyUser: false,
    resolvePath: "default_current",
  };
}

function logReactionResolve(params, result) {
  const preview = (result.targets || []).map((t) => ({
    messageId: t.messageId,
    cliMsgId: t.cliMsgId,
    text: t.text ? String(t.text).slice(0, 80) : null,
  }));
  logger.debug("[Executor] react_message resolve", {
    target: params?.target,
    targetMessageId: params?.targetMessageId,
    matchText: params?.matchText,
    matchTextContains: params?.matchTextContains,
    resolvePath: result.resolvePath,
    targetCount: result.targets.length,
    preview,
    reason: result.reason,
  });
  if (result.reason && result.notifyUser) {
    logger.warn("[ActionExecutor] react_message skipped", {
      reason: result.reason,
      reaction: params?.reaction,
      target: params?.target,
      matchText: params?.matchText,
      targetMessageId: params?.targetMessageId,
      textPreview: preview[0]?.text,
    });
  }
}

module.exports = {
  resolveReactionTargets,
  logReactionResolve,
  extractQuotedMessageId,
};