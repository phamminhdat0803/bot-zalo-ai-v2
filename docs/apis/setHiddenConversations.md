# setHiddenConversations

URL: https://zca-js.tdung.com/vi/apis/setHiddenConversations.html

# setHiddenConversations

## api.setHiddenConversations(hidden, threadId\[, type\])

### Parameters

*   hidden `boolean`
*   threadId `string` | `string[]`
*   type `ThreadType?`
    *   mặc định là `ThreadType.User`

### Return

`Promise<SetHiddenConversationsResponse>`

### Types

ts
```ts
export type SetHiddenConversationsResponse = "";
```

### Examples

ts
```ts
import { ThreadType } from "zca-js";

const threadIds = ["000000000000000000", "000000000000000001"];

api.setHiddenConversations(true, threadIds, ThreadType.Group)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)