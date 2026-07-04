# createReminder

URL: https://zca-js.tdung.com/vi/apis/createReminder.html

# createReminder

## api.createReminder(options, threadId\[, type\])

### Parameters

*   options `CreateReminderOptions`
*   threadId `string`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<CreateReminderResponse>`

### Types

ts
```ts
export type CreateReminderOptions = {
    title: string;
    emoji?: string;
    startTime?: number;
    repeat?: ReminderRepeatMode;
};

export type CreateReminderUser = ReminderUser;
export type CreateReminderGroup = Omit<ReminderGroup, "responseMem">;

export type CreateReminderResponse = CreateReminderUser | CreateReminderGroup;
```

### Examples

ts
```ts
const startTime = new Date();
startTime.setHours(22, 0, 0, 0);

api
    .createReminder({
        title: "Đến hẹn đi ăn tối.",
        startTime: startTime.getTime()
    })
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ReminderRepeatMode & ReminderUser & ReminderGroup](./../models/Reminder.html)
*   [ThreadType](./../models/Enum.html)