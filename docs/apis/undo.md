# undo

URL: https://zca-js.tdung.com/vi/apis/undo.html

# undo

## api.undo(message)

### Parameters

*   message `UndoPayload`

### Return

`Promise<UndoResponse>`

### Types

ts
```ts
export type UndoPayload = {
    msgId: string | number;
    cliMsgId: string | number;
};

export type UndoResponse = {
    status: number;
};
```

### Examples

ts
```ts
// Thu hồi tin nhắn của bản thân nếu nó có chứa từ undo
api.listener.on("message", (message) => {
    const { content } = message.data;
    const isTextMessage = typeof content == "string";
    const shouldUndo = isTextMessage && content.includes("undo");
    if (message.isSelf && shouldUndo) {
        api.undo(message).then(console.log).catch(console.error);
    }
});
```