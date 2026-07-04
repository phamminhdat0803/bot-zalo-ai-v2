# removeUnreadMark

URL: https://zca-js.tdung.com/vi/apis/removeUnreadMark.html

# removeUnreadMark

## api.removeUnreadMark(threadId\[, type\])

### Parameters

*   threadId `string` | `string[]`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<RemoveUnreadMarkResponse>`

### Types

ts
```ts
export type RemoveUnreadMarkResponse = {
    data: {
        updateId: number;
    };
    status: number;
};
```

### Examples

ts
```ts
import { ThreadType } from "zca-js";

const threadId = "0000000000000000";

api.removeUnreadMark(threadId, ThreadType.Group)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)