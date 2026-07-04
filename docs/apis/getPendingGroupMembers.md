# getPendingGroupMembers

URL: https://zca-js.tdung.com/vi/apis/getPendingGroupMembers.html

# getPendingGroupMembers

## api.getPendingGroupMembers(groupId)

### Parameters

*   groupId `string`

### Return

`Promise<GetPendingGroupMembersResponse>`

### Types

ts
```ts
export type GetPendingGroupMembersUserInfo = {
    uid: string;
    dpn: string;
    avatar: string;
    user_submit: null;
};

export type GetPendingGroupMembersResponse = {
    time: number;
    users: GetPendingGroupMembersUserInfo[];
};
```

### Examples

ts
```ts
const groupId = "0000000000000000";
api.getPendingGroupMembers(groupId)
    .then(console.log)
    .catch(console.error);
```