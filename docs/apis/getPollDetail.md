# getPollDetail

URL: https://zca-js.tdung.com/vi/apis/getPollDetail.html

# getPollDetail

## api.getPollDetail(pollId)

### Parameters

*   pollId `string`

### Return

`Promise<PollDetailResponse>`

### Types

ts
```ts
export type PollDetailResponse = PollDetail;
```

### Examples

ts
```ts
api.getPollDetail("poll_id_here")
    .then(console.log)
    .catch(console.error);
```

### Related

*   [PollDetail](./../models/Board.html)