# updateAutoDeleteChat

URL: https://zca-js.tdung.com/vi/apis/updateAutoDeleteChat.html

# updateAutoDeleteChat

## api.updateAutoDeleteChat(ttl, threadId\[, type\])

### Parameters

*   ttl `ChatTTL`
*   threadId `string`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<UpdateAutoDeleteChatResponse>`

### Types

ts
```ts
export enum ChatTTL {
    NO_DELETE = 0,
    ONE_DAY = 86400000,
    SEVEN_DAYS = 604800000,
    FOURTEEN_DAYS = 1209600000,
}

export type UpdateAutoDeleteChatResponse = "";
```

### Examples

ts
```ts
import { ChatTTL } from "zca-js":

api.updateAutoDeleteChat(ChatTTL.ONE_DAY, "000000000000000000")
    .then(console.log).catch(console.error);
```