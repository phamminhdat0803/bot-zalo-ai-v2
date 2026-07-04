# getQuickMessageList

URL: https://zca-js.tdung.com/vi/apis/getQuickMessageList.html

# getQuickMessageList

## api.getQuickMessageList()

### Parameters

### Return

`Promise<GetQuickMessageListResponse>`

### Types

ts
```ts
export type GetQuickMessageListResponse = {
    cursor: number;
    version: number;
    items: QuickMessage[];
};
```

### Examples

ts
```ts
api.getQuickMessageList()
    .then(console.log)
    .catch(console.error);
```

### Related

*   [QuickMessage](./../models/QuickMessage.html)