# blockUser

URL: https://zca-js.tdung.com/vi/apis/blockUser.html

# blockUser

## api.blockUser(userId)

### Parameters

*   userId `string`

### Return

`Promise<BlockUserResponse>`

### Types

ts
```ts
export type BlockUserResponse = "";
```

### Examples

ts
```ts
const userId = "0000000000000000001";
api
    .blockUser(userId)
    .then(console.log).catch(console.error);
```