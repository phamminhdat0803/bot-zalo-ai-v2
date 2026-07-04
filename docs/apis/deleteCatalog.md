# deleteCatalog

URL: https://zca-js.tdung.com/vi/apis/deleteCatalog.html

# deleteCatalog

## api.deleteCatalog(catalogId)

### Parameters

*   catalogId `string`

### Return

`Promise<DeleteCatalogResponse>`

### Types

ts
```ts
export type DeleteCatalogResponse = "";
```

### Examples

ts
```ts
api
    .deleteCatalog("catalogId_1")
    .then(console.log).catch(console.error);
```