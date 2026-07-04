# addUnreadMark

URL: https://zca-js.tdung.com/vi/apis/addUnreadMark.html

# addUnreadMark

## api.addUnreadMark(threadId\[, type\])

### Parameters

*   threadId `string`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<AddUnreadMarkResponse>`

### Types

ts
```ts
export type AddUnreadMarkResponse = {
    data: {
        updateId: number;
    };
    status: number;
};
```

### Examples

Đánh dấu chưa đọc 1 nhóm

ts
```ts
import { ThreadType } from "zca-js";

api
    .addUnreadMark("000000000000000000", ThreadType.Group)
    .then(console.log).catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)