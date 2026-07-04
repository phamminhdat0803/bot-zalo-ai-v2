# joinGroupInviteBox

URL: https://zca-js.tdung.com/vi/apis/joinGroupInviteBox.html

# joinGroupInviteBox

## api.joinGroupInviteBox(groupId)

### Parameters

*   groupId `string`

### Return

`Promise<JoinGroupInviteBoxResponse>`

### Types

ts
```ts
export type JoinGroupInviteBoxResponse = "";
```

### Examples

ts
```ts
const groupId = "0000000000000000002";
api.joinGroupInviteBox(groupId)
    .then(console.log)
    .catch(console.error);
```