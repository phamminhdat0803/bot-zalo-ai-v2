# getAutoDeleteChat

URL: https://zca-js.tdung.com/vi/apis/getAutoDeleteChat.html

# getAutoDeleteChat

## api.getAutoDeleteChat()

### Parameters

### Return

`Promise<GetAutoDeleteChatResponse>`

### Types

ts
```ts
export type GetAutoDeleteChatResponse = {
    convers: {
        destId: string;
        isGroup: boolean;
        ttl: number;
        createdAt: number;
    }[];
};
```

### Examples

ts
```ts
api.getAutoDeleteChat()
    .then(console.log)
    .catch(console.error);
```