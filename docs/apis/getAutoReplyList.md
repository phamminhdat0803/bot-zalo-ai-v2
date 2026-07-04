# getAutoReplyList

URL: https://zca-js.tdung.com/vi/apis/getAutoReplyList.html

# getAutoReplyList

## api.getAutoReplyList()

### Parameters

### Return

`Promise<GetAutoReplyListResponse>`

### Types

ts
```ts
export type GetAutoReplyListResponse = {
    item: AutoReplyItem[];
    version: number;
};
```

### Examples

ts
```ts
api.getAutoReplyList()
    .then(console.log)
    .catch(console.error);
```

### Related

*   [AutoReplyItem](./../models/AutoReply.html)