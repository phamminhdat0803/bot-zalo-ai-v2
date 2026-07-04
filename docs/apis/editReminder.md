# editReminder

URL: https://zca-js.tdung.com/vi/apis/editReminder.html

# editReminder

## api.editReminder(options, groupId)

### Parameters

*   options `EditReminderOptions`
*   groupId `string`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<EditReminderResponse>`

### Types

ts
```ts
export type EditReminderOptions = {
    title: string;
    topicId: string;
    emoji?: string;
    startTime?: number;
    repeat?: ReminderRepeatMode;
};

export type EditReminderUser = ReminderUser;
export type EditReminderGroup = Omit<ReminderGroup, "responseMem">;

export type EditReminderResponse = EditReminderUser | EditReminderGroup;
```

### Examples

ts
```ts
import { ThreadType } from "zca-js";

const groupId = "0000000000000000000";
const topicId = "";
const newTitle = "Tiêu đề mới"

api
    .editReminder(
        {
            topicId: topicId,
            title: newTitle,
        },
        groupId,
        ThreadType.Group
    )
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ReminderRepeatMode & ReminderUser & ReminderGroup](./../models/Reminder.html)
*   [ThreadType](./../models/Enum.html)