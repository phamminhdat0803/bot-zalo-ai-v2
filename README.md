# Zalo AI Bot V2

Phase 1A.2 bootstrap only. No OpenAI, no AI actions, no poll, no group create, no memory.

## Quick start

```bash
cp .env.example .env
# edit .env
ZALO_LOGIN_MODE=qr
ZALO_AUTO_START_LISTENER=true
npm install
npm run dev
```

Current phase prefers `ZALO_LOGIN_MODE=qr`. Cookie/session login is TODO (throws if used). OpenAI not used in this phase.