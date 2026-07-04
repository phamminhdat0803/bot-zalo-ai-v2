# getProductCatalogList

URL: https://zca-js.tdung.com/vi/apis/getProductCatalogList.html

# getProductCatalogList

## api.getProductCatalogList(payload)

### Parameters

*   payload `GetProductCatalogListPayload`

### Return

`Promise<GetProductCatalogListResponse>`

### Types

ts
```ts
export type GetProductCatalogListPayload = {
    catalogId: string;
    /**
     * Mặc định 100
     */
    limit?: number;
    versionCatalog?: number;
    lastProductId?: string;
    /**
     * Mặc định 0
     */
    page?: number;
};

export type GetProductCatalogListResponse = {
    items: ProductCatalogItem[];
    version: number;
    has_more: number;
};
```

### Examples

ts
```ts
api.getProductCatalogList({ catalogId: "catalogId1" })
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ProductCatalogItem](./../models/ProductCatalog.html)