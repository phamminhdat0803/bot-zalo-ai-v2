# User-specific prompts

Prompt theo **senderId** Zalo (id người gửi tin), **không** dùng `threadId` nhóm.

Trong **group chat**: `threadId` = id nhóm; `senderId` = id người đang gửi tin (key user prompt).

Lấy `senderId`:

- Bật tạm `ZALO_DEBUG_MESSAGE=true` (log parser, không dump full raw mặc định).
- Hoặc `/prompt debug` khi `PROMPT_ADMIN_ENABLED=true` và `senderId` của bạn nằm trong `ZALO_ADMIN_USER_IDS`.

## Quy tắc

- File: `data/prompts/users/<senderId>.md`
- Registry: `data/prompts/users.json` (key = `senderId`)
- Chỉ dùng cho **sở thích trả lời / cách hỗ trợ** (ngắn gọn, checklist, tone…).
- **Không** override core, capability, action schema hay policy bot.
- **Không** ghi thông tin nhạy cảm không cần thiết (mật khẩu, token, dữ liệu cá nhân thừa).

## Cách thêm user prompt mới

1. Lấy `senderId` từ log hoặc `/prompt debug`.
2. Tạo `data/prompts/users/<senderId>.md`.
3. Thêm entry vào `data/prompts/users.json`:

```json
{
  "123456789": {
    "enabled": true,
    "name": "User A",
    "promptFile": "users/123456789.md",
    "applyInGroups": true,
    "applyInPrivate": true,
    "priority": 60
  }
}
```

4. Nếu `PROMPT_CACHE_ENABLED=true`, restart bot (hoặc dùng reload cache nếu có) để đọc file mới.

## Ví dụ nội dung `.md`

```markdown
# User Prompt

Người dùng này thích câu trả lời ngắn gọn, đi thẳng vào giải pháp.

Quy tắc:
- Nếu hỏi về code, đưa checklist debug trước.
- Nếu hỏi về lỗi, yêu cầu log hoặc stack trace nếu thiếu.
- Không trả lời quá dài nếu chưa cần.
```

## Merge order (system prompt)

`core` → `identity` → `capability` → `domain` → `group` → **user** → `runtime`

- Group: ngữ cảnh nhóm.
- User: style theo người đang gửi (cả group và private nếu `applyIn*` bật).

Tắt toàn bộ user layer: `PROMPT_USER_ENABLED=false` trong `.env`.