# getArchivedChatList

URL: https://zca-js.tdung.com/vi/apis/getArchivedChatList.html

# getArchivedChatList

## api.getArchivedChatList()

### Parameters

### Return

`Promise<GetArchivedChatListResponse>`

### Types

ts
```ts
export type GetArchivedChatListResponse = {
    items: unknown[];
    version: number;
};
```

### Examples

ts
```ts
api.getArchivedChatList()
    .then(console.log)
    .catch(console.error);
```