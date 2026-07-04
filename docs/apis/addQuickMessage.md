# addQuickMessage

URL: https://zca-js.tdung.com/vi/apis/addQuickMessage.html

# addQuickMessage

## api.addQuickMessage(addPayload)

### Parameters

*   addPayload `AddQuickMessagePayload`

### Return

`Promise<AddQuickMessageResponse>`

### Types

ts
```ts
export type AddQuickMessagePayload = {
    keyword: string;
    title: string;
    media?: AttachmentSource;
};

export type AddQuickMessageResponse = {
    item: QuickMessage;
    version: number;
};
```

### Examples

ts
```ts
await api.addQuickMessage({
    keyword: "hi",
    title: "Xin chào, mình có thể giúp gì cho bạn?",
    media: "./hello.png"
});
```

### Related

*   [AttachmentSource](./../models/Attachment.html)
*   [QuickMessage](./../models/QuickMessage.html)