# getGroupInviteBoxInfo

URL: https://zca-js.tdung.com/vi/apis/getGroupInviteBoxInfo.html

# getGroupInviteBoxInfo

## api.getGroupInviteBoxInfo(payload)

### Parameters

*   payload `GetGroupInviteBoxInfoPayload`

### Return

`Promise<GetGroupInviteBoxInfoResponse>`

### Types

ts
```ts
export type GetGroupInviteBoxInfoPayload = {
    groupId: string;
    mpage?: number;
    mcount?: number;
};

export type GetGroupInviteBoxInfoResponse = {
    groupInfo: GroupInfo & {
        topic?: Omit<GroupTopic, "action">;
    };
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
    expiredTs: string;
    type: number;
};
```

### Examples

ts
```ts
api
    .getGroupInviteBoxInfo({
        groupId: "0000000000000000000"
    })
    .then(console.log)
    .catch(console.error);
```

### Related

*   [GroupInfo, GroupTopic](./../models/Group.html)