# deleteProductCatalog

URL: https://zca-js.tdung.com/vi/apis/deleteProductCatalog.html

# deleteProductCatalog

## api.deleteProductCatalog(payload)

### Parameters

*   payload `DeleteProductCatalogPayload`

### Return

`Promise<DeleteProductCatalogResponse>`

### Types

ts
```ts
export type DeleteProductCatalogPayload = {
    productIds: string | string[];
    catalogId: string;
};

export type DeleteProductCatalogResponse = {
    item: number[];
    version_ls_catalog: number;
    version_catalog: number;
};
```

### Examples

ts
```ts
api
    .deleteProductCatalog({
        productIds: ["productId1", "productId2"],
        catalogId: "catalogId1"
    })
    .then(console.log).catch(console.error);
```