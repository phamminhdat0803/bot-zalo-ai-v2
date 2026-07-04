# getReminder

URL: https://zca-js.tdung.com/vi/apis/getReminder.html

# getReminder

## api.getReminder(reminderId)

### Parameters

*   reminderId `string`

### Return

`Promise<GetReminderResponse>`

### Types

ts
```ts
export type GetReminderResponse = ReminderGroup;
```

### Examples

ts
```ts
api.getReminder("reminderId1")
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ReminderGroup](./../models/Reminder.html)