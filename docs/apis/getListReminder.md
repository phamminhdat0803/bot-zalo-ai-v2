# getListReminder

URL: https://zca-js.tdung.com/vi/apis/getListReminder.html

# getListReminder

## api.getListReminder(options, threadId\[, type\])

### Parameters

*   options `ListReminderOptions`
*   threadId `string`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<GetListReminderResponse>`

### Types

ts
```ts
export type ListReminderOptions = {
    /**
     * Mặc định 1
     */
    page?: number;
    /**
     * Mặc định 20
     */
    count?: number;
};

export type ReminderListUser = ReminderUser;
export type ReminderListGroup = ReminderGroup & {
    groupId: string;
    eventType: number;
    responseMem: {
        rejectMember: number;
        myResp: number;
        acceptMember: number;
    };
    repeatInfo: {
        list_ts: unknown[];
    };
    repeatData: unknown[];
};

export type GetListReminderResponse = (ReminderListUser & ReminderListGroup)[];
```

### Examples

ts
```ts
import { ThreadType } from "zca-js";

const groupId = "0000000000000000";
api.getListReminder({}, groupId, ThreadType.Group)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)
*   [ReminderGroup, ReminderUser](./../models/Reminder.html)