# getGroupLinkInfo

URL: https://zca-js.tdung.com/vi/apis/getGroupLinkInfo.html

# getGroupLinkInfo

## api.getGroupLinkInfo(payload)

### Parameters

*   payload `GetGroupLinkInfoPayload`

### Return

`Promise<GetGroupLinkInfoResponse>`

### Types

ts
```ts
export type GetGroupLinkInfoPayload = {
    link: string;
    /**
     * Mặc định 1
     */
    memberPage?: number;
};

export type GetGroupLinkInfoResponse = {
    groupId: string;
    name: string;
    desc: string;
    type: number;
    creatorId: string;
    avt: string;
    fullAvt: string;
    adminIds: string[];
    currentMems: {
        id: string;
        dName: string;
        zaloName: string;
        avatar: string;
        avatar_25: string;
        accountStatus: number;
        type: number;
    }[];
    admins: unknown[];
    hasMoreMember: number;
    subType: number;
    totalMember: number;
    setting: GroupSetting;
    globalId: string;
};
```

### Examples

ts
```ts
const inviteLink = "https://zalo.me/g/*******";
api.getGroupLinkInfo({ link: inviteLink })
    .then(console.log)
    .catch(console.error);
```

### Related

*   [GroupSetting](./../models/Group.html)