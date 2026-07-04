# getSentFriendRequest

URL: https://zca-js.tdung.com/vi/apis/getSentFriendRequest.html

# getSentFriendRequest

## api.getSentFriendRequest()

### Parameters

### Return

`Promise<GetSentFriendRequestResponse>`

### Types

ts
```ts
export type SentFriendRequestInfo = {
    userId: string;
    zaloName: string;
    displayName: string;
    avatar: string;
    globalId: string;
    bizPkg: ZBusinessPackage;
    fReqInfo: {
        message: string;
        src: number;
        time: number;
    };
};

export type GetSentFriendRequestResponse = {
    [userId: string]: SentFriendRequestInfo;
};
```

### Examples

ts
```ts
api.getSentFriendRequest()
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ZBusinessPackage](./../models/ZBusiness.html)