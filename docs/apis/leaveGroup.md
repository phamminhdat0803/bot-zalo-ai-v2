# leaveGroup

URL: https://zca-js.tdung.com/vi/apis/leaveGroup.html

# leaveGroup

## api.leaveGroup(groupId\[, silent\])

### Parameters

*   groupId `string`
*   silent `boolean?`
    *   mặc định `false`

### Return

`Promise<LeaveGroupResponse>`

### Types

ts
```ts
export type LeaveGroupResponse = {
    memberError: unknown[];
};
```

### Examples

ts
```ts
api.leaveGroup("00000000000000000")
    .then(console.log)
    .catch(console.error);
```