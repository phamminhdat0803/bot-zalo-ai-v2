# sendLink

URL: https://zca-js.tdung.com/vi/apis/sendLink.html

# sendLink

## api.sendLink(options, threadId\[, type\])

### Parameters

*   options `SendLinkOptions`
*   threadId `string`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<SendLinkResponse>`

### Types

ts
```ts
export type SendLinkOptions = {
    msg?: string;
    link: string;
    ttl?: number;
};

export type SendLinkResponse = {
    msgId: string;
};
```

### Examples

ts
```ts
const options = {
    link: "https://example.com",
};

const threadId = "0000000000000000"

api.sendLink(
    options,
    threadId,
    ThreadType.Group
)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)