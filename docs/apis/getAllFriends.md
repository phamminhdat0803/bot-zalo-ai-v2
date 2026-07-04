# getAllFriends

URL: https://zca-js.tdung.com/vi/apis/getAllFriends.html

# getAllFriends

## api.getAllFriends()

### Parameters

*   count `number?`
    *   mặc định 20000
*   page `number?`
    *   mặc định 1

### Return

`Promise<GetAllFriendsResponse>`

### Types

ts
```ts
export type GetAllFriendsResponse = User[];
```

### Examples

ts
```ts
api.getAllFriends()
    .then(console.log)
    .catch(console.error);
```

### Related

*   [User](./../models/User.html)