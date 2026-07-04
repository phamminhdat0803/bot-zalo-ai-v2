# blockViewFeed

URL: https://zca-js.tdung.com/vi/apis/blockViewFeed.html

# blockViewFeed

## api.blockViewFeed(userId\[, isBlockFeed\])

### Parameters

*   userId `string`
*   isBlockFeed `boolean?`
    *   mặc định `true`

### Return

`Promise<BlockViewFeedResponse>`

### Types

ts
```ts
export type BlockViewFeedResponse = "";
```

### Examples

ts
```ts
const userId = "0000000000000000001";
api
    .blockViewFeed(userId)
    .then(console.log).catch(console.error);
```