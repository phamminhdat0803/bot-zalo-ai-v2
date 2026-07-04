# updateQuickMessage

URL: https://zca-js.tdung.com/vi/apis/updateQuickMessage.html

# updateQuickMessage

## api.updateQuickMessage(updatePayload, itemId)

### Parameters

*   updatePayload `UpdateQuickMessagePayload`
*   itemId `number`

### Return

`Promise<UpdateQuickMessageResponse>`

### Types

ts
```ts
export type UpdateQuickMessagePayload = {
    keyword: string;
    title: string;
    media?: AttachmentSource;
};

export type UpdateQuickMessageResponse = {
    item: QuickMessage;
    version: number;
};
```

### Examples

ts
```ts
import { Gender, BusinessCategory } from "zca-js";

const itemId = 1;

api
    .updateQuickMessage(
        {
            keyword: "hi",
            title: "Xin chào",
            media: ["./hello.jpg"]
        },
        itemId
    )
    .then(console.log)
    .catch(console.error);
```

### Related

*   [AttachmentSource](./../models/Attachment.html)
*   [QuickMessage](./../models/QuickMessage.html)