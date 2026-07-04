# updateAutoReply

URL: https://zca-js.tdung.com/vi/apis/updateAutoReply.html

# updateAutoReply

## api.updateAutoReply(payload)

### Parameters

*   payload `UpdateAutoReplyPayload`

### Return

`Promise<UpdateAutoReplyResponse>`

### Types

ts
```ts
export type UpdateAutoReplyPayload = {
    id: number;
    content: string;
    isEnable: boolean;
    startTime: number;
    endTime: number;
    scope: AutoReplyScope;
    uids?: string | string[];
};

export type UpdateAutoReplyResponse = {
    item: AutoReplyItem;
    version: number;
};
```

### Examples

Cập nhật tự động trả lời trong khoảng từ 18 giờ đến 7 giờ 30 hôm sau

ts
```ts
import { AutoReplyScope } from "zca-js":

const startTime = new Date();
const endTime = new Date();

// 18 giờ hôm nay
startTime.setHours(18, 0, 0, 0);

// 7 giờ 30 hôm sau
endTime.setDate(endTime.getDate() + 1);
endTime.setHours(7, 30, 0, 0);

api.updateAutoReply({
    id: 1,
    content: "Nội dung mới",
    isEnable: true,
    startTime: startTime,
    endTime: endTime,
    scope: AutoReplyScope.Stranger,
})
    .then(console.log)
    .catch(console.error);
```

INFO

**Lưu ý**: cấu hình trên được áp dụng cho mọi ngày, không chỉ riêng ngày được truyền vào. Tham số thời gian chỉ nhằm giúp Zalo xác định mốc thời gian tham chiếu.

### Related

*   [AutoReplyScope](./../models/AutoReply.html)