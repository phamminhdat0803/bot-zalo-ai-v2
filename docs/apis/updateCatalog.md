# updateCatalog

URL: https://zca-js.tdung.com/vi/apis/updateCatalog.html

# updateCatalog

## api.updateCatalog(payload)

### Parameters

*   payload `UpdateCatalogPayload`

### Return

`Promise<UpdateCatalogResponse>`

### Types

ts
```ts
export type UpdateCatalogPayload = {
    catalogId: string;
    catalogName: string;
};

export type UpdateCatalogResponse = {
    item: CatalogItem;
    version_ls_catalog: number;
    version_catalog: number;
};
```

### Examples

Cập nhật tự động trả lời trong khoảng từ 18 giờ đến 7 giờ 30 hôm sau

ts
```ts
api.updateAutoReply({
    catalogId: "catalogId1",
    catalogName: "tên danh mục mới"
})
    .then(console.log)
    .catch(console.error);
```

### Related

*   [CatalogItem](./../models/Catalog.html)