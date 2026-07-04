# removeFriendAlias

URL: https://zca-js.tdung.com/vi/apis/removeFriendAlias.html

# removeFriendAlias

## api.removeFriendAlias(friendId)

### Parameters

*   friendId `string`

### Return

`Promise<RemoveFriendAliasResponse>`

### Types

ts
```ts
export type RemoveFriendAliasResponse = "";
```

### Examples

ts
```ts
const friendId = "000000000000000000"

api.removeFriendAlias(friendId)
    .then(console.log)
    .catch(console.error);
```