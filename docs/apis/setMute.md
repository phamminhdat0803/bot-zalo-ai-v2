# setMute

URL: https://zca-js.tdung.com/vi/apis/setMute.html

# setMute

## api.setMute(params, threadId\[, type\])

### Parameters

*   params `SetMuteParams`
*   threadId `string` | `string[]`
*   type `ThreadType?`
    *   mặc định là `ThreadType.User`

### Return

`Promise<SetMuteResponse>`

### Types

ts
```ts
export type SetMuteParams = {
    /**
     * Thời gian tắt âm cuộc trò chuyện theo MuteDuration hoặc số (giây)
     */
    duration?: MuteDuration | number;
    action?: MuteAction;
};

export type SetMuteResponse = "";

export enum MuteDuration {
    ONE_HOUR = 3600,
    FOUR_HOURS = 14400,
    FOREVER = -1,
    UNTIL_8AM = "until8AM",
};

export enum MuteAction {
    MUTE = 1,
    UNMUTE = 3,
};
```

### Examples

ts
```ts
import { ThreadType, MuteDuration, MuteAction } from "zca-js";

const threadIds = "000000000000000001";

api
    .setMute(
        {
            duration: MuteDuration.FOUR_HOURS,
            action: MuteAction.MUTE
        },
        threadIds,
        ThreadType.Group
    )
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)