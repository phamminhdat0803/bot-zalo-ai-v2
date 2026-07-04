# getStickersDetail

URL: https://zca-js.tdung.com/vi/apis/getStickersDetail.html

# getStickersDetail

## api.getStickersDetail(stickerIds)

### Parameters

*   stickerIds `number` | `number[]`
    *   mảng hoặc 1 id sticker cần lấy thông tin

### Return

`Promise<StickerDetailResponse>`

### Types

ts
```ts
export type StickerDetail = {
    id: number;
    cateId: number;
    type: number;
    text: string;
    uri: string;
    fkey: number;
    status: number;
    stickerUrl: string;
    stickerSpriteUrl: string;
    stickerWebpUrl: unknown;
    totalFrames: number;
    duration: number;
    effectId: number;
    checksum: string;
    ext: number;
    source: number;
    fss: unknown;
    fssInfo: unknown;
    version: number;
    extInfo: unknown;
};

export type StickerDetailResponse = StickerDetail[];
```

### Examples

Lấy sticker với từ khóa `"xin chào"`

ts
```ts
// lấy thông tin của 5 sticker đầu tiên tìm thấy với từ khóa
    
try {
    const keyword = "xin chào";
    const stickerIds = await api.getStickers(keyword);
    const stickersDetail = await api.getStickersDetail(stickerIds.slice(0, 5));
    
    console.log(stickersDetail);
} catch(e) {
    console.error(e);
}
```