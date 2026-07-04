# getHiddenConversations

URL: https://zca-js.tdung.com/vi/apis/getHiddenConversations.html

# getHiddenConversations

## api.getHiddenConversations()

### Parameters

### Return

`Promise<GetHiddenConversPinResponse>`

### Types

ts
```ts
export type GetHiddenConversationsResponse = {
    pin: string;
    threads: {
        /**
         * 1: true, 0: false
         */
        is_group: number;
        thread_id: string;
    }[];
};
```

### Examples

ts
```ts
api.getHiddenConversations()
    .then(console.log)
    .catch(console.error);
```