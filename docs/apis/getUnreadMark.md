# getUnreadMark

URL: https://zca-js.tdung.com/vi/apis/getUnreadMark.html

# getUnreadMark

## api.getUnreadMark()

### Parameters

### Return

`Promise<GetUnreadMarkResponse>`

### Types

ts
```ts
export type UnreadMark = {
    id: number;
    cliMsgId: number;
    fromUid: number;
    ts: number;
};

export type GetUnreadMarkResponse = {
    data: {
        convsGroup: UnreadMark[];
        convsUser: UnreadMark[];
    };
    status: number;
};
```

### Examples

ts
```ts
api.getUnreadMark()
    .then(console.log)
    .catch(console.error);
```