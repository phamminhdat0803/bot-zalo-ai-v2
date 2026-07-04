# createAutoReply

URL: https://zca-js.tdung.com/vi/apis/createAutoReply.html

# createAutoReply

## api.createAutoReply(memberId, groupId)

### Parameters

*   payload `CreateAutoReplyPayload`

### Return

`Promise<CreateAutoReplyResponse>`

### Types

ts
```ts
export type CreateAutoReplyPayload = {
    content: string;
    isEnable: boolean;
    startTime: number;
    endTime: number;
    scope: AutoReplyScope;
    uids?: string | string[];
};

export type CreateAutoReplyResponse = {
    item: AutoReplyItem;
    version: number;
};
```

### Examples

Cấu hình tự động trả lời trong khoảng từ 18 giờ đến 7 giờ 30 hôm sau

ts
```ts
import { AutoReplyScope } from "zca-js";

const startTime = new Date();
const endTime = new Date();

// 18 giờ hôm nay
startTime.setHours(18, 0, 0, 0);

// 7 giờ 30 hôm sau
endTime.setDate(endTime.getDate() + 1);
endTime.setHours(7, 30, 0, 0);

api
    .createAutoReply({
        content: "Xin chào",
        isEnable: true,
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        scope: AutoReplyScope.Everyone,
    })
    .then(console.log).catch(console.error);
```

Lưu ý

Cấu hình trên được áp dụng cho mọi ngày, không chỉ riêng ngày được truyền vào. Tham số thời gian chỉ nhằm giúp Zalo xác định mốc thời gian tham chiếu.

### Related

*   [AutoReplyScope & AutoReplyItem](./../models/AutoReply.html)