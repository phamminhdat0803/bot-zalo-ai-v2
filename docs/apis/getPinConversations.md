# getPinConversations

URL: https://zca-js.tdung.com/vi/apis/getPinConversations.html

# getPinConversations

## api.getPinConversations()

### Parameters

*   groupId `string`

### Return

`Promise<GetPinConversationsResponse>`

### Types

ts
```ts
export type GetPinConversationsResponse = {
    conversations: string[];
    version: number;
};
```

### Examples

ts
```ts
api.getPinConversations()
    .then(console.log)
    .catch(console.error);
```