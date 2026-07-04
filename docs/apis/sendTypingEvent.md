# sendTypingEvent

URL: https://zca-js.tdung.com/vi/apis/sendTypingEvent.html

# sendTypingEvent

## api.sendTypingEvent(threadId, type, destType)

### Parameters

*   threadId `string`
*   type `ThreadType`
    *   mặc định `ThreadType.User?`
*   destType `DestType?`
    *   Chỉ yêu cầu khi `type` là `ThreadType.User`

### Return

`Promise<SendTypingEventResponse>`

### Types

ts
```ts
export type SendTypingEventResponse = {
    status: number;
};
```

### Examples

ts
```ts
import { ThreadType, DestType } from "zca-js";

api.sendTypingEvent(threadId, ThreadType.User, DestType.User)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType, DestType](./../models/Enum.html)