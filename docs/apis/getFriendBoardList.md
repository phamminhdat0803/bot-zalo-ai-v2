# getFriendBoardList

URL: https://zca-js.tdung.com/vi/apis/getFriendBoardList.html

# getFriendBoardList

## api.getFriendBoardList(conversationId)

### Parameters

*   conversationId `string`

### Return

`Promise<GetFriendBoardListResponse>`

### Types

ts
```ts
export type GetFriendBoardListResponse = {
    data: string[];
    version: number;
};
```

### Examples

ts
```ts
api.getFriendBoardList("000000000000000")
    .then(console.log)
    .catch(console.error);
```