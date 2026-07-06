const REACT_VERB = /(?:thả\s*tim|thả\s*cảm\s*xúc|react|reaction|like|tim\s*cho)/i;

function inferReactionMatchTextFromUserText(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const quoted = trimmed.match(/["“]([^"”]+)["”]/);
  if (quoted && quoted[1]) return quoted[1].trim();

  if (!REACT_VERB.test(trimmed)) return null;
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx >= 0) {
    const after = trimmed.slice(colonIdx + 1).trim();
    if (after.length >= 2) return after.replace(/^["“]|["”]$/g, "").trim();
  }
  return null;
}

function enrichReactParamsFromUserMessage(params, userMessage) {
  const p = { ...(params || {}) };
  if (p.matchText != null && String(p.matchText).trim()) return p;
  if (p.matchTextContains != null && String(p.matchTextContains).trim()) return p;
  if (p.targetMessageId) return p;

  const inferred = inferReactionMatchTextFromUserText(userMessage?.text);
  if (!inferred) return p;

  p.matchText = inferred;
  p.target = "matched_text";
  return p;
}

module.exports = {
  inferReactionMatchTextFromUserText,
  enrichReactParamsFromUserMessage,
};