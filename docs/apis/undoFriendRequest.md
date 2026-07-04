# undoFriendRequest

URL: https://zca-js.tdung.com/vi/apis/undoFriendRequest.html

# undoFriendRequest

## api.undoFriendRequest(friendId)

### Parameters

*   friendId `string`

### Return

`Promise<UndoFriendRequestResponse>`

### Types

ts
```ts
export type UndoFriendRequestResponse = "";
```

### Examples

ts
```ts
api.undoFriendRequest("000000000000000000")
    .then(console.log).catch(console.error);
```