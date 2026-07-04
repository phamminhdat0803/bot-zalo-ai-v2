# getGroupMembersInfo

URL: https://zca-js.tdung.com/vi/apis/getGroupMembersInfo.html

# getGroupMembersInfo

## api.getGroupMembersInfo(memberId)

### Parameters

*   memberId `string` | `string[]`

### Return

`Promise<GetGroupMembersInfoResponse>`

### Types

ts
```ts
export type GroupMemberProfile = {
    displayName: string;
    zaloName: string;
    avatar: string;
    accountStatus: number;
    type: number;
    lastUpdateTime: number;
    globalId: string;
    id: string;
};

export type GetGroupMembersInfoResponse = {
    profiles: {
        [memberId: string]: GroupMemberProfile;
    };
    unchangeds_profile: unknown[];
};
```

### Examples

ts
```ts
const memberUids = ["000000000000001", "000000000000002"];
api.getGroupMembersInfo(memberUids)
    .then(console.log)
    .catch(console.error);
```