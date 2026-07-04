# enableGroupLink

URL: https://zca-js.tdung.com/vi/apis/enableGroupLink.html

# enableGroupLink

## api.enableGroupLink(groupId)

### Parameters

*   groupId `string`

### Return

`Promise<EnableGroupLinkResponse>`

### Types

ts
```ts
export type EnableGroupLinkResponse = {
    link: string;
    expiration_date: number;
    enabled: number;
};
```

### Examples

ts
```ts
api.enableGroupLink("000000000000000000")
    .then(console.log).catch(console.error);
```

### Related

*   [ReminderRepeatMode & ReminderUser & ReminderGroup](./../models/Reminder.html)
*   [ThreadType](./../models/Enum.html)