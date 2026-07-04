# removeQuickMessage

URL: https://zca-js.tdung.com/vi/apis/removeQuickMessage.html

# removeQuickMessage

## api.removeQuickMessage(itemIds)

### Parameters

*   itemIds `string | string[]`
    *   id của tin nhắn nhanh

### Return

`Promise<RemoveQuickMessageResponse>`

### Types

ts
```ts
export type RemoveQuickMessageResponse = {
    itemIds: number[];
    version: number;
};
```

### Examples

ts
```ts
const itemIds = [1,2,3,4];

api.removeQuickMessage(itemIds)
    .then(console.log)
    .catch(console.error);
```