class BotError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "BotError";
    this.code = code;
  }
}

module.exports = { BotError };