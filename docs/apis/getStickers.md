# getStickers

URL: https://zca-js.tdung.com/vi/apis/getStickers.html

# getStickers

## api.getStickers(keyword)

### Parameters

*   keyword `string`
    *   từ khóa tìm kiếm

### Return

`Promise<number[]>` id của các sticker tìm thấy

### Examples

Lấy sticker với từ khóa `"xin chào"`

ts
```ts
try {
    const keyword = "xin chào";
    const stickerIds = await api.getStickers(keyword);
    
    console.log(stickerIds);
} catch(e) {
    console.error(e);
}
```