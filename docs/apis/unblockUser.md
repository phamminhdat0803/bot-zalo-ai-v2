# unblockUser

URL: https://zca-js.tdung.com/vi/apis/unblockUser.html

# unblockUser

## api.unblockUser(userId)

### Parameters

*   userId `string`

### Return

`Promise<UnBlockUserResponse>`

### Types

ts
```ts
export type UnBlockUserResponse = "";
```

### Examples

ts
```ts
const userId = "0000000000000001"

api.unblockUser(userId)
    .then(console.log)
    .catch(console.error);
```