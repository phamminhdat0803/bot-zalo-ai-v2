# User

URL: https://zca-js.tdung.com/vi/models/User.html

# User

### Model

ts
```ts
export type User = {
    userId: string;
    username: string;
    displayName: string;
    zaloName: string;
    avatar: string;
    bgavatar: string;
    cover: string;
    gender: Gender;
    dob: number;
    sdob: string;
    status: string;
    phoneNumber: string;
    isFr: number;
    isBlocked: number;
    lastActionTime: number;
    lastUpdateTime: number;
    isActive: number;
    key: number;
    type: number;
    isActivePC: number;
    isActiveWeb: number;
    isValid: number;
    userKey: string;
    accountStatus: number;
    oaInfo: unknown;
    user_mode: number;
    globalId: string;
    bizPkg: ZBusinessPackage;
    createdTs: number;
    oa_status: unknown;
};
```

### Related

*   [Gender](./Enum.html)
*   [ZBusinessPackage](./ZBusiness.html)