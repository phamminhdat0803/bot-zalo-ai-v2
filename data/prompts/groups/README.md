# Group prompts

Mỗi file `.md` trong thư mục này là prompt bổ sung cho một group Zalo.

Đăng ký group trong `data/prompts/groups.json`:

```json
{
  "YOUR_GROUP_THREAD_ID": {
    "enabled": true,
    "name": "Tên group",
    "domain": "default",
    "promptFile": "groups/YOUR_GROUP_THREAD_ID.md",
    "priority": 50
  }
}
```

Group prompt **không** ghi đè core/identity/capability — chỉ append sau các layer đó.