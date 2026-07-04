# getGroupInfo

URL: https://zca-js.tdung.com/vi/apis/getGroupInfo.html

# getGroupInfo

## api.getGroupInfo(groupId)

### Parameters

*   groupId `string` | `string[]`

### Return

`Promise<GroupInfoResponse>`

### Types

ts
```ts
export type GroupInfoResponse = {
    removedsGroup: string[];
    unchangedsGroup: string[];
    gridInfoMap: {
        [groupId: string]: GroupInfo & {
            memVerList: string[];
            pendingApprove: GroupInfoPendingApprove;
        };
    };
};

export type GroupInfoPendingApprove = {
    time: number;
    uids: string[] | null;
};
```

### Examples

Lấy thông tin của nhóm

ts
```ts
const groupId = "0000000000000000000";
api.getGroupInfo(groupId)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [GroupInfo, GroupSetting](./../models/Group.html)