# addUserToGroup

URL: https://zca-js.tdung.com/vi/apis/addUserToGroup.html

# addUserToGroup

## api.addUserToGroup(memberId, groupId)

### Parameters

*   memberId `string` | `string[]`
*   groupId `string`

### Return

`Promise<AddUserToGroupResponse>`

### Types

ts
```ts
export type AddUserToGroupResponse = {
    errorMembers: string[];
    error_data: Record<string, string[]>;
};
```

### Examples

Thêm người dùng vào nhóm

ts
```ts
const groupId = "0000000000000000000";

// thêm 1 thành viên
const memberId = "0000000000000000001";
api
    .addUserToGroup(memberId, groupId)
    .then(console.log).catch(console.error);
    
// thêm nhiều thành viên
const memberIds = [
    "0000000000000000001",
    "0000000000000000002"
];
api
    .addUserToGroup(memberIds, groupId)
    .then(console.log).catch(console.error);
```