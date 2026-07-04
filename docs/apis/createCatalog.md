# createCatalog

URL: https://zca-js.tdung.com/vi/apis/createCatalog.html

# createCatalog

## api.createCatalog(catalogName)

### Parameters

*   catalogName `string`

### Return

`Promise<CreateCatalogResponse>`

### Types

ts
```ts
export type CreateCatalogResponse = {
    item: CatalogItem;
    version_ls_catalog: number;
    version_catalog: number;
};
```

### Examples

ts
```ts
api.createCatalog("Sản phẩm độc quyền")
    .then(console.log).catch(console.error);
```

### Related

*   [CatalogItem](./../models/Catalog.html)