# setPinnedConversations

URL: https://zca-js.tdung.com/vi/apis/setPinnedConversations.html

# setPinnedConversations

## api.setPinnedConversations(pinned, threadId\[, type\])

### Parameters

*   pinned `boolean`
*   threadId `string` | `string[]`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<PinConversationsResponse>`

### Examples

Ghim cuộc hội thoại nhóm

ts
```ts
import { ThreadType } from "zca-js";

const threadId = "0000000000000000000";

api.pinConversations(true, threadId, ThreadType.Group)
    .then(console.log)
    .catch(console.error);
```

Bỏ ghim cuộc hội thoại nhóm

ts
```ts
import { ThreadType } from "zca-js";

const threadId = "0000000000000000000";

api.pinConversations(false, threadId, ThreadType.Group)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)