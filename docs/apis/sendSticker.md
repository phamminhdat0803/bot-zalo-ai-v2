# sendSticker

URL: https://zca-js.tdung.com/vi/apis/sendSticker.html

# sendSticker

## api.sendSticker(sticker, threadId\[, type\])

### Parameters

*   sticker `SendStickerPayload`
*   threadId `string`
    *   id của người/nhóm cần gửi
*   type `ThreadType?`
    *   loại thread: người dùng/nhóm, mặc định là người dùng

### Return

`Promise<SendStickerResponse>`

### Types

ts
```ts
export type SendStickerPayload = {
    id: number;
    cateId: number;
    type: number;
};

export type SendStickerResponse = {
    msgId: number;
};
```

### Examples

Gửi sticker `"xin chào"`

ts
```ts
import { ThreadType } from "zca-js"

// tìm sticker "hello", lấy và gửi sticker đầu tiên tìm thấy
api.getStickers("hello")
    .then(async (stickerIds) => {
        const stickersDetail = await api.getStickersDetail(stickerIds[0]);
        api.sendSticker(stickersDetail[0], "0000000000000001", ThreadType.User)
            .then(console.log)
            .catch(console.error);
    })
    .catch(console.error);
```

## Related

*   [getStickers](./getStickers.html)
*   [getStickersDetail](./getStickersDetail.html)
*   [ThreadType](./../models/Enum.html)