# getListBoard

URL: https://zca-js.tdung.com/vi/apis/getListBoard.html

# getListBoard

## api.getListBoard(options, groupId)

### Parameters

*   options `ListBoardOptions`
*   groupId `string`

### Return

`Promise<GetListBoardResponse>`

### Types

ts
```ts
export type ListBoardOptions = {
    /**
     * Mặc định 1
     */
    page?: number;
    /**
     * Mặc định 20
     */
    count?: number;
};

export type BoardItem = {
    boardType: BoardType;
    data: PollDetail | NoteDetail | PinnedMessageDetail;
};

export type GetListBoardResponse = {
    items: BoardItem[];
    count: number;
};
```

### Examples

ts
```ts
const groupId = "0000000000000000";
api.getListBoard({}, groupId)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [NoteDetail, PinnedMessageDetail, PollDetail, BoardItem](./../models/Board.html)