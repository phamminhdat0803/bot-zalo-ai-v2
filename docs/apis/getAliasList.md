# getAliasList

URL: https://zca-js.tdung.com/vi/apis/getAliasList.html

# getAliasList

## api.getAliasList(\[count, page\])

### Parameters

*   count `number?`
    *   mặc định 100
*   page `number?`
    *   mặc định 1

### Return

`Promise<GetAliasListResponse>`

### Types

ts
```ts
export type GetAliasListResponse = {
    items: {
        userId: string;
        alias: string;
    }[];
    updateTime: string;
};
```

### Examples

ts
```ts
api.getAliasList()
    .then(console.log)
    .catch(console.error);
```