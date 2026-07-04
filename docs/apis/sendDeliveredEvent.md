# sendDeliveredEvent

URL: https://zca-js.tdung.com/vi/apis/sendDeliveredEvent.html

# sendDeliveredEvent

## api.sendDeliveredEvent(isSeen, messages\[, type\])

### Parameters

*   isSeen `boolean`
*   messages `SendDeliveredEventMessageParam[]`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<SendDeliveredEventResponse>`

### Types

ts
```ts
export type SendDeliveredEventResponse = "" | { status: number };

export type SendDeliveredEventMessageParam = {
    msgId: string;
    cliMsgId: string;
    uidFrom: string;
    idTo: string;
    msgType: string;
    st: number;
    at: number;
    cmd: number;
    ts: string | number;
};
```

### Examples

ts
```ts
import { ThreadType } from "zca-js";

const messages = [
    {
        msgId: "";
        cliMsgId: "";
        uidFrom: "";
        idTo: "";
        msgType: "";
        st: 1;
        at: 1;
        cmd: 1;
        ts: "";
    }
]

api.sendDeliveredEvent(false, messages, ThreadType.Group)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)