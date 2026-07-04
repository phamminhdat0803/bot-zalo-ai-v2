# inviteUserToGroups

URL: https://zca-js.tdung.com/vi/apis/inviteUserToGroups.html

# inviteUserToGroups

## api.inviteUserToGroups(userId, groupId)

### Parameters

*   userId `string`
*   groupId `string` | `string[]`

### Return

`Promise<InviteUserToGroupsResponse>`

### Types

ts
```ts
export type InviteUserToGroupsResponse = {
    grid_message_map: {
        [groupId: string]: {
            error_code: number;
            error_message: string;
            data: string | null;
        };
    };
};
```

### Examples

ts
```ts
const userId = "0000000000000000001";
const groupId = "0000000000000000002";
api.inviteUserToGroups(userId, groupId)
    .then(console.log)
    .catch(console.error);
```