# removeReminder

URL: https://zca-js.tdung.com/vi/apis/removeReminder.html

# removeReminder

## api.removeReminder(reminderId, threadId\[, type\])

### Parameters

*   reminderId `string`
*   threadId `string`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<RemoveReminderResponse>`

### Types

ts
```ts
export type RemoveReminderResponse = "" | number;
```

### Examples

ts
```ts
import { ThreadType } from "zca-js";

const reminderId = "reminderId1";
const groupId = "0000000000000000000";

api.removeReminder(reminderId, groupId, ThreadType.Group)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)