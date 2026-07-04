# getGroupInviteBoxList

URL: https://zca-js.tdung.com/vi/apis/getGroupInviteBoxList.html

# getGroupInviteBoxList

## api.getGroupInviteBoxList(payload)

### Parameters

*   payload `GetGroupInviteBoxListPayload?`

### Return

`Promise<GetGroupInviteBoxListResponse>`

### Types

ts
```ts
export type GetGroupInviteBoxListPayload = {
    mpage?: number;
    page?: number;
    invPerPage?: number;
    mcount?: number;
};

export type GetGroupInviteBoxListResponse = {
    invitations: {
        groupInfo: GroupInfo;
        inviterInfo: {
            id: string;
            dName: string;
            zaloName: string;
            avatar: string;
            avatar_25: string;
            accountStatus: number;
            type: number;
        };
        grCreatorInfo: {
            id: string;
            dName: string;
            zaloName: string;
            avatar: string;
            avatar_25: string;
            accountStatus: number;
            type: number;
        };
        /**
         * Thời gian hết hạn
         */
        expiredTs: string;
        type: number;
    }[];
    total: number;
    hasMore: boolean;
};
```

### Examples

ts
```ts
api
    .getGroupInviteBoxList()
    .then(console.log)
    .catch(console.error);
```

### Related

*   [GroupInfo](./../models/Group.html)