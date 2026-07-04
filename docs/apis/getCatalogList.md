# getCatalogList

URL: https://zca-js.tdung.com/vi/apis/getCatalogList.html

# getCatalogList

## api.getCatalogList(\[payload\])

### Parameters

*   payload `GetCatalogListPayload?`

### Return

`Promise<GetCatalogListResponse>`

### Types

ts
```ts
export type GetCatalogListPayload = {
    /**
     * Mặc định 20
     */
    limit?: number;
    lastProductId?: number;
    /**
     * Mặc định 0
     */
    page?: number;
};

export type GetCatalogListResponse = {
    items: CatalogItem[];
    version: number;
    has_more: number;
};
```

### Examples

ts
```ts
api.getCatalogList({ limit: 20, page: 0 })
    .then(console.log)
    .catch(console.error);
```

### Related

*   [CatalogItem](./../models/Catalog.html)