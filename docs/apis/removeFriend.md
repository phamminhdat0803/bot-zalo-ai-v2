# removeFriend

URL: https://zca-js.tdung.com/vi/apis/removeFriend.html

# removeFriend

## api.removeFriend(friendId)

### Parameters

*   friendId `string`

### Return

`Promise<RemoveFriendResponse>`

### Types

ts
```ts
export type RemoveFriendResponse = "";
```

### Examples

ts
```ts
api.removeFriend("0000000000000000000")
    .then(console.log)
    .catch(console.error);
```