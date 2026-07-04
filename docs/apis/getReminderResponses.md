# getReminderResponses

URL: https://zca-js.tdung.com/vi/apis/getReminderResponses.html

# getReminderResponses

## api.getReminderResponses(reminderId)

### Parameters

*   reminderId `string`

### Return

`Promise<GetReminderResponsesResponse>`

### Types

ts
```ts
export type GetReminderResponsesResponse = {
    rejectMember: string[];
    acceptMember: string[];
};
```

### Examples

ts
```ts
api.getReminderResponses("reminderId1")
    .then(console.log)
    .catch(console.error);
```