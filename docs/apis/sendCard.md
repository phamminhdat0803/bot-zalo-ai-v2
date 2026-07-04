# sendCard

URL: https://zca-js.tdung.com/vi/apis/sendCard.html

# sendCard

## api.sendCard(options, threadId\[, type\])

### Parameters

*   options `SendCardOptions`
*   threadId `string`
    *   id của người dùng hoặc nhóm
*   type `ThreadType?`
    *   loại thread: người dùng/nhóm, mặc định là người dùng

### Return

`Promise<SendCardResponse>`

### Types

ts
```ts
export type SendCardOptions = {
    userId: string;
    phoneNumber?: string;
    ttl?: number;
};

export type SendCardResponse = {
    msgId: number;
};
```

### Examples

Gửi danh thiếp của tài khoản đã đăng nhập tới 1 nhóm

ts
```ts
import { ThreadType } from "zca-js";

const threadId = "0000000000000000000";
const loggedInId = api.getOwnId();
const phoneNumber = "0900000000";

api.sendCard(
    {
        userId: loggedInId,
        phoneNumber: phoneNumber,
    },
    threadId,
    ThreadType.Group
)
    .then(console.log)
    .catch(console.error);
```