# deleteAutoReply

URL: https://zca-js.tdung.com/vi/apis/deleteAutoReply.html

# deleteAutoReply

## api.deleteAutoReply(id)

### Parameters

*   id `number`

### Return

`Promise<DeleteAutoReplyResponse>`

### Types

ts
```ts
export type DeleteAutoReplyResponse = {
    item: number;
    version: number;
};
```

### Examples

ts
```ts
api
    .deleteAutoReply(1)
    .then(console.log).catch(console.error);
```