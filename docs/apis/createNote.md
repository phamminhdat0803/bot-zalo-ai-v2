# createNote

URL: https://zca-js.tdung.com/vi/apis/createNote.html

# createNote

## api.createNote(options, groupId)

### Parameters

*   options `CreateNoteOptions`
    *   title `string`
    *   pinAct `boolean?`
        *   Ghim ghi chú, mặc định `false`
*   groupId `string`

### Return

`Promise<CreateNoteResponse>`

### Types

ts
```ts
export type CreateNoteOptions = {
    title: string;
    pinAct?: boolean;
};

export type CreateNoteResponse = NoteDetail;
```

### Examples

Tạp ghi chú mới

ts
```ts
const groupId = "0000000000000000000";

api.createNote(
    {
        title: "ghi chú mới",
        pinAct: true
    },
    groupId,
)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [NoteDetail](./../models/Board.html)