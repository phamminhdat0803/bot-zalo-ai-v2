# changeFriendAlias

URL: https://zca-js.tdung.com/vi/apis/changeFriendAlias.html

# changeFriendAlias

## api.changeFriendAlias(alias, friendId)

### Parameters

*   alias `string`
*   friendId `string`

### Return

`Promise<ChangeFriendAliasResponse>`

### Types

ts
```ts
export type ChangeFriendAliasResponse = "";
```

### Examples

ts
```ts
const alias = "Tên gợi nhớ";
const friendId = "0000000000000000001";

api
    .changeFriendAlias(alias, friendId)
    .then(console.log).catch(console.error);
```