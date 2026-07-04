# deleteGroupInviteBox

URL: https://zca-js.tdung.com/vi/apis/deleteGroupInviteBox.html

# deleteGroupInviteBox

## api.deleteGroupInviteBox(groupId\[, blockFutureInvite\])

### Parameters

*   groupId `string` | `string[]`
*   blockFutureInvite `boolean?`
    *   chặn lời mời từ nhóm trong tương lai, mặc định `false`

### Return

`Promise<DeleteGroupInviteBoxResponse>`

### Types

ts
```ts
export type DeleteGroupInviteBoxResponse = {
    delInvitaionIds: string[];
    errMap: {
        [groupId: string]: {
            err: number;
        };
    };
};
```

### Examples

ts
```ts
const groupId = "00000000000000";

api
    .deleteGroupInviteBox(groupId, true)
    .then(console.log).catch(console.error);
```