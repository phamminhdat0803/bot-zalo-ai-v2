# editNote

URL: https://zca-js.tdung.com/vi/apis/editNote.html

# editNote

## api.editNote(options, groupId)

### Parameters

*   options `EditNoteOptions`
*   groupId `string`

### Return

`Promise<EditNoteResponse>`

### Types

ts
```ts
export type EditNoteOptions = {
    /**
     * tiêu đề
     */
    title: string;
    /**
     * id ghi chú
     */
    topicId: string;
    /**
     * ghim ghi chú?
     */
    pinAct?: boolean;
};

export type EditNoteResponse = NoteDetail;
```

### Examples

ts
```ts
const groupId = "0000000000000000000";
const topicId = "";
const newTitle = "Tiêu đề mới"

api
    .editNote(
        {
            topicId: topicId,
            title: newTitle,
            pinAct: true
        },
        groupId
    )
    .then(console.log)
    .catch(console.error);
```

### Related

*   [NoteDetail](./../models/Board.html)