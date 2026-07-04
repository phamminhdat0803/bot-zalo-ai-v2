# getGroupBlockedMember

URL: https://zca-js.tdung.com/vi/apis/getGroupBlockedMember.html

# getGroupBlockedMember

## api.getGroupBlockedMember(payload, groupId)

### Parameters

*   payload `GetGroupBlockedMemberPayload`
*   groupId `string`

### Return

`Promise<GetGroupBlockedMemberResponse>`

### Types

ts
```ts
export type GetGroupBlockedMemberPayload = {
    /**
     * mặc định: 1
     */
    page?: number;
    /**
     * mặc định: 50
     */
    count?: number;
};

export type GetGroupBlockedMemberResponse = {
    blocked_members: {
        id: string;
        dName: string;
        zaloName: string;
        avatar: string;
        avatar_25: string;
        accountStatus: number;
        type: number;
    }[];
    has_more: number;
};
```

### Examples

ts
```ts
api.getGroupBlockedMember({}, "000000000000000")
    .then(console.log)
    .catch(console.error);
```